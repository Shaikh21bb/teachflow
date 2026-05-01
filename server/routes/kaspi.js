const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, runQuery, getLastInsertId } = require('../db/database');
const crypto = require('crypto');

const PLAN_PRICES = {
    pro: {
        price: 4990, // KZT
        credits: 100
    },
    school: {
        price: 29900,
        credits: 500
    }
};

/**
 * POST /api/kaspi/create-order
 * Initialize a payment order
 */
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.user.userId;

        if (!PLAN_PRICES[planId]) {
            return res.status(400).json({ error: 'Неверный тарифный план' });
        }

        const amount = PLAN_PRICES[planId].price;
        const orderId = `ORDER-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now()}`;

        // Save pending transaction
        await runQuery(`
            INSERT INTO transactions (user_id, amount, external_id, status, metadata)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, amount, orderId, 'pending', JSON.stringify({ planId })]);

        const transactionId = await getLastInsertId();

        // In a real Kaspi integration, we would call the Kaspi API here
        // and return the paymentUrl or QR code data.
        // For now, we return a mock success URL or signal to the frontend to show a QR.
        
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (!isProduction || !process.env.KASPI_API_KEY) {
            // Development Mock Mode
            return res.json({
                success: true,
                orderId,
                transactionId,
                paymentUrl: `https://urpaq.ai/mock-payment?orderId=${orderId}&amount=${amount}`,
                message: 'Тестовый режим: заказ создан'
            });
        }

        // Real Kaspi API call (Example structure)
        /*
        const response = await axios.post('https://pay.kaspi.kz/api/v1/orders', {
            amount,
            orderId,
            service: 'Urpaq.ai Subscription',
            // ... other Kaspi params
        }, {
            headers: { 'X-API-Key': process.env.KASPI_API_KEY }
        });
        return res.json(response.data);
        */
        
        res.status(501).json({ error: 'Kaspi Pay API не сконфигурирован в рабочей среде' });

    } catch (err) {
        console.error('Kaspi Create Order Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/kaspi/webhook
 * Handle payment confirmation from Kaspi
 */
router.post('/webhook', async (req, res) => {
    try {
        // 1. Verify Kaspi Signature (Important in production!)
        /*
        const signature = req.headers['x-kaspi-signature'];
        if (!verifySignature(req.body, signature)) {
            return res.status(401).send('Invalid signature');
        }
        */

        const { orderId, status } = req.body; // Status from Kaspi context

        if (status !== 'paid') {
            return res.json({ success: true, message: 'Status ignored' });
        }

        const transaction = await getOne('SELECT * FROM transactions WHERE external_id = ?', [orderId]);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Транзакция не найдена' });
        }

        if (transaction.status === 'completed') {
            return res.json({ success: true, message: 'Already processed' });
        }

        const metadata = JSON.parse(transaction.metadata || '{}');
        const planId = metadata.planId || 'pro';
        const newCredits = PLAN_PRICES[planId]?.credits || 0;

        // Start transaction for DB update
        await runQuery('BEGIN TRANSACTION');

        // Update transaction status
        await runQuery('UPDATE transactions SET status = ?, updated_at = datetime("now") WHERE id = ?', ['completed', transaction.id]);

        // Upgrade user plan and credits
        await runQuery(`
            UPDATE users 
            SET plan = ?, 
                credits = credits + ?,
                billing_period_start = datetime("now"),
                billing_period_end = datetime("now", "+30 days")
            WHERE id = ?
        `, [planId, newCredits, transaction.user_id]);

        await runQuery('COMMIT');

        res.json({ success: true, message: 'Успешно оплачено и обновлено' });

    } catch (err) {
        await runQuery('ROLLBACK');
        console.error('Kaspi Webhook Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
