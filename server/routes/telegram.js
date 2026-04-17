const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');
const { sendMessage, getMe } = require('../utils/telegram');
const { decrypt } = require('../utils/encryption');

// ── Helper: get teacher's active Telegram bot token ──
async function getTeacherBot(userId) {
    const integration = await getOne(
        'SELECT encrypted_token, chat_id FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
        [userId, 'telegram']
    );
    if (!integration) return null;
    try {
        const token = decrypt(integration.encrypted_token);
        return { token, chat_id: integration.chat_id };
    } catch {
        return null;
    }
}

// ── GET /api/telegram/status ── Check if bot configured, get stats
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const bot = await getTeacherBot(req.user.userId);
        if (!bot) return res.json({ connected: false });

        const botInfo = await getMe(bot.token);
        const classes = await getAll(
            `SELECT c.id, c.name, c.subject, c.grade, c.telegram_invite_code,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as total_students,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.telegram_chat_id IS NOT NULL) as tg_students
             FROM classes c WHERE c.user_id = ? ORDER BY c.name`,
            [req.user.userId]
        );

        res.json({
            connected: botInfo.ok,
            bot_name: botInfo.result?.username,
            bot_first_name: botInfo.result?.first_name,
            classes,
            chat_id: bot.chat_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/telegram/class/:id/invite-code ── Generate invite code for class
router.post('/class/:id/invite-code', authenticateToken, async (req, res) => {
    try {
        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(req.params.id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс не найден' });

        const code = classInfo.telegram_invite_code || crypto.randomBytes(6).toString('hex').toUpperCase();
        await runQuery(
            'UPDATE classes SET telegram_invite_code = ? WHERE id = ?',
            [code, classInfo.id]
        );

        const bot = await getTeacherBot(req.user.userId);
        const bot_name = bot ? (await getMe(bot.token)).result?.username : null;

        res.json({ success: true, code, bot_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/telegram/send-to-class ── Broadcast message to all Telegram-connected students
router.post('/send-to-class', authenticateToken, async (req, res) => {
    try {
        const { class_id, message } = req.body;
        if (!class_id || !message) return res.status(400).json({ error: 'class_id и message обязательны' });

        const bot = await getTeacherBot(req.user.userId);
        if (!bot) return res.status(400).json({ error: 'Telegram бот не подключён' });

        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(class_id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс не найден' });

        const students = await getAll(
            'SELECT * FROM students WHERE class_id = ? AND telegram_chat_id IS NOT NULL',
            [parseInt(class_id)]
        );

        if (students.length === 0) {
            return res.json({ success: true, sent: 0, message: 'Нет студентов с Telegram' });
        }

        const teacher = await getOne('SELECT name FROM users WHERE id = ?', [req.user.userId]);
        const fullText = `📢 *${classInfo.name}* — сообщение от учителя\n\n${message}\n\n_— ${teacher.name}_`;

        let sent = 0, failed = 0;
        for (const student of students) {
            try {
                await sendMessage(bot.token, student.telegram_chat_id, fullText);
                sent++;
            } catch {
                failed++;
            }
        }

        res.json({ success: true, sent, failed, total: students.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/telegram/send-to-student ── Send to specific student
router.post('/send-to-student', authenticateToken, async (req, res) => {
    try {
        const { student_id, message } = req.body;
        if (!student_id || !message) return res.status(400).json({ error: 'Обязательные поля: student_id, message' });

        const bot = await getTeacherBot(req.user.userId);
        if (!bot) return res.status(400).json({ error: 'Telegram бот не подключён' });

        const student = await getOne(
            `SELECT s.* FROM students s
             JOIN classes c ON s.class_id = c.id
             WHERE s.id = ? AND c.user_id = ?`,
            [parseInt(student_id), req.user.userId]
        );
        if (!student) return res.status(404).json({ error: 'Ученик не найден' });
        if (!student.telegram_chat_id) return res.status(400).json({ error: 'У ученика нет Telegram' });

        const teacher = await getOne('SELECT name FROM users WHERE id = ?', [req.user.userId]);
        const fullText = `👤 *Личное сообщение*\n\n${message}\n\n_— ${teacher.name}_`;

        await sendMessage(bot.token, student.telegram_chat_id, fullText);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/telegram/class/:id/students ── Students list with TG status
router.get('/class/:id/students', authenticateToken, async (req, res) => {
    try {
        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(req.params.id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс не найден' });

        const students = await getAll(
            'SELECT id, name, email, telegram_chat_id, telegram_username, created_at FROM students WHERE class_id = ? ORDER BY name',
            [parseInt(req.params.id)]
        );

        res.json({ class: classInfo, students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/webhooks/telegram/:teacherId ── Telegram webhook — student auto-join
router.post('/webhook/:teacherId', async (req, res) => {
    try {
        res.sendStatus(200); // Always reply fast to Telegram

        const { message } = req.body;
        if (!message || !message.text) return;

        const text = message.text.trim();
        const chatId = message.chat.id.toString();
        const username = message.from?.username || null;
        const firstName = message.from?.first_name || 'Ученик';

        // Find teacher's bot
        const teacherId = parseInt(req.params.teacherId);
        const integration = await getOne(
            'SELECT encrypted_token FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
            [teacherId, 'telegram']
        );
        if (!integration) return;

        let botToken;
        try { botToken = decrypt(integration.encrypted_token); } catch { return; }

        // /start CLASS_CODE
        if (text.startsWith('/start')) {
            const parts = text.split(' ');
            const code = parts[1];

            if (!code) {
                await sendMessage(botToken, chatId,
                    `👋 *Сәлем, ${firstName}!*\n\nМен Urpaq.ai мұғалімінің бот-көмекшісімін.\n\nСыныпқа қосылу үшін мұғаліміңіз берген сілтемені басыңыз немесе кодты енгізіңіз:\n/join XXXXXX`
                );
                return;
            }

            // Find class by code
            const classInfo = await getOne(
                'SELECT * FROM classes WHERE telegram_invite_code = ? AND user_id = ?',
                [code, teacherId]
            );

            if (!classInfo) {
                await sendMessage(botToken, chatId,
                    `❌ *Код табылмады*\n\nМұғаліміңізден дұрыс сілтемені сұраңыз.`
                );
                return;
            }

            // Check if already registered
            const existing = await getOne(
                'SELECT id, name FROM students WHERE telegram_chat_id = ? AND class_id = ?',
                [chatId, classInfo.id]
            );

            if (existing) {
                await sendMessage(botToken, chatId,
                    `✅ *${existing.name}, сіз бұрын тіркелгенсіз!*\n\n📚 Сынып: *${classInfo.name}*\n\nМұғалімнің хабарламаларын аласыз.`
                );
                return;
            }

            // Auto-register or update existing student without TG
            const studentByEmail = await getOne(
                'SELECT id, name FROM students WHERE class_id = ? AND telegram_chat_id IS NULL LIMIT 1',
                [classInfo.id]
            );

            if (studentByEmail) {
                // Link Telegram to existing student record
                await runQuery(
                    'UPDATE students SET telegram_chat_id = ?, telegram_username = ? WHERE id = ?',
                    [chatId, username, studentByEmail.id]
                );
                await sendMessage(botToken, chatId,
                    `🎉 *Сәтті тіркелдіңіз!*\n\n👤 Аты: *${studentByEmail.name}*\n📚 Сынып: *${classInfo.name}*\n\nЕнді мұғалімнің хабарламаларын Telegram-да аласыз! 📬`
                );
            } else {
                // Create new student entry
                await runQuery(
                    'INSERT INTO students (name, class_id, telegram_chat_id, telegram_username) VALUES (?, ?, ?, ?)',
                    [firstName, classInfo.id, chatId, username]
                );
                await sendMessage(botToken, chatId,
                    `🎉 *${firstName}, сыныпқа қосылдыңыз!*\n\n📚 Сынып: *${classInfo.name}*\n\nЕнді мұғалімнің хабарламаларын Telegram-да аласыз! 📬`
                );
            }

            // Notify teacher
            const teacherIntegration = await getOne(
                'SELECT encrypted_token, chat_id FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
                [teacherId, 'telegram']
            );
            if (teacherIntegration?.chat_id) {
                try {
                    const tToken = decrypt(teacherIntegration.encrypted_token);
                    await sendMessage(tToken, teacherIntegration.chat_id,
                        `📣 *Жаңа оқушы қосылды!*\n\n👤 ${firstName}${username ? ` (@${username})` : ''}\n📚 Сынып: *${classInfo.name}*`
                    );
                } catch {}
            }
        }

        // /help
        if (text === '/help') {
            await sendMessage(botToken, chatId,
                `📖 *Urpaq.ai Bot — Командалар*\n\n/start CODE — сыныпқа қосылу\n/join CODE — сыныпқа қосылу\n/help — көмек`
            );
        }
    } catch (err) {
        console.error('Telegram webhook error:', err.message);
    }
});

module.exports = router;
