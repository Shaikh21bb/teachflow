const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getOne, getAll, getLastInsertId } = require('../db/database');
const { syncUserToGoogleSheets, updateLastLogin } = require('../utils/googleSheets');

const JWT_SECRET = process.env.JWT_SECRET || 'urpaq-ai-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Register new user
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { name, email, password, subjects = [] } = req.body;

        // Validation
        if (!name || !email || !password) {
            console.log('Validation failed: missing fields');
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        if (password.length < 8) {
            console.log('Validation failed: short password');
            return res.status(400).json({ error: 'Пароль должен быть минимум 8 символов' });
        }

        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: invalid email format');
            return res.status(400).json({ error: 'Неверный формат email' });
        }

        // Check if user already exists
        console.log('Checking if user exists...');
        let existingUser;
        try {
            existingUser = await getOne('SELECT * FROM users WHERE email = ?', [email]);
        } catch (dbError) {
            console.error('Database error checking user:', dbError);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (existingUser) {
            console.log('User already exists');
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Hash password
        console.log('Hashing password...');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user
        console.log('Inserting user into database...');
        try {
            const subjectsJson = JSON.stringify(Array.isArray(subjects) ? subjects : []);
            await runQuery(
                'INSERT INTO users (name, email, password_hash, role, subjects) VALUES (?, ?, ?, ?, ?)',
                [name, email, passwordHash, 'teacher', subjectsJson]
            );
        } catch (insertError) {
            console.error('Insert error:', insertError);
            return res.status(500).json({ error: 'Ошибка при создании пользователя' });
        }

        // Get the newly created user by email (more reliable than getLastInsertId)
        const user = await getOne('SELECT id, name, email, role, created_at FROM users WHERE email = ?', [email]);

        if (!user) {
            console.error('User not found after insert');
            return res.status(500).json({ error: 'Ошибка при создании пользователя' });
        }

        console.log('User created with ID:', user.id);


        // Sync to Google Sheets (optional)
        try {
            await syncUserToGoogleSheets(user);
        } catch (err) {
            console.log('Google Sheets sync skipped:', err.message);
        }

        console.log('Registration successful for:', email);
        res.status(201).json({
            message: 'Регистрация успешна',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});


// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        // Find user
        const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Аккаунт деактивирован' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Update last login
        await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // Update last login in Google Sheets
        try {
            await updateLastLogin(user.email);
        } catch (err) {
            console.error('Google Sheets update error:', err.message);
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await getOne(
            'SELECT id, name, email, role, subjects, credits, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Parse subjects JSON
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

// Update user subjects
router.put('/subjects', authenticateToken, async (req, res) => {
    try {
        const { subjects } = req.body;
        const subjectsJson = JSON.stringify(Array.isArray(subjects) ? subjects : []);
        await runQuery('UPDATE users SET subjects = ? WHERE id = ?', [subjectsJson, req.user.userId]);
        res.json({ success: true, subjects: subjects });
    } catch (error) {
        console.error('Update subjects error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Logout (client-side will remove token)
router.post('/logout', (req, res) => {
    res.json({ message: 'Выход выполнен успешно' });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный или истекший токен' });
        }
        req.user = user;
        next();
    });
}

router.authenticateToken = authenticateToken;
module.exports = router;
