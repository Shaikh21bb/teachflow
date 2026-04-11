const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery } = require('../db/database');
const { decrypt } = require('../utils/encryption');
const { sendMessage, sendLessonCard } = require('../utils/telegram');

// ──────────────────────────────────────────
// POST Telegram webhook (per-user URL)
// Format: /api/webhooks/telegram/:userId
// ──────────────────────────────────────────
router.post('/telegram/:userId', async (req, res) => {
    // Always respond 200 immediately so Telegram doesn't retry
    res.sendStatus(200);

    try {
        const userId = parseInt(req.params.userId);
        const update = req.body;

        // Log the webhook event
        await runQuery(
            'INSERT INTO webhooks (user_id, source, event_type, payload) VALUES (?, ?, ?, ?)',
            [userId, 'telegram', 'message', JSON.stringify(update)]
        );

        const message = update.message || update.callback_query?.message;
        if (!message || !message.text) return;

        const chatId = message.chat.id;
        const text = message.text.trim();

        // Get user's Telegram integration (for the bot token)
        const integration = await getOne(
            'SELECT encrypted_token FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
            [userId, 'telegram']
        );
        if (!integration) return;

        const botToken = decrypt(integration.encrypted_token);
        if (!botToken) return;

        // Save chat_id if not already stored
        await runQuery(
            'UPDATE integrations SET chat_id = ? WHERE user_id = ? AND type = ?',
            [String(chatId), userId, 'telegram']
        );

        // Handle commands
        if (text === '/start' || text === '/help') {
            await sendMessage(botToken, chatId,
                `👋 *Привет! Я ваш помощник Urpaq.ai*\n\nДоступные команды:\n\n🗂 /mylessons — список ваших уроков\n📊 /stats — статистика\n➕ /newlesson — создать урок\n❓ /help — помощь`
            );

        } else if (text === '/mylessons') {
            const lessons = await getAll(
                'SELECT * FROM lessons WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC LIMIT 5',
                [userId]
            );
            if (!lessons.length) {
                await sendMessage(botToken, chatId, '📭 У вас пока нет уроков. Создайте первый на urpaq.ai!');
            } else {
                await sendMessage(botToken, chatId, `📚 *Ваши последние ${lessons.length} урок(а):*`);
                for (const lesson of lessons) {
                    await sendLessonCard(botToken, chatId, lesson);
                }
            }

        } else if (text === '/stats') {
            const stats = await getOne(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views_count), 0) as views,
                    COALESCE(SUM(downloads_count), 0) as downloads,
                    SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published
                FROM lessons WHERE user_id = ?
            `, [userId]);

            await sendMessage(botToken, chatId,
                `📊 *Ваша статистика Urpaq.ai*\n\n` +
                `📚 Уроков всего: *${stats.total}*\n` +
                `✅ Опубликовано: *${stats.published}*\n` +
                `👁 Просмотров: *${stats.views}*\n` +
                `⬇️ Загрузок: *${stats.downloads}*`
            );

        } else if (text === '/newlesson') {
            const frontendUrl = process.env.FRONTEND_URL || 'https://teachflow-pi.vercel.app';
            await sendMessage(botToken, chatId,
                `➕ *Создайте новый урок:*\n\n${frontendUrl}/builder`
            );

        } else {
            await sendMessage(botToken, chatId,
                `🤖 Неизвестная команда. Напишите /help для списка команд.`
            );
        }

    } catch (err) {
        console.error('Telegram webhook error:', err.message);
    }
});

// ──────────────────────────────────────────
// POST Generic inbound webhook
// ──────────────────────────────────────────
router.post('/incoming', async (req, res) => {
    try {
        const { source = 'unknown', event_type = 'generic' } = req.query;
        await runQuery(
            'INSERT INTO webhooks (source, event_type, payload, processed) VALUES (?, ?, ?, 0)',
            [source, event_type, JSON.stringify(req.body)]
        );
        res.json({ received: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
