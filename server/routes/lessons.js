const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const crypto = require('crypto');

// ──────────────────────────────────────────
// GET all lessons for the authenticated teacher
// ──────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { subject, grade, search, status, limit = 100, offset = 0 } = req.query;
        const userId = req.user.userId;

        let sql = `SELECT l.*, u.name as teacher_name 
                   FROM lessons l 
                   LEFT JOIN users u ON l.user_id = u.id 
                   WHERE l.user_id = ?`;
        const params = [userId];

        if (subject && subject !== 'all') {
            sql += ` AND l.subject = ?`;
            params.push(subject);
        }
        if (grade && grade !== 'all') {
            sql += ` AND l.grade = ?`;
            params.push(parseInt(grade));
        }
        if (search) {
            sql += ` AND (l.title LIKE ? OR l.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status === 'published') {
            sql += ` AND l.is_published = 1 AND l.is_archived = 0`;
        } else if (status === 'draft') {
            sql += ` AND l.is_published = 0 AND l.is_archived = 0`;
        } else if (status === 'archived') {
            sql += ` AND l.is_archived = 1`;
        } else {
            // Default: exclude archived
            sql += ` AND l.is_archived = 0`;
        }

        sql += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const lessons = await getAll(sql, params);
        res.json(lessons);
    } catch (err) {
        console.error('GET lessons error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// GET teacher stats summary
// ──────────────────────────────────────────
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await getOne(`
            SELECT 
                COUNT(*) as total_lessons,
                SUM(CASE WHEN is_published = 1 AND is_archived = 0 THEN 1 ELSE 0 END) as published,
                SUM(CASE WHEN is_published = 0 AND is_archived = 0 THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived,
                COALESCE(SUM(views_count), 0) as total_views,
                COALESCE(SUM(downloads_count), 0) as total_downloads
            FROM lessons
            WHERE user_id = ?
        `, [userId]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// GET single lesson (author only OR via share_token)
// ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const { share_token } = req.query;
        const lesson = await getOne('SELECT * FROM lessons WHERE id = ?', [parseInt(req.params.id)]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

        // If share_token provided, allow public access
        if (share_token && lesson.share_token === share_token) {
            // Track view
            await runQuery('UPDATE lessons SET views_count = views_count + 1 WHERE id = ?', [lesson.id]);
            const files = await getAll('SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY order_index', [lesson.id]);
            return res.json({ ...lesson, files });
        }

        // Otherwise require auth + ownership
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Токен не предоставлен' });

        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'urpaq-ai-secret-key-change-in-production';
        const user = jwt.verify(token, JWT_SECRET);
        if (lesson.user_id !== user.userId && user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        await runQuery('UPDATE lessons SET views_count = views_count + 1 WHERE id = ?', [lesson.id]);
        const files = await getAll('SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY order_index', [lesson.id]);
        res.json({ ...lesson, files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST create lesson
// ──────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            title, subject, grade, duration, description, content,
            thumbnail_url, content_url, file_type, is_published
        } = req.body;
        const userId = req.user.userId;

        await runQuery(`
            INSERT INTO lessons 
                (title, subject, grade, duration, description, content, 
                 thumbnail_url, content_url, file_type, is_published, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title || 'Новый урок',
            subject || 'Математика',
            grade || 5,
            duration || 45,
            description || '',
            content || '[]',
            thumbnail_url || null,
            content_url || null,
            file_type || 'text',
            is_published ? 1 : 0,
            userId
        ]);

        const id = await getLastInsertId();
        const lesson = await getOne('SELECT * FROM lessons WHERE id = ?', [id]);
        res.status(201).json(lesson);
    } catch (err) {
        console.error('POST lesson error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// PUT update lesson (author only)
// ──────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessonId = parseInt(req.params.id);
        const existing = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!existing) return res.status(404).json({ error: 'Урок не найден' });
        if (existing.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав на редактирование' });
        }

        const {
            title, subject, grade, duration, description, content,
            thumbnail_url, content_url, file_type, is_published
        } = req.body;

        await runQuery(`
            UPDATE lessons 
            SET title = ?, subject = ?, grade = ?, duration = ?, description = ?, 
                content = ?, thumbnail_url = ?, content_url = ?, file_type = ?,
                is_published = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [
            title ?? existing.title,
            subject ?? existing.subject,
            grade ?? existing.grade,
            duration ?? existing.duration,
            description ?? existing.description,
            content ?? existing.content,
            thumbnail_url ?? existing.thumbnail_url,
            content_url ?? existing.content_url,
            file_type ?? existing.file_type,
            is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
            lessonId
        ]);

        const updated = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// PATCH archive lesson (toggle)
// ──────────────────────────────────────────
router.patch('/:id/archive', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessonId = parseInt(req.params.id);
        const existing = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!existing) return res.status(404).json({ error: 'Урок не найден' });
        if (existing.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав' });
        }
        const newArchived = existing.is_archived ? 0 : 1;
        await runQuery('UPDATE lessons SET is_archived = ? WHERE id = ?', [newArchived, lessonId]);
        res.json({ success: true, is_archived: newArchived });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST duplicate lesson
// ──────────────────────────────────────────
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessonId = parseInt(req.params.id);
        const original = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!original) return res.status(404).json({ error: 'Урок не найден' });
        if (original.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав' });
        }

        await runQuery(`
            INSERT INTO lessons 
                (title, subject, grade, duration, description, content, 
                 thumbnail_url, content_url, file_type, is_published, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [
            `${original.title} (Копия)`,
            original.subject, original.grade, original.duration,
            original.description, original.content,
            original.thumbnail_url, original.content_url,
            original.file_type, userId
        ]);

        const newId = await getLastInsertId();

        // Duplicate files too
        const files = await getAll('SELECT * FROM lesson_files WHERE lesson_id = ?', [lessonId]);
        for (const file of files) {
            await runQuery(`
                INSERT INTO lesson_files (lesson_id, file_url, file_name, file_size, file_type, public_id, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [newId, file.file_url, file.file_name, file.file_size, file.file_type, file.public_id, file.order_index]);
        }

        const newLesson = await getOne('SELECT * FROM lessons WHERE id = ?', [newId]);
        res.status(201).json(newLesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST generate share link
// ──────────────────────────────────────────
router.post('/:id/share', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessonId = parseInt(req.params.id);
        const existing = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!existing) return res.status(404).json({ error: 'Урок не найден' });
        if (existing.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав' });
        }

        // Generate or reuse share token
        const token = existing.share_token || crypto.randomBytes(16).toString('hex');
        if (!existing.share_token) {
            await runQuery('UPDATE lessons SET share_token = ? WHERE id = ?', [token, lessonId]);
        }

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.json({ share_url: `${baseUrl}/lesson/${lessonId}?share_token=${token}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// DELETE lesson (author only)
// ──────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessonId = parseInt(req.params.id);
        const existing = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!existing) return res.status(404).json({ error: 'Урок не найден' });
        if (existing.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав на удаление' });
        }
        await runQuery('DELETE FROM lessons WHERE id = ?', [lessonId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
