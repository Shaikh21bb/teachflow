const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { checkLessonLimit } = require('../middleware/planMiddleware');
const crypto = require('crypto');

// ──────────────────────────────────────────
// GET all lessons for the authenticated teacher
// ──────────────────────────────────────────
// ──────────────────────────────────────────
// GET /api/lessons/public — community lesson library
// Returns published lessons from ALL teachers
// Supports: ?search=, ?subject=, ?grade=, ?sort=newest|popular|liked, ?page=
// ──────────────────────────────────────────
router.get('/public', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const { search, subject, grade, sort = 'newest', page = 1 } = req.query;
        const limit = 24;
        const offset = (parseInt(page) - 1) * limit;

        let sql = `
            SELECT l.id, l.title, l.subject, l.grade, l.duration, l.description,
                l.thumbnail_url, l.views_count, l.likes, l.created_at,
                u.id as author_id, u.name as author_name,
                COALESCE(tp.avatar_url, u.avatar_url) as author_avatar,
                tp.school as author_school,
                CASE WHEN ll.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
                CASE WHEN sm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_saved
            FROM lessons l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
            LEFT JOIN lesson_likes ll ON ll.lesson_id = l.id AND ll.user_id = ?
            LEFT JOIN saved_materials sm ON sm.lesson_id = l.id AND sm.user_id = ?
            WHERE l.is_published = 1 AND l.is_archived = 0`;
        const params = [myId, myId];

        if (search) { sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR u.name LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (subject) { sql += ` AND l.subject = ?`; params.push(subject); }
        if (grade)   { sql += ` AND l.grade = ?`;   params.push(grade); }

        sql += sort === 'popular' ? ` ORDER BY l.views_count DESC` : sort === 'liked' ? ` ORDER BY l.likes DESC` : ` ORDER BY l.created_at DESC`;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const lessons = await getAll(sql, params);

        let countSql = `SELECT COUNT(*) as total FROM lessons l JOIN users u ON l.user_id = u.id WHERE l.is_published = 1 AND l.is_archived = 0`;
        const countParams = [];
        if (search) { countSql += ` AND (l.title LIKE ? OR l.description LIKE ? OR u.name LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (subject) { countSql += ` AND l.subject = ?`; countParams.push(subject); }
        if (grade)   { countSql += ` AND l.grade = ?`;   countParams.push(grade); }

        const total = (await getOne(countSql, countParams))?.total || 0;

        res.json({
            lessons: lessons.map(l => ({ ...l, is_liked: l.is_liked === 1, is_saved: l.is_saved === 1 })),
            total, page: parseInt(page), pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Public lessons error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/lessons/saved ───────────────────────────────────
router.get('/saved', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const lessons = await getAll(
            `SELECT l.id, l.title, l.subject, l.grade, l.duration, l.thumbnail_url,
                    l.views_count, l.likes, l.created_at,
                    u.id as author_id, u.name as author_name,
                    COALESCE(tp.avatar_url, u.avatar_url) as author_avatar,
                    sm.created_at as saved_at
             FROM saved_materials sm
             JOIN lessons l ON l.id = sm.lesson_id
             JOIN users u ON u.id = l.user_id
             LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
             WHERE sm.user_id = ? AND sm.type = 'lesson' AND l.is_archived = 0
             ORDER BY sm.created_at DESC`, [userId]
        );
        res.json({ lessons });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/lessons/:id/like — toggle like ─────────────────
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const userId = req.user.userId;
        const existing = await getOne('SELECT 1 FROM lesson_likes WHERE user_id = ? AND lesson_id = ?', [userId, lessonId]);
        if (existing) {
            await runQuery('DELETE FROM lesson_likes WHERE user_id = ? AND lesson_id = ?', [userId, lessonId]);
            await runQuery('UPDATE lessons SET likes = MAX(0, likes - 1) WHERE id = ?', [lessonId]);
        } else {
            await runQuery('INSERT OR IGNORE INTO lesson_likes (user_id, lesson_id) VALUES (?, ?)', [userId, lessonId]);
            await runQuery('UPDATE lessons SET likes = likes + 1 WHERE id = ?', [lessonId]);
        }
        const l = await getOne('SELECT likes FROM lessons WHERE id = ?', [lessonId]);
        res.json({ liked: !existing, likes: l?.likes || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/lessons/:id/save — save to my saved_materials ──
router.post('/:id/save', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const userId = req.user.userId;
        const lesson = await getOne('SELECT id, title FROM lessons WHERE id = ? AND is_published = 1', [lessonId]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        const existing = await getOne('SELECT id FROM saved_materials WHERE user_id = ? AND lesson_id = ?', [userId, lessonId]);
        if (existing) {
            await runQuery('DELETE FROM saved_materials WHERE user_id = ? AND lesson_id = ?', [userId, lessonId]);
            res.json({ saved: false });
        } else {
            await runQuery(`INSERT INTO saved_materials (user_id, lesson_id, title, type) VALUES (?, ?, ?, 'lesson')`, [userId, lessonId, lesson.title]);
            res.json({ saved: true });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────
// GET /api/lessons — my own lessons
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

        // ── Token milestone rewards (10, 50, 100 views) ──────
        const newViews = (lesson.views_count || 0) + 1;
        const milestones = { 10: 10, 50: 25, 100: 50, 500: 100 };
        if (milestones[newViews]) {
            try {
                const { addTokens } = require('./marketplace');
                await addTokens(lesson.user_id, milestones[newViews], 'views_milestone', `${newViews} просмотров урока "${lesson.title}"`, lesson.id);
            } catch { /* silent */ }
        }

        const files = await getAll('SELECT * FROM lesson_files WHERE lesson_id = ? ORDER BY order_index', [lesson.id]);
        res.json({ ...lesson, files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────
// POST create lesson
// ──────────────────────────────────────────
router.post('/', authenticateToken, checkLessonLimit, async (req, res) => {
    try {
        const {
            title, subject, grade, duration, description, content,
            thumbnail_url, content_url, file_type, is_published,
            slides_json, theme
        } = req.body;
        const userId = req.user.userId;

        await runQuery(`
            INSERT INTO lessons 
                (title, subject, grade, duration, description, content, 
                 thumbnail_url, content_url, file_type, is_published, user_id,
                 slides_json, theme)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            userId,
            slides_json ? JSON.stringify(slides_json) : null,
            theme || 'dark'
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
            thumbnail_url, content_url, file_type, is_published,
            slides_json, theme
        } = req.body;

        await runQuery(`
            UPDATE lessons 
            SET title = ?, subject = ?, grade = ?, duration = ?, description = ?, 
                content = ?, thumbnail_url = ?, content_url = ?, file_type = ?,
                is_published = ?, slides_json = ?, theme = ?,
                updated_at = datetime('now')
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
            slides_json !== undefined ? JSON.stringify(slides_json) : existing.slides_json,
            theme ?? existing.theme ?? 'dark',
            lessonId
        ]);

        const updated = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);

        // ── Token reward: first publish ──────────────────────
        if (is_published && !existing.is_published) {
            try {
                const { addTokens } = require('./marketplace');
                await addTokens(userId, 30, 'publish_bonus', `Первая публикация урока "${updated.title}"`, lessonId);
            } catch { /* silent if marketplace not ready */ }
        }

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
                 thumbnail_url, content_url, file_type, is_published, user_id,
                 slides_json, theme)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [
            `${original.title} (Копия)`,
            original.subject, original.grade, original.duration,
            original.description, original.content,
            original.thumbnail_url, original.content_url,
            original.file_type, userId,
            original.slides_json || null,
            original.theme || 'dark'
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
// GET slides_json for a lesson (teacher only)
// Returns parsed slides array or null
// ──────────────────────────────────────────
router.get('/:id/slides', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const lesson = await getOne('SELECT slides_json, theme FROM lessons WHERE id = ? AND user_id = ?',
            [lessonId, req.user.userId]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

        let slides = null;
        if (lesson.slides_json) {
            try { slides = JSON.parse(lesson.slides_json); } catch { slides = null; }
        }
        res.json({ slides, theme: lesson.theme || 'dark' });
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
