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
const { getOne, getAll, runQuery, withTransaction } = require('../db/database');

// ── Helper: credit/debit tokens ───────────────────────────────
async function addTokens(userId, amount, type, description, refId = null) {
    if (!Number.isSafeInteger(amount)) throw Object.assign(new Error('Неверное количество токенов'), { status: 400 });
    return withTransaction(async transaction => {
        if (['publish_bonus', 'views_milestone'].includes(type)) {
            const prior = await transaction.execute({ sql: 'SELECT id FROM token_transactions WHERE user_id = ? AND type = ? AND ref_id = ? AND amount = ?', args: [userId, type, refId, amount] });
            if (prior.rows.length) return;
        }
        const result = await transaction.execute({ sql: 'UPDATE users SET token_balance = token_balance + ? WHERE id = ? AND token_balance + ? >= 0', args: [amount, userId, amount] });
        if (!result.rowsAffected) throw Object.assign(new Error('Недостаточно токенов'), { status: 400 });
        await transaction.execute({ sql: 'INSERT INTO token_transactions (user_id, amount, type, description, ref_id) VALUES (?, ?, ?, ?, ?)', args: [userId, amount, type, description, refId] });
    });
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
router.post('/buy/:id', authenticateToken, async (req, res, next) => {
    try {
        const buyerId = req.user.userId;
        const lessonId = Number(req.params.id);
        const result = await withTransaction(async transaction => {
            const lesson = (await transaction.execute({ sql: 'SELECT * FROM lessons WHERE id = ? AND for_sale = 1 AND is_published = 1 AND is_archived = 0', args: [lessonId] })).rows[0];
            if (!lesson) throw Object.assign(new Error('Урок недоступен для покупки'), { status: 404 });
            if (lesson.user_id === buyerId) throw Object.assign(new Error('Нельзя купить свой урок'), { status: 400 });
            const existing = (await transaction.execute({ sql: 'SELECT id FROM marketplace_purchases WHERE buyer_id = ? AND lesson_id = ?', args: [buyerId, lessonId] })).rows[0];
            if (existing) throw Object.assign(new Error('Вы уже купили этот урок'), { status: 409 });
            const price = Number(lesson.price_tokens || 0);
            const debit = await transaction.execute({ sql: 'UPDATE users SET token_balance = token_balance - ? WHERE id = ? AND token_balance >= ?', args: [price, buyerId, price] });
            if (!debit.rowsAffected) throw Object.assign(new Error('Недостаточно токенов'), { status: 400 });
            await transaction.execute({ sql: 'UPDATE users SET token_balance = token_balance + ? WHERE id = ?', args: [price, lesson.user_id] });
            await transaction.execute({ sql: 'INSERT INTO marketplace_purchases (buyer_id, seller_id, lesson_id, tokens_paid) VALUES (?, ?, ?, ?)', args: [buyerId, lesson.user_id, lessonId, price] });
            if (price) {
                await transaction.execute({ sql: "INSERT INTO token_transactions (user_id, amount, type, description, ref_id) VALUES (?, ?, 'purchase', ?, ?)", args: [buyerId, -price, lesson.title, lessonId] });
                await transaction.execute({ sql: "INSERT INTO token_transactions (user_id, amount, type, description, ref_id) VALUES (?, ?, 'sale', ?, ?)", args: [lesson.user_id, price, lesson.title, lessonId] });
            }
            const user = (await transaction.execute({ sql: 'SELECT token_balance FROM users WHERE id = ?', args: [buyerId] })).rows[0];
            return { success: true, lesson_id: lessonId, tokens_paid: price, new_balance: user.token_balance };
        });
        res.json(result);
    } catch (error) { next(error); }
});

// ── POST /api/marketplace/earn — ad reward ────────────────────
router.post('/earn', authenticateToken, (req, res) => res.status(400).json({ error: 'Откройте рекламный ролик, чтобы получить награду.' }));

module.exports = router;
module.exports.addTokens = addTokens;
