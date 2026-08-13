const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, assignmentSchema } = require('../middleware/validate');

const router = express.Router();

// All assignment routes require authentication
router.use(authenticateToken);

// GET all assignments (scoped to current teacher)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const params = [req.user.userId];

        let sql = `
            SELECT a.*, c.name as class_name, c.subject as subject,
                   COUNT(DISTINCT s.id) as class_total,
                   COUNT(DISTINCT sub.id) as submission_count
            FROM assignments a
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN students s ON s.class_id = c.id
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
            WHERE a.user_id = ?
        `;

        if (status && status !== 'all') {
            sql += ` AND a.status = ?`;
            params.push(status);
        }

        sql += ' GROUP BY a.id ORDER BY a.due_date ASC';

        const assignments = await getAll(sql, params);
        res.json(assignments.map(a => ({
            ...a,
            total: Number(a.class_total || a.total || 0),
            submitted: Number(a.submission_count || a.submitted || 0),
            status: Number(a.submission_count || 0) > 0 && Number(a.class_total || a.total || 0) > 0 && Number(a.submission_count) >= Number(a.class_total || a.total || 0)
                ? 'graded'
                : a.status
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single assignment (must belong to current teacher)
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const assignment = await getOne(
            `SELECT a.*, c.name as class_name
             FROM assignments a
             LEFT JOIN classes c ON a.class_id = c.id
             WHERE a.id = ? AND a.user_id = ?`,
            [id, req.user.userId]
        );

        if (!assignment) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET assignment submissions for teacher review
router.get('/:id/submissions', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const assignment = await getOne(
            `SELECT a.*, c.name as class_name, c.subject
             FROM assignments a
             LEFT JOIN classes c ON a.class_id = c.id
             WHERE a.id = ? AND a.user_id = ?`,
            [id, req.user.userId]
        );

        if (!assignment) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        const submissions = await getAll(
            `SELECT sub.*, s.name as student_name, s.username
             FROM assignment_submissions sub
             JOIN students s ON sub.student_id = s.id
             WHERE sub.assignment_id = ?
             ORDER BY sub.submitted_at DESC`,
            [id]
        );

        res.json({
            assignment,
            submissions: submissions.map(sub => ({
                ...sub,
                mistakes: (() => {
                    try { return JSON.parse(sub.mistakes || '[]'); } catch { return []; }
                })()
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create assignment (with Zod validation)
router.post('/', validate(assignmentSchema), async (req, res) => {
    try {
        const { title, type, class_id, instructions, answer_key, max_score, due_date } = req.body;

        // Verify class belongs to this teacher
        const cls = await getOne(
            'SELECT id FROM classes WHERE id = ? AND user_id = ?',
            [class_id, req.user.userId]
        );
        if (!cls) {
            return res.status(403).json({ error: 'Класс не найден или не принадлежит вам' });
        }

        const totalInfo = await getOne('SELECT COUNT(*) as total FROM students WHERE class_id = ?', [class_id]);

        await runQuery(
            `INSERT INTO assignments (title, type, class_id, instructions, answer_key, max_score, due_date, total, submitted, status, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`,
            [title, type, class_id, instructions || '', answer_key || '', max_score || 100, due_date || null, Number(totalInfo?.total || 0), req.user.userId]
        );

        const id = await getLastInsertId();
        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [id]);

        // ── Auto-send Telegram notification to class students ──
        try {
            const { sendMessage } = require('../utils/telegram');
            const { decrypt } = require('../utils/encryption');
            const { getAll: getAllUtil } = require('../db/database');

            const integration = await getOne(
                'SELECT encrypted_token FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
                [req.user.userId, 'telegram']
            );
            if (integration) {
                const botToken = decrypt(integration.encrypted_token);
                const cls = await getOne('SELECT name FROM classes WHERE id = ?', [class_id]);
                const tgStudents = await getAllUtil(
                    'SELECT telegram_chat_id FROM students WHERE class_id = ? AND telegram_chat_id IS NOT NULL',
                    [class_id]
                );
                const teacher = await getOne('SELECT name FROM users WHERE id = ?', [req.user.userId]);
                const msgText = `📝 *Жаңа тапсырма*\n\n*${title}*\n📚 ${cls?.name || ''}\n${due_date ? `⏰ Мерзімі: ${due_date}` : ''}\n${instructions ? `\n${instructions}` : ''}\n\n_— ${teacher?.name || 'Мұғалім'}_`;
                for (const s of tgStudents) {
                    sendMessage(botToken, s.telegram_chat_id, msgText).catch(() => {});
                }
            }
        } catch { /* silent — Telegram optional */ }

        res.status(201).json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update assignment (must belong to current teacher)
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const existing = await getOne(
            'SELECT id FROM assignments WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (!existing) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        const { title, type, class_id, instructions = '', answer_key = '', max_score = 100, due_date, submitted, total, status } = req.body;

        await runQuery(
            `UPDATE assignments
             SET title = ?, type = ?, class_id = ?, instructions = ?, answer_key = ?, max_score = ?, due_date = ?, submitted = ?, total = ?, status = ?
             WHERE id = ? AND user_id = ?`,
            [title, type, parseInt(class_id, 10), instructions, answer_key, max_score, due_date, submitted, total, status, id, req.user.userId]
        );

        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [id]);
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE assignment (must belong to current teacher)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const existing = await getOne(
            'SELECT id FROM assignments WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (!existing) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        await runQuery('DELETE FROM assignments WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
