/**
 * Admin Panel API routes
 * All routes require role_admin = 1
 *
 * GET  /api/admin/stats               — platform overview stats
 * GET  /api/admin/users               — all users (paginated, search)
 * GET  /api/admin/users/:id           — single user detail
 * PATCH /api/admin/users/:id/tokens   — adjust user token balance
 * PATCH /api/admin/users/:id/plan     — change user plan
 * PATCH /api/admin/users/:id/block    — block/unblock user
 * GET  /api/admin/ads                 — all ads
 * POST /api/admin/ads                 — create ad
 * PUT  /api/admin/ads/:id             — update ad
 * DELETE /api/admin/ads/:id           — delete ad
 * PATCH /api/admin/ads/:id/toggle     — activate/deactivate
 *
 * Public ad endpoints (no admin required):
 * GET  /api/admin/ads/current         — random active ad for display
 * POST /api/admin/ads/:id/view        — record view + award tokens (auth required)
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');
const { addTokens } = require('./marketplace');

// ══════════════════════════════════════════════════════════════
// PUBLIC AD ENDPOINTS (no admin required)
// ══════════════════════════════════════════════════════════════

// GET /api/admin/ads/current — get a random active ad
router.get('/ads/current', async (req, res) => {
    try {
        const ads = await getAll(
            'SELECT id, title, type, url, thumbnail_url, duration, tokens_reward, link_url FROM ads WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1'
        );
        if (!ads.length) return res.json({ ad: null });
        res.json({ ad: ads[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/ads/:id/view — user watched ad, reward tokens
router.post('/ads/:id/view', authenticateToken, async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        const ad = await getOne('SELECT * FROM ads WHERE id = ? AND is_active = 1', [adId]);
        if (!ad) return res.status(404).json({ error: 'Реклама не найдена' });

        // Check daily limit (10 ad views = 50 tokens max per day)
        const todayViews = await getOne(
            `SELECT COUNT(*) as cnt FROM ad_views
             WHERE user_id = ? AND date(viewed_at) = ?`,
            [userId, today]
        );
        const DAILY_AD_LIMIT = 10;
        if ((todayViews?.cnt || 0) >= DAILY_AD_LIMIT) {
            return res.status(400).json({
                error: 'Дневной лимит просмотров достигнут',
                code: 'DAILY_LIMIT',
                limit: DAILY_AD_LIMIT,
                viewed_today: todayViews?.cnt || 0
            });
        }

        const tokens = ad.tokens_reward || 5;

        // Record view
        await runQuery(
            'INSERT INTO ad_views (user_id, ad_id, tokens_earned) VALUES (?, ?, ?)',
            [userId, adId, tokens]
        );

        // Increment ad view count
        await runQuery('UPDATE ads SET views_count = views_count + 1 WHERE id = ?', [adId]);

        // Award tokens
        await addTokens(userId, tokens, 'ad_reward', `Просмотр рекламы "${ad.title}"`, adId);

        const updated = await getOne('SELECT token_balance FROM users WHERE id = ?', [userId]);
        const remaining = DAILY_AD_LIMIT - (todayViews?.cnt || 0) - 1;

        res.json({
            success: true,
            earned: tokens,
            balance: updated?.token_balance || 0,
            viewed_today: (todayViews?.cnt || 0) + 1,
            remaining_today: Math.max(0, remaining)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ADMIN ONLY ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [users, lessons, tokens, adViews, revenue] = await Promise.all([
            getOne('SELECT COUNT(*) as total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active FROM users'),
            getOne('SELECT COUNT(*) as total, SUM(CASE WHEN is_published=1 THEN 1 ELSE 0 END) as published FROM lessons'),
            getOne('SELECT SUM(token_balance) as total_tokens, AVG(token_balance) as avg_tokens FROM users WHERE is_active=1'),
            getOne('SELECT COUNT(*) as total, SUM(tokens_earned) as total_earned FROM ad_views'),
            getOne('SELECT SUM(amount) as total FROM transactions WHERE status = ?', ['completed'])
        ]);

        // Users by plan
        const plans = await getAll('SELECT plan, COUNT(*) as count FROM users GROUP BY plan');
        const planMap = {};
        plans.forEach(p => { planMap[p.plan || 'free'] = p.count; });

        // New users this week
        const newUsers = await getOne(
            "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')"
        );

        // Top earners (tokens)
        const topTokens = await getAll(
            'SELECT id, name, email, token_balance, plan FROM users ORDER BY token_balance DESC LIMIT 5'
        );

        // Recent transactions
        const recentTx = await getAll(
            'SELECT t.id, u.name, t.amount, t.type, t.created_at FROM token_transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 10'
        );

        res.json({
            users: { total: users?.total || 0, active: users?.active || 0, new_this_week: newUsers?.count || 0, by_plan: planMap },
            lessons: { total: lessons?.total || 0, published: lessons?.published || 0 },
            tokens: { total_in_circulation: tokens?.total_tokens || 0, avg_per_user: Math.round(tokens?.avg_tokens || 0) },
            ads: { total_views: adViews?.total || 0, tokens_distributed: adViews?.total_earned || 0 },
            revenue: { total_kzt: revenue?.total || 0 },
            top_tokens: topTokens,
            recent_transactions: recentTx
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { search = '', plan = '', page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let sql = `SELECT id, name, email, plan, credits, token_balance, role, role_admin, is_active, created_at, last_login FROM users WHERE 1=1`;
        const params = [];

        if (search) {
            sql += ` AND (name LIKE ? OR email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (plan) { sql += ` AND plan = ?`; params.push(plan); }

        const countSql = sql.replace('SELECT id, name, email, plan, credits, token_balance, role, role_admin, is_active, created_at, last_login', 'SELECT COUNT(*) as total');
        const total = (await getOne(countSql, params))?.total || 0;

        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const users = await getAll(sql, params);
        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users/:id
router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await getOne(
            'SELECT id, name, email, plan, credits, token_balance, role, role_admin, is_active, created_at, last_login FROM users WHERE id = ?',
            [userId]
        );
        if (!user) return res.status(404).json({ error: 'Не найден' });

        const tokenTx = await getAll(
            'SELECT amount, type, description, created_at FROM token_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [userId]
        );
        const lessons = await getOne('SELECT COUNT(*) as cnt FROM lessons WHERE user_id = ?', [userId]);
        const adViews = await getOne('SELECT COUNT(*) as cnt, SUM(tokens_earned) as earned FROM ad_views WHERE user_id = ?', [userId]);

        res.json({ user, token_transactions: tokenTx, lesson_count: lessons?.cnt || 0, ad_stats: adViews });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/users/:id/tokens — adjust tokens
router.patch('/users/:id/tokens', requireAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const userId = parseInt(req.params.id);
        if (!amount || isNaN(amount)) return res.status(400).json({ error: 'amount обязателен' });

        const user = await getOne('SELECT id, name FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Не найден' });

        await addTokens(userId, parseInt(amount), 'admin_adjustment',
            reason || `Корректировка администратором (${amount > 0 ? '+' : ''}${amount})`, null);

        const updated = await getOne('SELECT token_balance FROM users WHERE id = ?', [userId]);
        res.json({ success: true, new_balance: updated?.token_balance || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/users/:id/plan — change plan
router.patch('/users/:id/plan', requireAdmin, async (req, res) => {
    try {
        const { plan } = req.body;
        const validPlans = ['free', 'pro', 'premium', 'school'];
        if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Неверный план' });

        await runQuery('UPDATE users SET plan = ? WHERE id = ?', [plan, parseInt(req.params.id)]);
        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/users/:id/block — block/unblock
router.patch('/users/:id/block', requireAdmin, async (req, res) => {
    try {
        const { block } = req.body;
        const userId = parseInt(req.params.id);
        // Prevent blocking admins
        const user = await getOne('SELECT role_admin FROM users WHERE id = ?', [userId]);
        if (user?.role_admin) return res.status(403).json({ error: 'Нельзя заблокировать администратора' });

        await runQuery('UPDATE users SET is_active = ? WHERE id = ?', [block ? 0 : 1, userId]);
        res.json({ success: true, blocked: !!block });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── AD CRUD ───────────────────────────────────────────────────

// GET /api/admin/ads — all ads
router.get('/ads', requireAdmin, async (req, res) => {
    try {
        const ads = await getAll(
            `SELECT a.*, u.name as creator_name FROM ads a
             LEFT JOIN users u ON u.id = a.created_by
             ORDER BY a.created_at DESC`
        );
        res.json({ ads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/ads — create
router.post('/ads', requireAdmin, async (req, res) => {
    try {
        const { title, type, url, thumbnail_url, duration, tokens_reward, link_url } = req.body;
        if (!title || !url || !type) return res.status(400).json({ error: 'title, type, url обязательны' });

        const validTypes = ['video', 'youtube', 'banner', 'link'];
        if (!validTypes.includes(type)) return res.status(400).json({ error: 'type: video|youtube|banner|link' });

        await runQuery(
            `INSERT INTO ads (title, type, url, thumbnail_url, duration, tokens_reward, link_url, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [title, type, url, thumbnail_url || null, parseInt(duration) || 15, parseInt(tokens_reward) || 5, link_url || null, req.admin.id]
        );

        const all = await getAll('SELECT * FROM ads ORDER BY created_at DESC');
        res.status(201).json({ ads: all });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/admin/ads/:id — update
router.put('/ads/:id', requireAdmin, async (req, res) => {
    try {
        const { title, type, url, thumbnail_url, duration, tokens_reward, link_url } = req.body;
        await runQuery(
            `UPDATE ads SET title=?, type=?, url=?, thumbnail_url=?, duration=?, tokens_reward=?, link_url=? WHERE id=?`,
            [title, type, url, thumbnail_url || null, parseInt(duration) || 15, parseInt(tokens_reward) || 5, link_url || null, parseInt(req.params.id)]
        );
        const all = await getAll('SELECT * FROM ads ORDER BY created_at DESC');
        res.json({ ads: all });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/ads/:id
router.delete('/ads/:id', requireAdmin, async (req, res) => {
    try {
        await runQuery('DELETE FROM ads WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/ads/:id/toggle — activate/deactivate
router.patch('/ads/:id/toggle', requireAdmin, async (req, res) => {
    try {
        const ad = await getOne('SELECT is_active FROM ads WHERE id = ?', [parseInt(req.params.id)]);
        if (!ad) return res.status(404).json({ error: 'Не найдена' });
        const newState = ad.is_active ? 0 : 1;
        await runQuery('UPDATE ads SET is_active = ? WHERE id = ?', [newState, parseInt(req.params.id)]);
        res.json({ success: true, is_active: newState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
