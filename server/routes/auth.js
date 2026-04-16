const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const { runQuery, getOne } = require('../db/database');
const { syncUserToGoogleSheets, updateLastLogin } = require('../utils/googleSheets');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');

// Initialize Resend safely - if no key is provided, emails will fail gracefully or log to console
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Validate secrets at startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters! Set it in .env');
    if (process.env.NODE_ENV === 'production') process.exit(1);
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️  JWT_REFRESH_SECRET not set or too short — refresh tokens disabled in production');
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function generateAccessToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

async function generateRefreshToken(userId) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

    // Store hashed token in DB (plain token is returned to client)
    await runQuery(
        `INSERT OR REPLACE INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
    );

    return token;
}

function safeUserPayload(user) {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ──────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { name, email, password, subjects } = req.body;

        // Check existing user
        const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Hash password — bcrypt rounds 12 for production-grade security
        const passwordHash = await bcrypt.hash(password, 12);
        const subjectsJson = JSON.stringify(subjects);

        await runQuery(
            'INSERT INTO users (name, email, password_hash, role, subjects) VALUES (?, ?, ?, ?, ?)',
            [name, email, passwordHash, 'teacher', subjectsJson]
        );

        const user = await getOne(
            'SELECT id, name, email, role FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(500).json({ error: 'Ошибка при создании пользователя' });
        }

        // Sync to Google Sheets (optional, non-blocking)
        syncUserToGoogleSheets(user).catch((err) =>
            console.log('Google Sheets sync skipped:', err.message)
        );

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);

        res.status(201).json({
            message: 'Регистрация успешна',
            token: accessToken,
            refreshToken,
            user: safeUserPayload(user),
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);

        // Constant-time: always run bcrypt even if user not found to prevent timing attacks
        const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const passwordValid = user
            ? await bcrypt.compare(password, user.password_hash)
            : await bcrypt.compare(password, dummyHash).then(() => false);

        if (!user || !passwordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Аккаунт деактивирован. Обратитесь в поддержку.' });
        }

        // Update last login (non-blocking)
        runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]).catch(() => {});
        updateLastLogin(user.email).catch((err) =>
            console.log('Google Sheets update skipped:', err.message)
        );

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);

        res.json({
            message: 'Вход выполнен успешно',
            token: accessToken,
            refreshToken,
            user: safeUserPayload(user),
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/refresh
// Exchange refresh token for new access + refresh tokens (rotation)
// ──────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token не предоставлен' });
        }

        // Hash incoming token and look up in DB
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const stored = await getOne(
            `SELECT rt.*, u.id as uid, u.name, u.email, u.role, u.is_active
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = ?`,
            [tokenHash]
        );

        if (!stored) {
            return res.status(401).json({ error: 'Недействительный refresh token' });
        }

        if (new Date(stored.expires_at) < new Date()) {
            // Clean up expired token
            await runQuery('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
            return res.status(401).json({ error: 'Refresh token истёк. Войдите снова.' });
        }

        if (!stored.is_active) {
            return res.status(403).json({ error: 'Аккаунт деактивирован' });
        }

        // Token rotation — delete old, issue new
        await runQuery('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);

        const user = { id: stored.uid, name: stored.name, email: stored.email, role: stored.role };
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = await generateRefreshToken(user.id);

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error('Refresh error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/logout
// Revoke refresh token
// ──────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await runQuery('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
        }
        res.json({ message: 'Выход выполнен успешно' });
    } catch {
        res.json({ message: 'Выход выполнен успешно' });
    }
});

// ──────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getOne(
            'SELECT id, name, email, role, subjects, credits, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        try {
            user.subjects = JSON.parse(user.subjects || '[]');
        } catch {
            user.subjects = [];
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// PUT /api/auth/profile
// ──────────────────────────────────────────
router.put('/profile', authenticateToken, validate(require('../middleware/validate').profileSchema), async (req, res) => {
    try {
        const { name, subjects } = req.body;
        const subjectsJson = JSON.stringify(subjects);
        await runQuery('UPDATE users SET name = ?, subjects = ? WHERE id = ?', [name, subjectsJson, req.user.userId]);
        
        const user = await getOne(
            'SELECT id, name, email, role, subjects, credits, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );
        user.subjects = JSON.parse(user.subjects || '[]');

        res.json({ success: true, user });
    } catch (error) {
        console.error('Update profile error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// GET /api/auth/teacher-profile
// ──────────────────────────────────────────
router.get('/teacher-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user base info
        const user = await getOne(
            'SELECT id, name, email, role, subjects, avatar_url FROM users WHERE id = ?',
            [userId]
        );
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        try { user.subjects = JSON.parse(user.subjects || '[]'); } catch { user.subjects = []; }

        // Get or create teacher_profiles row
        let profile = await getOne(
            'SELECT * FROM teacher_profiles WHERE teacher_id = ?',
            [userId]
        );

        if (!profile) {
            await runQuery(
                `INSERT OR IGNORE INTO teacher_profiles (teacher_id, bio, subject_expertise, school, city, social_links)
                 VALUES (?, '', '[]', '', '', '{}')`,
                [userId]
            );
            profile = await getOne('SELECT * FROM teacher_profiles WHERE teacher_id = ?', [userId]);
        }

        // Parse JSON fields
        try { profile.subject_expertise = JSON.parse(profile.subject_expertise || '[]'); } catch { profile.subject_expertise = []; }
        try { profile.social_links = JSON.parse(profile.social_links || '{}'); } catch { profile.social_links = {}; }

        // Connections count
        const followingCount = await getOne(
            'SELECT COUNT(*) as count FROM user_connections WHERE follower_id = ?', [userId]
        );
        const followersCount = await getOne(
            'SELECT COUNT(*) as count FROM user_connections WHERE following_id = ?', [userId]
        );

        res.json({
            user,
            profile: {
                ...profile,
                instagram_url: profile.social_links?.instagram_url || '',
                youtube_url: profile.social_links?.youtube_url || '',
                telegram_url: profile.social_links?.telegram_url || '',
                website_url: profile.social_links?.website_url || '',
                avatar_url: user.avatar_url || null,
            },
            stats: {
                following: followingCount?.count || 0,
                followers: followersCount?.count || 0,
            }
        });
    } catch (error) {
        console.error('Get teacher profile error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// PUT /api/auth/teacher-profile
// ──────────────────────────────────────────
router.put('/teacher-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            name, bio, school, city,
            instagram_url, youtube_url, telegram_url, website_url,
            avatar_url, subjects
        } = req.body;

        // Update users table
        const subjectsJson = JSON.stringify(Array.isArray(subjects) ? subjects : []);
        await runQuery(
            'UPDATE users SET name = ?, subjects = ?, avatar_url = ? WHERE id = ?',
            [name || '', subjectsJson, avatar_url || null, userId]
        );

        // Upsert teacher_profiles
        const socialLinksStr = JSON.stringify({
            instagram_url: instagram_url || '',
            youtube_url: youtube_url || '',
            telegram_url: telegram_url || '',
            website_url: website_url || ''
        });

        await runQuery(
            `INSERT INTO teacher_profiles (teacher_id, bio, school, city, social_links, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(teacher_id) DO UPDATE SET
                bio = excluded.bio,
                school = excluded.school,
                city = excluded.city,
                social_links = excluded.social_links,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, bio || '', school || '', city || '', socialLinksStr]
        );

        res.json({ success: true, message: 'Профиль жаңартылды' });
    } catch (error) {
        console.error('Update teacher profile error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// GET /api/auth/colleagues
// List all teachers (excluding self), with connection status
// ──────────────────────────────────────────
const { getAll } = require('../db/database');

router.get('/colleagues', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const search = (req.query.search || '').trim();

        let query = `
            SELECT 
                u.id, u.name, u.email, u.subjects,
                COALESCE(tp.avatar_url, u.avatar_url) as avatar_url,
                tp.bio, tp.school, tp.city,
                CASE WHEN uc.follower_id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM users u
            LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
            LEFT JOIN user_connections uc ON uc.follower_id = ? AND uc.following_id = u.id
            WHERE u.id != ? AND u.is_active = 1
        `;
        const params = [userId, userId];

        if (search) {
            query += ` AND (u.name LIKE ? OR u.email LIKE ? OR tp.school LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY is_following DESC, u.name ASC LIMIT 100`;

        const colleagues = await getAll(query, params);

        const result = colleagues.map(c => {
            let subjects = [];
            try { subjects = JSON.parse(c.subjects || '[]'); } catch {}
            return { ...c, subjects, is_following: c.is_following === 1 };
        });

        res.json({ colleagues: result });
    } catch (error) {
        console.error('Get colleagues error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/colleagues/toggle
// Toggle follow / unfollow a colleague
// ──────────────────────────────────────────
router.post('/colleagues/toggle', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetId } = req.body;

        if (!targetId || targetId === userId) {
            return res.status(400).json({ error: 'Жарамсыз сұраныс' });
        }

        const existing = await getOne(
            'SELECT 1 FROM user_connections WHERE follower_id = ? AND following_id = ?',
            [userId, targetId]
        );

        if (existing) {
            await runQuery(
                'DELETE FROM user_connections WHERE follower_id = ? AND following_id = ?',
                [userId, targetId]
            );
            res.json({ success: true, action: 'unfollowed' });
        } else {
            await runQuery(
                'INSERT OR IGNORE INTO user_connections (follower_id, following_id) VALUES (?, ?)',
                [userId, targetId]
            );
            res.json({ success: true, action: 'followed' });
        }
    } catch (error) {
        console.error('Toggle colleague error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.put('/password', authenticateToken, validate(require('../middleware/validate').passwordChangeSchema), async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await getOne('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
        
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Текущий пароль неверен' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.userId]);
        
        // Revoke all refresh tokens on password change for security
        await runQuery('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.userId]);

        res.json({ success: true, message: 'Пароль успешно изменен. Пожалуйста, войдите снова.' });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/forgot-password
// ──────────────────────────────────────────
router.post('/forgot-password', validate(require('../middleware/validate').forgotPasswordSchema), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await getOne('SELECT id, is_active FROM users WHERE email = ?', [email]);
        
        // Always return success to prevent email enumeration
        if (!user || !user.is_active) {
            return res.json({ success: true, message: 'Если email существует, мы отправили инструкцию' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

        await runQuery(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.id, tokenHash, expiresAt]
        );

        // Send robust email using Resend
        const resetLink = `${process.env.FRONTEND_URL || 'https://urpaq.ai'}/reset-password?token=${rawToken}`;
        
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Urpaq Security <onboarding@resend.dev>', // change this when verified domain
                to: email,
                subject: 'Восстановление пароля в Urpaq.ai',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #4f46e5;">Urpaq.ai</h2>
                        <p>Здравствуйте!</p>
                        <p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
                            Сбросить пароль
                        </a>
                        <p style="color: #6b7280; font-size: 14px;">Ссылка действительна в течение 15 минут.<br>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <p style="color: #9ca3af; font-size: 12px;">© 2026 Urpaq.ai Team. All rights reserved.</p>
                    </div>
                `
            });
            console.log('\n✉️ Password reset email sent via Resend to:', email);
        } else {
            console.log('\n🔒 [MOCK EMAIL] Password Reset requested for:', email);
            console.log('🔗 URL:', resetLink, '\n');
            console.log('⚠️ (Configure RESEND_API_KEY inside Render/vercel environment to send real emails)');
        }

        res.json({ success: true, message: 'Инструкция отправлена на ваш email' });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// POST /api/auth/reset-password
// ──────────────────────────────────────────
router.post('/reset-password', validate(require('../middleware/validate').resetPasswordSchema), async (req, res) => {
    try {
        const { token, password } = req.body;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const stored = await getOne(
            `SELECT * FROM password_reset_tokens WHERE token_hash = ? AND expires_at > datetime('now')`,
            [tokenHash]
        );

        if (!stored) {
            return res.status(400).json({ error: 'Токен недействителен или истек. Запросите сброс заново.' });
        }

        const newHash = await bcrypt.hash(password, 12);
        
        // Update password and clean up all sessions/tokens
        await runQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, stored.user_id]);
        await runQuery('DELETE FROM password_reset_tokens WHERE user_id = ?', [stored.user_id]);
        await runQuery('DELETE FROM refresh_tokens WHERE user_id = ?', [stored.user_id]);

        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ──────────────────────────────────────────
// Middleware: Authenticate JWT
// ──────────────────────────────────────────
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Токен истёк',
                    code: 'TOKEN_EXPIRED',
                });
            }
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
}

router.authenticateToken = authenticateToken;
module.exports = router;
