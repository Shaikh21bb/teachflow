const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendMessage, sendLessonCard, setWebhook, getMe } = require('../utils/telegram');

// ──────────────────────────────────────────
// GET all integrations for current user
// ──────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const integrations = await getAll(
            'SELECT type, is_active, connected_at, config FROM integrations WHERE user_id = ?',
            [req.user.userId]
        );
        // Return integration statuses without secrets
        const result = integrations.reduce((acc, i) => {
            acc[i.type] = {
                connected: !!i.is_active,
                connected_at: i.connected_at,
                config: (() => {
                    try { return JSON.parse(i.config); } catch { return {}; }
                })()
            };
            return acc;
        }, {});
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST connect Telegram bot
// ──────────────────────────────────────────
router.post('/telegram', authenticateToken, async (req, res) => {
    try {
        const { bot_token, chat_id } = req.body;
        if (!bot_token) return res.status(400).json({ error: 'bot_token обязателен' });

        // Validate token with Telegram
        const botInfo = await getMe(bot_token);
        if (!botInfo.ok) {
            return res.status(400).json({ error: 'Неверный токен бота. Проверьте токен от @BotFather' });
        }

        const encryptedToken = encrypt(bot_token);
        const config = JSON.stringify({ bot_name: botInfo.result.username });

        // Upsert integration
        const existing = await getOne(
            'SELECT id FROM integrations WHERE user_id = ? AND type = ?',
            [req.user.userId, 'telegram']
        );

        if (existing) {
            await runQuery(
                `UPDATE integrations SET encrypted_token = ?, chat_id = ?, config = ?, is_active = 1, connected_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND type = ?`,
                [encryptedToken, chat_id || null, config, req.user.userId, 'telegram']
            );
        } else {
            await runQuery(
                `INSERT INTO integrations (user_id, type, encrypted_token, chat_id, config, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
                [req.user.userId, 'telegram', encryptedToken, chat_id || null, config]
            );
        }

        // Register webhook
        const serverUrl = process.env.SERVER_URL || `https://your-server.onrender.com`;
        await setWebhook(bot_token, `${serverUrl}/api/webhooks/telegram/${req.user.userId}`);

        // Send welcome message if chat_id provided
        if (chat_id) {
            await sendMessage(bot_token, chat_id,
                `🎉 *Urpaq.ai подключён!*\n\nВаш бот успешно настроен.\n\nДоступные команды:\n/mylessons — список уроков\n/stats — статистика\n/help — помощь`
            );
        }

        res.json({
            success: true,
            bot_name: botInfo.result.username,
            message: `Бот @${botInfo.result.username} успешно подключён!`
        });
    } catch (err) {
        console.error('Telegram connect error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST connect AI (custom Groq key)
// ──────────────────────────────────────────
router.post('/ai', authenticateToken, async (req, res) => {
    try {
        const { api_key, provider = 'groq' } = req.body;
        if (!api_key) return res.status(400).json({ error: 'api_key обязателен' });

        const encryptedToken = encrypt(api_key);
        const config = JSON.stringify({ provider });

        const existing = await getOne(
            'SELECT id FROM integrations WHERE user_id = ? AND type = ?',
            [req.user.userId, 'ai']
        );

        if (existing) {
            await runQuery(
                `UPDATE integrations SET encrypted_token = ?, config = ?, is_active = 1, connected_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND type = ?`,
                [encryptedToken, config, req.user.userId, 'ai']
            );
        } else {
            await runQuery(
                `INSERT INTO integrations (user_id, type, encrypted_token, config, is_active) VALUES (?, ?, ?, ?, 1)`,
                [req.user.userId, 'ai', encryptedToken, config]
            );
        }

        res.json({ success: true, message: `AI (${provider}) подключён` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// DELETE disconnect integration
// ──────────────────────────────────────────
router.delete('/:type', authenticateToken, async (req, res) => {
    try {
        await runQuery(
            'UPDATE integrations SET is_active = 0 WHERE user_id = ? AND type = ?',
            [req.user.userId, req.params.type]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
