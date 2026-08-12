/**
 * Lesson Schedule routes
 * GET    /api/schedule          — get my week schedule
 * GET    /api/schedule/today    — today's lessons only
 * POST   /api/schedule          — add lesson to schedule
 * PUT    /api/schedule/:id      — update
 * DELETE /api/schedule/:id      — remove
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');

// Day names helper (0=Sun, 1=Mon...6=Sat — JS standard)
// We use 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun

function getTodayDow() {
    return new Date().getDay(); // 0=Sun
}

// GET /api/schedule — full week
router.get('/', authenticateToken, async (req, res) => {
    try {
        const rows = await getAll(
            `SELECT s.*, l.thumbnail_url, l.title as lesson_title
             FROM lesson_schedule s
             LEFT JOIN lessons l ON l.id = s.lesson_id
             WHERE s.user_id = ?
             ORDER BY s.day_of_week, s.start_time`,
            [req.user.userId]
        );
        res.json({ schedule: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/schedule/today — today's items sorted by time
router.get('/today', authenticateToken, async (req, res) => {
    try {
        const dow = getTodayDow();
        const rows = await getAll(
            `SELECT s.*, l.thumbnail_url, l.title as lesson_title
             FROM lesson_schedule s
             LEFT JOIN lessons l ON l.id = s.lesson_id
             WHERE s.user_id = ? AND s.day_of_week = ?
             ORDER BY s.start_time`,
            [req.user.userId, dow]
        );
        res.json({ lessons: rows, day_of_week: dow });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/schedule — add
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { lesson_id, title, subject, class_name, day_of_week, start_time, duration, color } = req.body;
        if (!title || day_of_week === undefined || !start_time) {
            return res.status(400).json({ error: 'title, day_of_week, start_time обязательны' });
        }
        const dow = parseInt(day_of_week);
        if (dow < 0 || dow > 6) return res.status(400).json({ error: 'day_of_week 0-6' });

        await runQuery(
            `INSERT INTO lesson_schedule (user_id, lesson_id, title, subject, class_name, day_of_week, start_time, duration, color)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, lesson_id || null, title, subject || '', class_name || '', dow, start_time, parseInt(duration) || 45, color || '#6366f1']
        );
        const all = await getAll('SELECT * FROM lesson_schedule WHERE user_id = ? ORDER BY day_of_week, start_time', [req.user.userId]);
        res.status(201).json({ schedule: all });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/schedule/:id
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, subject, class_name, day_of_week, start_time, duration, color } = req.body;
        const id = parseInt(req.params.id);
        const item = await getOne('SELECT id FROM lesson_schedule WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        if (!item) return res.status(404).json({ error: 'Не найдено' });

        await runQuery(
            `UPDATE lesson_schedule SET title=?, subject=?, class_name=?, day_of_week=?, start_time=?, duration=?, color=? WHERE id=?`,
            [title, subject || '', class_name || '', parseInt(day_of_week), start_time, parseInt(duration) || 45, color || '#6366f1', id]
        );
        const all = await getAll('SELECT * FROM lesson_schedule WHERE user_id = ? ORDER BY day_of_week, start_time', [req.user.userId]);
        res.json({ schedule: all });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/schedule/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await runQuery('DELETE FROM lesson_schedule WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
