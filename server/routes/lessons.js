const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

const router = express.Router();

// GET all lessons
router.get('/', async (req, res) => {
    try {
        const { subject, grade, search, limit = 50 } = req.query;

        let sql = 'SELECT * FROM lessons WHERE 1=1';
        const params = [];

        if (subject && subject !== 'all') {
            sql += ` AND subject = ?`;
            params.push(subject);
        }

        if (grade && grade !== 'all') {
            sql += ` AND grade = ?`;
            params.push(parseInt(grade));
        }

        if (search) {
            sql += ` AND (title LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const lessons = getAll(sql, params);
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single lesson
router.get('/:id', (req, res) => {
    try {
        const lesson = getOne('SELECT * FROM lessons WHERE id = ?', [parseInt(req.params.id)]);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        res.json(lesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create lesson
router.post('/', (req, res) => {
    try {
        const { title, subject, grade, duration, description, content } = req.body;

        runQuery(`
      INSERT INTO lessons (title, subject, grade, duration, description, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title || 'Новый урок', subject || 'Математика', grade || 5, duration || 45, description || '', content || '[]']);

        const id = getLastInsertId();
        const lesson = getOne('SELECT * FROM lessons WHERE id = ?', [id]);
        res.status(201).json(lesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update lesson
router.put('/:id', (req, res) => {
    try {
        const { title, subject, grade, duration, description, content } = req.body;

        runQuery(`
      UPDATE lessons 
      SET title = ?, subject = ?, grade = ?, duration = ?, description = ?, content = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [title, subject, grade, duration, description, content, parseInt(req.params.id)]);

        const lesson = getOne('SELECT * FROM lessons WHERE id = ?', [parseInt(req.params.id)]);
        res.json(lesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE lesson
router.delete('/:id', (req, res) => {
    try {
        runQuery('DELETE FROM lessons WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
