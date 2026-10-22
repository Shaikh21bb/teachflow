const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, withTransaction } = require('../db/database');
const { canReadLesson } = require('../utils/lessonAccess');
const {
    enqueueCloudinaryCleanup,
    getResourceType,
    isCloudinaryCleanupQueued,
    isOwnedLessonAsset,
    processCloudinaryCleanupJobs,
} = require('../utils/cloudinaryCleanup');

// GET files for a lesson
router.get('/:lessonId', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId);
        const lesson = await getOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
        if (!await canReadLesson(lesson, req.user)) {
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
        if (public_id && !isOwnedLessonAsset(public_id, req.user.userId)) {
            return res.status(400).json({
                error: 'Файл загружен вне защищённой папки пользователя',
                code: 'INVALID_ASSET_PROVENANCE',
            });
        }
        const lessonId = Number(lesson_id);
        if (!Number.isSafeInteger(lessonId) || lessonId <= 0) {
            return res.status(400).json({ error: 'Неверный ID урока' });
        }
        const normalizedFileType = file_type || 'application/octet-stream';
        const outcome = await withTransaction(async transaction => {
            const lesson = (await transaction.execute({
                sql: 'SELECT user_id FROM lessons WHERE id = ?',
                args: [lessonId],
            })).rows[0];
            if (!lesson) return { status: 404, body: { error: 'Урок не найден' } };
            if (lesson.user_id !== req.user.userId && req.user.role !== 'admin') {
                return { status: 403, body: { error: 'Нет прав' } };
            }
            if (public_id && await isCloudinaryCleanupQueued(
                transaction,
                public_id,
                getResourceType(normalizedFileType)
            )) {
                return {
                    status: 409,
                    body: {
                        error: 'Файл уже удаляется. Загрузите его заново.',
                        code: 'ASSET_CLEANUP_IN_PROGRESS',
                    },
                };
            }
            const result = await transaction.execute({
                sql: `INSERT INTO lesson_files
                        (lesson_id, file_url, file_name, file_size, file_type, public_id, asset_owner_id, order_index)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    lessonId,
                    file_url,
                    file_name || 'file',
                    file_size || 0,
                    normalizedFileType,
                    public_id || null,
                    public_id ? req.user.userId : null,
                    order_index || 0,
                ],
            });
            const id = Number(result.lastInsertRowid);
            const file = (await transaction.execute({
                sql: 'SELECT * FROM lesson_files WHERE id = ?',
                args: [id],
            })).rows[0];
            return { status: 201, body: file };
        });
        res.status(outcome.status).json(outcome.body);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE file (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const fileId = Number(req.params.id);
        if (!Number.isSafeInteger(fileId) || fileId <= 0) {
            return res.status(400).json({ error: 'Неверный ID файла' });
        }
        const outcome = await withTransaction(async transaction => {
            const file = (await transaction.execute({
                sql: `SELECT lf.*, l.user_id
                      FROM lesson_files lf
                      JOIN lessons l ON lf.lesson_id = l.id
                      WHERE lf.id = ?`,
                args: [fileId],
            })).rows[0];
            if (!file) return { status: 404, body: { error: 'Файл не найден' } };
            if (file.user_id !== req.user.userId && req.user.role !== 'admin') {
                return { status: 403, body: { error: 'Нет прав' } };
            }
            const cleanup = await enqueueCloudinaryCleanup(transaction, [file]);
            await transaction.execute({ sql: 'DELETE FROM lesson_files WHERE id = ?', args: [fileId] });
            return {
                status: 200,
                body: {
                    success: true,
                    public_id: file.public_id,
                    cleanup_pending: cleanup.queued,
                    cleanup_manual: cleanup.skipped,
                },
            };
        });
        if (outcome.status === 200 && outcome.body.cleanup_pending) {
            processCloudinaryCleanupJobs().catch(error => console.warn('Cloudinary cleanup:', error.message));
        }
        res.status(outcome.status).json(outcome.body);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
