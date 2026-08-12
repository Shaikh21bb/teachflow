/**
 * Marketplace routes — token economy for buying/selling lessons
 *
 * GET  /api/marketplace          — browse lessons for sale
 * GET  /api/marketplace/my       — my purchased lessons
 * GET  /api/marketplace/balance  — my token balance
 * POST /api/marketplace/buy/:id  — buy a lesson with tokens
 * POST /api/marketplace/sell/:id — put my lesson on sale
 * POST /api/marketplace/unsell/:id — remove from sale
 * GET  /api/marketplace/tokens   — my transaction history
 * POST /api/marketplace/earn     — earn tokens (ad watched)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');

// ── Helper: credit/debit tokens ───────────────────────────────
async function addTokens(userId, amount, type, description, refId = null) {
    await runQuery(
        `INSERT INTO token_transactions (user_id, amount, type, description, ref_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, amount, type, description, refId]
    );
    await runQuery(
        'UPDATE users SET token_balance = token_balance + ? WHERE id = ?',
        [amount, userId]
    );
}

// ── GET /api/marketplace — browse ────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const { search, subject, grade, sort = 'newest', page = 1 } = req.query;
        const limit = 24;
        const offset = (parseInt(page) - 1) * limit;

        let sql = `
            SELECT
                l.id, l.title, l.subject, l.grade, l.duration, l.description,
                l.thumbnail_url, l.views_count, l.likes, l.price_tokens, l.created_at,
                u.id as seller_id, u.name as seller_name,
                COALESCE(tp.avatar_url, u.avatar_url) as seller_avatar,
                CASE WHEN mp.buyer_id IS NOT NULL THEN 1 ELSE 0 END as already_bought,
                CASE WHEN l.user_id = ? THEN 1 ELSE 0 END as is_own
            FROM lessons l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
            LEFT JOIN marketplace_purchases mp ON mp.lesson_id = l.id AND mp.buyer_id = ?
            WHERE l.for_sale = 1 AND l.is_published = 1 AND l.is_archived = 0`;

        const params = [myId, myId];

        if (search) {
            sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR u.name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (subject) { sql += ` AND l.subject = ?`; params.push(subject); }
        if (grade)   { sql += ` AND l.grade = ?`;   params.push(grade); }

        if (sort === 'popular')  sql += ` ORDER BY l.views_count DESC`;
        else if (sort === 'price_asc')  sql += ` ORDER BY l.price_tokens ASC`;
        else if (sort === 'price_desc') sql += ` ORDER BY l.price_tokens DESC`;
        else if (sort === 'free')       sql += ` AND l.price_tokens = 0 ORDER BY l.created_at DESC`;
        else sql += ` ORDER BY l.created_at DESC`;

        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const lessons = await getAll(sql, params);

        // Count
        let countSql = `SELECT COUNT(*) as total FROM lessons l JOIN users u ON l.user_id = u.id WHERE l.for_sale = 1 AND l.is_published = 1 AND l.is_archived = 0`;
        const countParams = [];
        if (search) { countSql += ` AND (l.title LIKE ? OR l.description LIKE ? OR u.name LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (subject) { countSql += ` AND l.subject = ?`; countParams.push(subject); }
        if (grade)   { countSql += ` AND l.grade = ?`;   countParams.push(grade); }
        const total = (await getOne(countSql, countParams))?.total || 0;

        res.json({
            lessons: lessons.map(l => ({
                ...l,
                already_bought: l.already_bought === 1,
                is_own: l.is_own === 1
            })),
            total, page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Marketplace browse error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/marketplace/balance ─────────────────────────────
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const row = await getOne('SELECT token_balance FROM users WHERE id = ?', [req.user.userId]);
        res.json({ balance: row?.token_balance || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/marketplace/my — purchased lessons ───────────────
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const lessons = await getAll(`
            SELECT l.id, l.title, l.subject, l.grade, l.duration, l.thumbnail_url,
                   l.views_count, mp.tokens_paid, mp.created_at as purchased_at,
                   u.name as seller_name,
                   COALESCE(tp.avatar_url, u.avatar_url) as seller_avatar
            FROM marketplace_purchases mp
            JOIN lessons l ON l.id = mp.lesson_id
            JOIN users u ON u.id = mp.seller_id
            LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
            WHERE mp.buyer_id = ? AND l.is_archived = 0
            ORDER BY mp.created_at DESC`, [myId]
        );
        res.json({ lessons });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/marketplace/tokens — history ────────────────────
router.get('/tokens', authenticateToken, async (req, res) => {
    try {
        const rows = await getAll(
            `SELECT id, amount, type, description, created_at
             FROM token_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
            [req.user.userId]
        );
        const balance = (await getOne('SELECT token_balance FROM users WHERE id = ?', [req.user.userId]))?.token_balance || 0;
        res.json({ transactions: rows, balance });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/marketplace/sell/:id — put on sale ─────────────
router.post('/sell/:id', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const userId = req.user.userId;
        const { price_tokens = 0 } = req.body;

        const lesson = await getOne('SELECT id, user_id, is_published FROM lessons WHERE id = ? AND user_id = ?', [lessonId, userId]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        if (!lesson.is_published) return res.status(400).json({ error: 'Сначала опубликуйте урок' });

        const price = Math.max(0, Math.min(99999, parseInt(price_tokens) || 0));
        await runQuery('UPDATE lessons SET for_sale = 1, price_tokens = ? WHERE id = ?', [price, lessonId]);

        // Award tokens for listing
        if (price === 0) {
            await addTokens(userId, 20, 'publish_bonus', `Публикация бесплатного урока #${lessonId}`, lessonId);
        }

        res.json({ success: true, price_tokens: price });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/marketplace/unsell/:id ─────────────────────────
router.post('/unsell/:id', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        await runQuery(
            'UPDATE lessons SET for_sale = 0 WHERE id = ? AND user_id = ?',
            [lessonId, req.user.userId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/marketplace/buy/:id ────────────────────────────
router.post('/buy/:id', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const buyerId = req.user.userId;

        const lesson = await getOne(
            'SELECT id, user_id, title, price_tokens, for_sale, is_published FROM lessons WHERE id = ?',
            [lessonId]
        );
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        if (!lesson.for_sale || !lesson.is_published) return res.status(400).json({ error: 'Урок недоступен для покупки' });
        if (lesson.user_id === buyerId) return res.status(400).json({ error: 'Нельзя купить свой урок' });

        // Check already bought
        const existing = await getOne('SELECT id FROM marketplace_purchases WHERE buyer_id = ? AND lesson_id = ?', [buyerId, lessonId]);
        if (existing) return res.status(400).json({ error: 'Вы уже купили этот урок' });

        const price = lesson.price_tokens || 0;

        if (price > 0) {
            // Check buyer balance
            const buyer = await getOne('SELECT token_balance FROM users WHERE id = ?', [buyerId]);
            if ((buyer?.token_balance || 0) < price) {
                return res.status(400).json({ error: 'Недостаточно токенов', code: 'NOT_ENOUGH_TOKENS', balance: buyer?.token_balance || 0, required: price });
            }
            // Deduct from buyer
            await addTokens(buyerId, -price, 'purchase', `Покупка урока "${lesson.title}"`, lessonId);
            // Credit seller
            await addTokens(lesson.user_id, price, 'sale', `Продажа урока "${lesson.title}"`, lessonId);
        }

        // Record purchase
        await runQuery(
            `INSERT INTO marketplace_purchases (buyer_id, seller_id, lesson_id, tokens_paid) VALUES (?, ?, ?, ?)`,
            [buyerId, lesson.user_id, lessonId, price]
        );

        // Increment views for seller stat
        await runQuery('UPDATE lessons SET views_count = views_count + 1 WHERE id = ?', [lessonId]);

        // New balance
        const updated = await getOne('SELECT token_balance FROM users WHERE id = ?', [buyerId]);

        res.json({
            success: true,
            lesson_id: lessonId,
            tokens_paid: price,
            new_balance: updated?.token_balance || 0
        });
    } catch (err) {
        console.error('Buy lesson error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/marketplace/earn — ad reward ────────────────────
router.post('/earn', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Count today's ad views
        const todayCount = (await getOne(
            `SELECT COUNT(*) as cnt FROM token_transactions
             WHERE user_id = ? AND type = 'ad_reward' AND date(created_at) = ?`,
            [userId, today]
        ))?.cnt || 0;

        const DAILY_LIMIT = 10;
        const TOKENS_PER_AD = 5;

        if (todayCount >= DAILY_LIMIT) {
            return res.status(400).json({
                error: 'Дневной лимит достигнут',
                code: 'DAILY_LIMIT',
                limit: DAILY_LIMIT,
                earned_today: todayCount * TOKENS_PER_AD
            });
        }

        await addTokens(userId, TOKENS_PER_AD, 'ad_reward', `Просмотр рекламы (${todayCount + 1}/${DAILY_LIMIT})`, null);

        const updated = await getOne('SELECT token_balance FROM users WHERE id = ?', [userId]);
        res.json({
            success: true,
            earned: TOKENS_PER_AD,
            balance: updated?.token_balance || 0,
            ads_today: todayCount + 1,
            remaining_today: DAILY_LIMIT - todayCount - 1
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.addTokens = addTokens;
