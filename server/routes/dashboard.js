const express = require('express');
const router = express.Router();
const { getOne, getAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Count lessons for today by this user
        const today = new Date().toISOString().split('T')[0];
        const lessonsToday = await getAll(
            `SELECT COUNT(*) as count FROM lessons WHERE DATE(created_at) = ? AND user_id = ?`,
            [today, userId]
        );

        // Count active assignments by this user
        const activeAssignments = await getAll(
            `SELECT COUNT(*) as count FROM assignments WHERE status = 'active' AND user_id = ?`,
            [userId]
        );

        // Count total students in classes created by this user
        const totalStudents = await getAll(
            `SELECT COUNT(*) as count FROM students s
             JOIN classes c ON s.class_id = c.id
             WHERE c.user_id = ?`,
            [userId]
        );

        // Count pending reviews (completed assignments by this user not yet graded)
        const pendingReviews = await getAll(
            `SELECT COUNT(*) as count FROM assignments WHERE status = 'completed' AND user_id = ?`,
            [userId]
        );

        res.json({
            lessonsToday: lessonsToday[0]?.count || 0,
            activeAssignments: activeAssignments[0]?.count || 0,
            totalStudents: totalStudents[0]?.count || 0,
            pendingReviews: pendingReviews[0]?.count || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get upcoming lessons
router.get('/upcoming-lessons', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const lessons = await getAll(
            `SELECT l.*, c.name as class_name 
             FROM lessons l 
             LEFT JOIN classes c ON l.grade = c.grade AND c.user_id = l.user_id
             WHERE l.user_id = ?
             ORDER BY l.created_at DESC
             LIMIT 5`,
             [userId]
        );

        res.json(lessons || []);
    } catch (error) {
        console.error('Upcoming lessons error:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming lessons' });
    }
});

module.exports = router;
