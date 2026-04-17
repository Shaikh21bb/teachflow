const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery } = require('../db/database');
const { decrypt } = require('../utils/encryption');
const { sendMessage, sendLessonCard } = require('../utils/telegram');

// ──────────────────────────────────────────
// POST Telegram webhook (per-user URL)
// Format: /api/webhooks/telegram/:userId
// Handles BOTH teacher commands AND student /start CODE joins
// ──────────────────────────────────────────
router.post('/telegram/:userId', async (req, res) => {
    // Always respond 200 immediately so Telegram doesn't retry
    res.sendStatus(200);

    try {
        const userId = parseInt(req.params.userId);
        const update = req.body;

        const message = update.message || update.callback_query?.message;
        if (!message || !message.text) return;

        const chatId = String(message.chat.id);
        const text = message.text.trim();
        const username = message.from?.username || null;
        const firstName = message.from?.first_name || 'Пайдаланушы';

        // Get teacher's Telegram integration
        const integration = await getOne(
            'SELECT encrypted_token, chat_id FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
            [userId, 'telegram']
        );
        if (!integration) return;

        let botToken;
        try { botToken = decrypt(integration.encrypted_token); } catch { return; }
        if (!botToken) return;

        // ──────────────────────────────────────────
        // /start or /start CODE
        // ──────────────────────────────────────────
        if (text.startsWith('/start')) {
            const parts = text.split(' ');
            const code = parts[1] || null;

            if (code) {
                // ── STUDENT joining a class via invite code ──
                const classInfo = await getOne(
                    'SELECT * FROM classes WHERE telegram_invite_code = ? AND user_id = ?',
                    [code, userId]
                );

                if (!classInfo) {
                    await sendMessage(botToken, chatId,
                        `❌ *Код табылмады*\n\nМұғаліміңізден дұрыс сілтемені сұраңыз.`
                    );
                    return;
                }

                // Already joined this class?
                const alreadyJoined = await getOne(
                    'SELECT id, name FROM students WHERE telegram_chat_id = ? AND class_id = ?',
                    [chatId, classInfo.id]
                );

                if (alreadyJoined) {
                    await sendMessage(botToken, chatId,
                        `✅ *${alreadyJoined.name}, сіз бұрын тіркелгенсіз!*\n\n📚 Сынып: *${classInfo.name}*\n\nМұғалімнің хабарламаларын аласыз 📬`
                    );
                    return;
                }

                // Try to link to existing student record without TG
                const unlinkedStudent = await getOne(
                    'SELECT id, name FROM students WHERE class_id = ? AND telegram_chat_id IS NULL LIMIT 1',
                    [classInfo.id]
                );

                if (unlinkedStudent) {
                    await runQuery(
                        'UPDATE students SET telegram_chat_id = ?, telegram_username = ? WHERE id = ?',
                        [chatId, username, unlinkedStudent.id]
                    );
                    await sendMessage(botToken, chatId,
                        `🎉 *Сәтті тіркелдіңіз!*\n\n👤 Аты: *${unlinkedStudent.name}*\n📚 Сынып: *${classInfo.name}*\n\nЕнді мұғалімнің хабарламаларын Telegram-да аласыз! 📬`
                    );
                } else {
                    await runQuery(
                        'INSERT INTO students (name, class_id, telegram_chat_id, telegram_username) VALUES (?, ?, ?, ?)',
                        [firstName, classInfo.id, chatId, username]
                    );
                    await sendMessage(botToken, chatId,
                        `🎉 *${firstName}, сыныпқа қосылдыңыз!*\n\n📚 Сынып: *${classInfo.name}*\n\nЕнді мұғалімнің хабарламаларын Telegram-да аласыз! 📬`
                    );
                }

                // Notify teacher
                if (integration.chat_id) {
                    try {
                        await sendMessage(botToken, integration.chat_id,
                            `📣 *Жаңа оқушы қосылды!*\n\n👤 ${firstName}${username ? ` (@${username})` : ''}\n📚 Сынып: *${classInfo.name}*`
                        );
                    } catch {}
                }
                return;
            }

            // /start without code → teacher greeting + save chat_id
            await runQuery(
                'UPDATE integrations SET chat_id = ? WHERE user_id = ? AND type = ?',
                [chatId, userId, 'telegram']
            );
            await sendMessage(botToken, chatId,
                `👋 *Сәлем! Мен Urpaq.ai көмекшісімін*\n\nҚолда бар командалар:\n\n🗂 /mylessons — сабақтарым\n📊 /stats — статистика\n➕ /newlesson — жаңа сабақ\n❓ /help — көмек`
            );
            return;
        }

        // ──────────────────────────────────────────────────────────
        // Teacher-only commands: check that this chatId belongs to teacher
        // ──────────────────────────────────────────────────────────
        const isTeacherChat = integration.chat_id && integration.chat_id === chatId;

        if (text === '/help') {
            if (isTeacherChat) {
                await sendMessage(botToken, chatId,
                    `👋 *Urpaq.ai Bot*\n\n🗂 /mylessons — сабақтарым\n📊 /stats — статистика\n➕ /newlesson — жаңа сабақ\n❓ /help — көмек`
                );
            } else {
                await sendMessage(botToken, chatId,
                    `📖 *Urpaq.ai*\n\nСіз оқушы ретінде тіркелгенсіз.\nМұғалімнің хабарламаларын осы жерден аласыз.`
                );
            }

        } else if (text === '/mylessons') {
            if (!isTeacherChat) {
                await sendMessage(botToken, chatId, `ℹ️ Бұл команда тек мұғалімдерге арналған.`);
                return;
            }
            const lessons = await getAll(
                'SELECT * FROM lessons WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC LIMIT 5',
                [userId]
            );
            if (!lessons.length) {
                await sendMessage(botToken, chatId, '📭 Сабақтар жоқ. Urpaq.ai-да алғашқы сабағыңызды жасаңыз!');
            } else {
                await sendMessage(botToken, chatId, `📚 *Соңғы ${lessons.length} сабақ:*`);
                for (const lesson of lessons) {
                    await sendLessonCard(botToken, chatId, lesson);
                }
            }

        } else if (text === '/stats') {
            if (!isTeacherChat) {
                await sendMessage(botToken, chatId, `ℹ️ Бұл команда тек мұғалімдерге арналған.`);
                return;
            }
            const stats = await getOne(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views_count), 0) as views,
                    COALESCE(SUM(downloads_count), 0) as downloads,
                    SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published
                FROM lessons WHERE user_id = ?
            `, [userId]);

            await sendMessage(botToken, chatId,
                `📊 *Urpaq.ai статистика*\n\n` +
                `📚 Барлық сабақ: *${stats.total}*\n` +
                `✅ Жарияланған: *${stats.published}*\n` +
                `👁 Көрулер: *${stats.views}*\n` +
                `⬇️ Жүктелулер: *${stats.downloads}*`
            );

        } else if (text === '/newlesson') {
            if (!isTeacherChat) return;
            const frontendUrl = process.env.FRONTEND_URL || 'https://urpaq-edu.vercel.app';
            await sendMessage(botToken, chatId,
                `➕ *Жаңа сабақ жасау:*\n\n${frontendUrl}/builder`
            );

        } else {
            // Only reply teacher to avoid spamming students
            if (isTeacherChat) {
                await sendMessage(botToken, chatId,
                    `🤖 Белгісіз команда. /help жазыңыз.`
                );
            }
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
