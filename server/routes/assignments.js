const express = require('express');
const { getOne, getAll, runQuery } = require('../db/database');
const { getGradeLabel } = require('../utils/assignmentGrader');
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
                   (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as class_total,
                   (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count,
                   (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id AND sub.status = 'graded') as graded_count
            FROM assignments a
            LEFT JOIN classes c ON a.class_id = c.id
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
            status: Number(a.graded_count || 0) > 0 && Number(a.class_total || a.total || 0) > 0 && Number(a.graded_count) >= Number(a.class_total || a.total || 0)
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

        const inserted = await runQuery(
            `INSERT INTO assignments (title, type, class_id, instructions, answer_key, max_score, due_date, total, submitted, status, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`,
            [title, type, class_id, instructions || '', answer_key || '', max_score || 100, due_date || null, Number(totalInfo?.total || 0), req.user.userId]
        );

        const id = Number(inserted.lastInsertRowid);
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
            'SELECT * FROM assignments WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (!existing) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        const parsed = assignmentSchema.safeParse({ ...existing, ...req.body });
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
        const { title, type, class_id, instructions, answer_key, max_score, due_date } = parsed.data;
        const target = await getOne('SELECT id FROM classes WHERE id = ? AND user_id = ?', [class_id, req.user.userId]);
        if (!target) return res.status(404).json({ error: 'Класс не найден' });
        const { submitted, total, status } = existing;

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

router.patch('/:id/submissions/:submissionId', async (req, res, next) => {
    try {
        const submission = await getOne(`SELECT sub.* FROM assignment_submissions sub
            JOIN assignments a ON a.id = sub.assignment_id
            WHERE sub.id = ? AND a.id = ? AND a.user_id = ?`,
            [Number(req.params.submissionId), Number(req.params.id), req.user.userId]);
        if (!submission) return res.status(404).json({ error: 'Работа не найдена' });
        const score = req.body.score;
        const feedback = req.body.feedback;
        if (!Number.isInteger(score) || score < 0 || score > submission.max_score || typeof feedback !== 'string' || feedback.length > 2000) {
            return res.status(400).json({ error: 'Укажите допустимый балл и комментарий до 2000 символов' });
        }
        await runQuery(`UPDATE assignment_submissions SET score = ?, grade_label = ?, feedback = ?, status = 'graded', graded_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [score, getGradeLabel(score, submission.max_score), feedback.trim(), submission.id]);
        await runQuery(`UPDATE assignments SET status = CASE
            WHEN EXISTS (SELECT 1 FROM assignment_submissions WHERE assignment_id = assignments.id AND status = 'pending') THEN 'completed'
            WHEN total > 0 AND submitted >= total THEN 'graded' ELSE 'active' END WHERE id = ?`, [submission.assignment_id]);
        res.json({ success: true });
    } catch (error) { next(error); }
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
