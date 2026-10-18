const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { getOne, runQuery, withTransaction } = require('../db/database');
const router = express.Router();
const PLAN_PRICES = { pro: { price: 4990, credits: 100 }, school: { price: 29900, credits: 500 } };

function requireTestPayments(req, res, next) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_TEST_PAYMENTS !== 'true') {
        return res.status(503).json({ error: 'Онлайн-оплата пока не подключена. Обратитесь в поддержку для подключения тарифа.', code: 'PAYMENTS_UNAVAILABLE' });
    }
    next();
}

router.post('/create-order', authenticateToken, requireTestPayments, async (req, res, next) => {
    try {
        const { planId } = req.body;
        if (!Object.hasOwn(PLAN_PRICES, planId)) return res.status(400).json({ error: 'Неверный тариф' });
        const amount = PLAN_PRICES[planId].price;
        const orderId = 'TEST-' + crypto.randomUUID();
        const result = await runQuery('INSERT INTO transactions (user_id, amount, external_id, status, metadata) VALUES (?, ?, ?, ?, ?)',
            [req.user.userId, amount, orderId, 'pending', JSON.stringify({ planId })]);
        const base = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.json({ success: true, orderId, transactionId: Number(result.lastInsertRowid), paymentUrl: `${base}/mock-payment?orderId=${orderId}&amount=${amount}` });
    } catch (error) { next(error); }
});

router.post('/webhook', authenticateToken, requireTestPayments, async (req, res, next) => {
    try {
        const { orderId, status } = req.body;
        if (status !== 'paid') return res.status(400).json({ error: 'Неверный статус' });
        await withTransaction(async transaction => {
            const order = (await transaction.execute({ sql: 'SELECT * FROM transactions WHERE external_id = ? AND user_id = ?', args: [orderId, req.user.userId] })).rows[0];
            if (!order) throw Object.assign(new Error('Заказ не найден'), { status: 404 });
            if (order.status === 'completed') return;
            const { planId } = JSON.parse(order.metadata);
            await transaction.execute({ sql: "UPDATE transactions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [order.id] });
            await transaction.execute({ sql: `UPDATE users SET plan = ?, credits = credits + ?, billing_period_start = CURRENT_TIMESTAMP,
                billing_period_end = datetime('now', '+30 days') WHERE id = ?`, args: [planId, PLAN_PRICES[planId].credits, order.user_id] });
        });
        res.json({ success: true });
    } catch (error) { next(error); }
});
module.exports = router;
