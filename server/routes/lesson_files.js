const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

// GET files for a lesson
router.get('/:lessonId', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId);
        const lesson = await getOne('SELECT user_id FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        if (lesson.user_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        const files = await getAll(
            'SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY order_index',
            [lessonId]
        );
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add file metadata after successful Cloudinary upload
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { lesson_id, file_url, file_name, file_size, file_type, public_id, order_index } = req.body;
        if (!lesson_id || !file_url) {
            return res.status(400).json({ error: 'lesson_id and file_url are required' });
        }

        // Verify ownership
        const lesson = await getOne('SELECT user_id FROM lessons WHERE id = ?', [parseInt(lesson_id)]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        if (lesson.user_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав' });
        }

        await runQuery(`
            INSERT INTO lesson_files (lesson_id, file_url, file_name, file_size, file_type, public_id, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            parseInt(lesson_id),
            file_url,
            file_name || 'file',
            file_size || 0,
            file_type || 'application/octet-stream',
            public_id || null,
            order_index || 0
        ]);

        const id = await getLastInsertId();
        const file = await getOne('SELECT * FROM lesson_files WHERE id = ?', [id]);
        res.status(201).json(file);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE file (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const file = await getOne(`
            SELECT lf.*, l.user_id 
            FROM lesson_files lf 
            JOIN lessons l ON lf.lesson_id = l.id 
            WHERE lf.id = ?
        `, [fileId]);

        if (!file) return res.status(404).json({ error: 'Файл не найден' });
        if (file.user_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав' });
        }

        await runQuery('DELETE FROM lesson_files WHERE id = ?', [fileId]);
        res.json({ success: true, public_id: file.public_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
