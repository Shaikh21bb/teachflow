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

// ── GET /api/telegram/status ──
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

// ── POST /api/telegram/class/:id/invite-code ──
router.post('/class/:id/invite-code', authenticateToken, async (req, res) => {
    try {
        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(req.params.id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс не найден' });

        const code = classInfo.telegram_invite_code || crypto.randomBytes(6).toString('hex').toUpperCase();
        await runQuery('UPDATE classes SET telegram_invite_code = ? WHERE id = ?', [code, classInfo.id]);

        const bot = await getTeacherBot(req.user.userId);
        const bot_name = bot ? (await getMe(bot.token)).result?.username : null;

        res.json({ success: true, code, bot_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/telegram/send-to-class ──
router.post('/send-to-class', authenticateToken, async (req, res) => {
    try {
        const { class_id, message } = req.body;
        if (!class_id || !message) return res.status(400).json({ error: 'class_id және message міндетті' });

        const bot = await getTeacherBot(req.user.userId);
        if (!bot) return res.status(400).json({ error: 'Telegram бот қосылмаған' });

        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(class_id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс табылмады' });

        const students = await getAll(
            'SELECT * FROM students WHERE class_id = ? AND telegram_chat_id IS NOT NULL',
            [parseInt(class_id)]
        );

        if (students.length === 0) return res.json({ success: true, sent: 0, message: 'Telegram-да оқушылар жоқ' });

        const teacher = await getOne('SELECT name FROM users WHERE id = ?', [req.user.userId]);
        const fullText = `📢 *${classInfo.name}* — мұғалімнің хабарламасы\n\n${message}\n\n_— ${teacher.name}_`;

        let sent = 0, failed = 0;
        for (const student of students) {
            try { await sendMessage(bot.token, student.telegram_chat_id, fullText); sent++; }
            catch { failed++; }
        }

        res.json({ success: true, sent, failed, total: students.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/telegram/send-to-student ──
router.post('/send-to-student', authenticateToken, async (req, res) => {
    try {
        const { student_id, message } = req.body;
        if (!student_id || !message) return res.status(400).json({ error: 'student_id және message міндетті' });

        const bot = await getTeacherBot(req.user.userId);
        if (!bot) return res.status(400).json({ error: 'Telegram бот қосылмаған' });

        const student = await getOne(
            `SELECT s.* FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND c.user_id = ?`,
            [parseInt(student_id), req.user.userId]
        );
        if (!student) return res.status(404).json({ error: 'Оқушы табылмады' });
        if (!student.telegram_chat_id) return res.status(400).json({ error: 'Оқушының Telegram-ы жоқ' });

        const teacher = await getOne('SELECT name FROM users WHERE id = ?', [req.user.userId]);
        const fullText = `👤 *Жеке хабарлама*\n\n${message}\n\n_— ${teacher.name}_`;

        await sendMessage(bot.token, student.telegram_chat_id, fullText);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/telegram/class/:id/students ──
router.get('/class/:id/students', authenticateToken, async (req, res) => {
    try {
        const classInfo = await getOne(
            'SELECT * FROM classes WHERE id = ? AND user_id = ?',
            [parseInt(req.params.id), req.user.userId]
        );
        if (!classInfo) return res.status(404).json({ error: 'Класс табылмады' });

        const students = await getAll(
            'SELECT id, name, email, telegram_chat_id, telegram_username, created_at FROM students WHERE class_id = ? ORDER BY name',
            [parseInt(req.params.id)]
        );

        res.json({ class: classInfo, students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// ── POST /api/telegram/webhook/:teacherId ── Main Webhook
// Мұғалімге: /start, /stats, /myclass, /broadcast, /help
// Оқушыға:   /start CODE, /mygrades, /help
// ═══════════════════════════════════════════════════════════════
router.post('/webhook/:teacherId', async (req, res) => {
    try {
        res.sendStatus(200); // Always reply fast to Telegram

        const { message } = req.body;
        if (!message || !message.text) return;

        const text = message.text.trim();
        const chatId = message.chat.id.toString();
        const username = message.from?.username || null;
        const firstName = message.from?.first_name || 'Пайдаланушы';

        const teacherId = parseInt(req.params.teacherId);
        const integration = await getOne(
            'SELECT encrypted_token, chat_id FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
            [teacherId, 'telegram']
        );
        if (!integration) return;

        let botToken;
        try { botToken = decrypt(integration.encrypted_token); } catch { return; }

        // ─── Determine who is sending ───────────────────────────────
        const isTeacher = integration.chat_id && chatId === integration.chat_id.toString();

        // ─── Check if sender is a registered student ────────────────
        const studentRecord = await getOne(
            `SELECT s.*, c.name as class_name FROM students s
             JOIN classes c ON s.class_id = c.id
             WHERE s.telegram_chat_id = ? AND c.user_id = ?`,
            [chatId, teacherId]
        );

        // ────────────────────────────────────────────────────────────
        // TEACHER COMMANDS
        // ────────────────────────────────────────────────────────────
        if (isTeacher) {

            // /start — Teacher welcome
            if (text.startsWith('/start')) {
                const teacher = await getOne('SELECT name FROM users WHERE id = ?', [teacherId]);
                await sendMessage(botToken, chatId,
                    `🎓 *Сәлем, ${teacher?.name || firstName}!*\n\n` +
                    `Urpaq.ai мұғалім боты белсенді.\n\n` +
                    `*Мұғалімге арналған командалар:*\n` +
                    `📊 /stats — Жалпы статистика\n` +
                    `📚 /myclass — Сыныптар тізімі\n` +
                    `📣 /broadcast [хабарлама] — Барлық оқушыларға жіберу\n` +
                    `❓ /help — Барлық командалар`
                );
                return;
            }

            // /stats — Teacher statistics
            if (text === '/stats') {
                const classes = await getAll(
                    `SELECT c.name, c.subject, c.grade,
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id) as total,
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id AND telegram_chat_id IS NOT NULL) as tg_count
                     FROM classes c WHERE c.user_id = ? ORDER BY c.name`,
                    [teacherId]
                );
                const lessonCount = await getOne(
                    'SELECT COUNT(*) as cnt FROM lessons WHERE user_id = ?', [teacherId]
                );
                const quizCount = await getOne(
                    'SELECT COUNT(*) as cnt FROM quizzes WHERE user_id = ?', [teacherId]
                );

                const totalStudents = classes.reduce((a, c) => a + c.total, 0);
                const tgStudents = classes.reduce((a, c) => a + c.tg_count, 0);

                let statsText = `📊 *Urpaq.ai — Статистика*\n\n`;
                statsText += `📚 Сабақтар: *${lessonCount?.cnt || 0}*\n`;
                statsText += `📝 Тесттер: *${quizCount?.cnt || 0}*\n`;
                statsText += `👥 Барлық оқушылар: *${totalStudents}*\n`;
                statsText += `📱 Telegram-да: *${tgStudents}*\n\n`;
                statsText += `*Сыныптар бойынша:*\n`;
                classes.forEach(c => {
                    statsText += `• ${c.name} — ${c.tg_count}/${c.total} TG\n`;
                });

                await sendMessage(botToken, chatId, statsText);
                return;
            }

            // /myclass — List classes
            if (text === '/myclass') {
                const classes = await getAll(
                    `SELECT c.*, 
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id) as total,
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id AND telegram_chat_id IS NOT NULL) as tg_count
                     FROM classes c WHERE c.user_id = ? ORDER BY c.name`,
                    [teacherId]
                );
                if (classes.length === 0) {
                    await sendMessage(botToken, chatId, `📚 *Сыныптар жоқ*\n\nПлатформаға кіріп сынып қосыңыз.`);
                    return;
                }
                let classText = `📚 *Сіздің сыныптарыңыз:*\n\n`;
                classes.forEach((c, i) => {
                    const code = c.telegram_invite_code || '—';
                    classText += `${i + 1}. *${c.name}*\n`;
                    classText += `   👥 ${c.tg_count}/${c.total} оқушы TG-да\n`;
                    classText += `   🔗 Код: \`${code}\`\n\n`;
                });
                await sendMessage(botToken, chatId, classText);
                return;
            }

            // /broadcast [message] — Send to all students
            if (text.startsWith('/broadcast ')) {
                const broadcastMsg = text.replace('/broadcast ', '').trim();
                if (!broadcastMsg) {
                    await sendMessage(botToken, chatId, `❌ Хабарлама жазыңыз:\n/broadcast Ертең бақылау жұмысы!`);
                    return;
                }
                const allStudents = await getAll(
                    `SELECT s.telegram_chat_id FROM students s
                     JOIN classes c ON s.class_id = c.id
                     WHERE c.user_id = ? AND s.telegram_chat_id IS NOT NULL`,
                    [teacherId]
                );
                const teacher = await getOne('SELECT name FROM users WHERE id = ?', [teacherId]);
                const fullMsg = `📢 *Мұғалімнің хабарламасы*\n\n${broadcastMsg}\n\n_— ${teacher?.name || 'Мұғалім'}_`;
                let sent = 0;
                for (const s of allStudents) {
                    try { await sendMessage(botToken, s.telegram_chat_id, fullMsg); sent++; } catch {}
                }
                await sendMessage(botToken, chatId, `✅ *Жіберілді!*\n\n${sent}/${allStudents.length} оқушыға жетті.`);
                return;
            }

            // /help — Teacher help
            if (text === '/help') {
                await sendMessage(botToken, chatId,
                    `❓ *Мұғалімге арналған командалар:*\n\n` +
                    `📊 /stats — Жалпы статистика\n` +
                    `📚 /myclass — Сыныптар тізімі мен TG-статусы\n` +
                    `📣 /broadcast [мәтін] — Барлық оқушыларға хабарлама\n` +
                    `❓ /help — Осы мәзір\n\n` +
                    `_Платформа: urpaq.ai_`
                );
                return;
            }

            // Unknown command for teacher
            await sendMessage(botToken, chatId,
                `❓ Команда танылмады.\n\nМұғалім командалары:\n/stats · /myclass · /broadcast · /help`
            );
            return;
        }

        // ────────────────────────────────────────────────────────────
        // STUDENT COMMANDS
        // ────────────────────────────────────────────────────────────

        // /start [CODE] — Student join or welcome
        if (text.startsWith('/start') || text.startsWith('/join')) {
            const parts = text.split(' ');
            const code = parts[1];

            if (!code) {
                if (studentRecord) {
                    // Already registered student
                    await sendMessage(botToken, chatId,
                        `✅ *Сәлем, ${studentRecord.name}!*\n\n` +
                        `📚 Сыныбыңыз: *${studentRecord.class_name}*\n\n` +
                        `*Оқушы командалары:*\n` +
                        `📊 /mygrades — Менің нәтижелерім\n` +
                        `❓ /help — Командалар тізімі`
                    );
                } else {
                    await sendMessage(botToken, chatId,
                        `👋 *Сәлем, ${firstName}!*\n\n` +
                        `Мен Urpaq.ai мұғалімінің бот-көмекшісімін.\n\n` +
                        `Сыныпқа қосылу үшін мұғаліміңіз берген сілтемені басыңыз немесе:\n` +
                        `/join XXXXXX — кодты енгізіңіз`
                    );
                }
                return;
            }

            // Find class by invite code
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

            // Already registered in this class
            const existing = await getOne(
                'SELECT id, name FROM students WHERE telegram_chat_id = ? AND class_id = ?',
                [chatId, classInfo.id]
            );

            if (existing) {
                await sendMessage(botToken, chatId,
                    `✅ *${existing.name}, сіз бұрын тіркелгенсіз!*\n\n` +
                    `📚 Сынып: *${classInfo.name}*\n\n` +
                    `Командалар: /mygrades · /help`
                );
                return;
            }

            // Link or create student
            const studentBySlot = await getOne(
                'SELECT id, name FROM students WHERE class_id = ? AND telegram_chat_id IS NULL LIMIT 1',
                [classInfo.id]
            );

            let studentName;
            if (studentBySlot) {
                await runQuery(
                    'UPDATE students SET telegram_chat_id = ?, telegram_username = ? WHERE id = ?',
                    [chatId, username, studentBySlot.id]
                );
                studentName = studentBySlot.name;
            } else {
                await runQuery(
                    'INSERT INTO students (name, class_id, telegram_chat_id, telegram_username) VALUES (?, ?, ?, ?)',
                    [firstName, classInfo.id, chatId, username]
                );
                studentName = firstName;
            }

            await sendMessage(botToken, chatId,
                `🎉 *Сәтті тіркелдіңіз!*\n\n` +
                `👤 Аты: *${studentName}*\n` +
                `📚 Сынып: *${classInfo.name}*\n\n` +
                `Мұғалімнің хабарламаларын Telegram-да аласыз! 📬\n\n` +
                `Командалар: /mygrades · /help`
            );

            // Notify teacher
            if (integration.chat_id) {
                try {
                    await sendMessage(botToken, integration.chat_id,
                        `📣 *Жаңа оқушы қосылды!*\n\n👤 ${studentName}${username ? ` (@${username})` : ''}\n📚 Сынып: *${classInfo.name}*`
                    );
                } catch {}
            }
            return;
        }

        // /mygrades — Student grades
        if (text === '/mygrades') {
            if (!studentRecord) {
                await sendMessage(botToken, chatId,
                    `❌ Сіз тіркелмегенсіз.\n\nМұғаліміңіздің сілтемесін басып тіркеліңіз.`
                );
                return;
            }

            const attempts = await getAll(
                `SELECT q.title, qa.score, qa.max_score, qa.taken_at
                 FROM quiz_attempts qa
                 JOIN quizzes q ON qa.quiz_id = q.id
                 WHERE qa.student_id = ?
                 ORDER BY qa.taken_at DESC LIMIT 5`,
                [studentRecord.id]
            );

            const submissions = await getAll(
                `SELECT a.title, asub.score, asub.max_score, asub.grade_label, asub.submitted_at
                 FROM assignment_submissions asub
                 JOIN assignments a ON asub.assignment_id = a.id
                 WHERE asub.student_id = ?
                 ORDER BY asub.submitted_at DESC LIMIT 5`,
                [studentRecord.id]
            );

            let gradesText = `📊 *${studentRecord.name} — Нәтижелер*\n📚 ${studentRecord.class_name}\n\n`;

            if (attempts.length > 0) {
                gradesText += `*📝 Соңғы тесттер:*\n`;
                attempts.forEach(a => {
                    const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
                    gradesText += `• ${a.title}: *${a.score}/${a.max_score}* (${pct}%)\n`;
                });
                gradesText += '\n';
            }

            if (submissions.length > 0) {
                gradesText += `*📋 Соңғы тапсырмалар:*\n`;
                submissions.forEach(s => {
                    gradesText += `• ${s.title}: *${s.grade_label || s.score + '/' + s.max_score}*\n`;
                });
            }

            if (attempts.length === 0 && submissions.length === 0) {
                gradesText += `_Әлі нәтиже жоқ._`;
            }

            await sendMessage(botToken, chatId, gradesText);
            return;
        }

        // /help — Student help
        if (text === '/help') {
            if (studentRecord) {
                await sendMessage(botToken, chatId,
                    `❓ *Оқушы командалары:*\n\n` +
                    `📊 /mygrades — Менің нәтижелерім (тест, тапсырма)\n` +
                    `❓ /help — Осы мәзір\n\n` +
                    `📚 Сыныбыңыз: *${studentRecord.class_name}*\n` +
                    `_Мұғалімнің хабарламаларын автоматты аласыз._`
                );
            } else {
                await sendMessage(botToken, chatId,
                    `❓ *Командалар:*\n\n` +
                    `/join XXXXXX — Сыныпқа қосылу\n` +
                    `/help — Осы мәзір\n\n` +
                    `Тіркелу үшін мұғаліміңіздің сілтемесін пайдаланыңыз.`
                );
            }
            return;
        }

        // Unknown command for student
        if (text.startsWith('/')) {
            if (studentRecord) {
                await sendMessage(botToken, chatId,
                    `❓ Команда танылмады.\n\nОқушы командалары: /mygrades · /help`
                );
            } else {
                await sendMessage(botToken, chatId,
                    `👋 Тіркелу үшін мұғаліміңіздің сілтемесін пайдаланыңыз немесе /join XXXXXX деп жазыңыз.`
                );
            }
        }

    } catch (err) {
        console.error('Telegram webhook error:', err.message);
    }
});

module.exports = router;
