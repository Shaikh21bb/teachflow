const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// ── GET /api/notifications — my notifications (auth required) ──
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await getAll(
            `SELECT * FROM notifications
             WHERE user_id = ? OR user_id IS NULL
             ORDER BY created_at DESC
             LIMIT 30`,
            [userId]
        );
        res.json(notifications || []);
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ── GET /api/notifications/unread-count — badge number ─────────
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await getOne(
            `SELECT COUNT(*) as count FROM notifications
             WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
            [userId]
        );
        res.json({ count: result?.count || 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// ── POST /api/notifications — create (internal use / auth) ──────
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { type, text, target_user_id } = req.body;
        const userId = target_user_id || req.user.userId;
        await runQuery(
            `INSERT INTO notifications (type, text, user_id) VALUES (?, ?, ?)`,
            [type || 'info', text, userId]
        );
        res.status(201).json({ message: 'Notification created' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// ── PUT /api/notifications/:id/read — mark one as read ──────────
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        await runQuery(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
            [req.params.id, req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

// ── PUT /api/notifications/read-all — mark all mine as read ─────
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await runQuery(
            `UPDATE notifications SET is_read = 1
             WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
            [req.user.userId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all read' });
    }
});

// ── Helper: create system notifications (used by other routes) ──
async function createNotification(userId, type, text) {
    try {
        await runQuery(
            `INSERT INTO notifications (type, text, user_id) VALUES (?, ?, ?)`,
            [type, text, userId]
        );
    } catch { /* silent */ }
}

module.exports = router;
module.exports.createNotification = createNotification;
