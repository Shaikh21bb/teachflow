const express = require('express');
const router = express.Router();
const { getAll, runQuery } = require('../db/database');

// Get all notifications
router.get('/', (req, res) => {
    try {
        const notifications = getAll(
            `SELECT * FROM notifications 
             ORDER BY created_at DESC 
             LIMIT 10`
        );

        res.json(notifications || []);
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Create a notification
router.post('/', (req, res) => {
    try {
        const { icon, type, text } = req.body;

        runQuery(
            `INSERT INTO notifications (icon, type, text) VALUES (?, ?, ?)`,
            [icon, type, text]
        );

        res.status(201).json({ message: 'Notification created' });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Mark notification as read
router.put('/:id/read', (req, res) => {
    try {
        const { id } = req.params;

        runQuery(
            `UPDATE notifications SET is_read = 1 WHERE id = ?`,
            [id]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

module.exports = router;
