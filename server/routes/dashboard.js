const express = require('express');
const router = express.Router();
const { getOne, getAll } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Run all 4 queries IN PARALLEL — was 4 sequential round-trips, now 1 batch
        const [lessonsToday, activeAssignments, totalStudents, pendingReviews,
               totalLessons, totalClasses, totalAssignments] = await Promise.all([
            getOne(`SELECT COUNT(*) as count FROM lessons WHERE DATE(created_at) = ? AND user_id = ?`, [today, userId]),
            getOne(`SELECT COUNT(*) as count FROM assignments WHERE status = 'active' AND user_id = ?`, [userId]),
            getOne(`SELECT COUNT(*) as count FROM students s JOIN classes c ON s.class_id = c.id WHERE c.user_id = ?`, [userId]),
            getOne(`SELECT COUNT(*) as count FROM assignments WHERE status = 'completed' AND user_id = ?`, [userId]),
            getOne(`SELECT COUNT(*) as count FROM lessons WHERE user_id = ? AND is_archived = 0`, [userId]),
            getOne(`SELECT COUNT(*) as count FROM classes WHERE user_id = ?`, [userId]),
            getOne(`SELECT COUNT(*) as count FROM assignments WHERE user_id = ?`, [userId]),
        ]);

        res.json({
            lessonsToday:       Number(lessonsToday?.count)      || 0,
            activeAssignments:  Number(activeAssignments?.count) || 0,
            totalStudents:      Number(totalStudents?.count)      || 0,
            pendingReviews:     Number(pendingReviews?.count)     || 0,
            totalLessons:       Number(totalLessons?.count)       || 0,
            totalClasses:       Number(totalClasses?.count)       || 0,
            totalAssignments:   Number(totalAssignments?.count)   || 0,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get upcoming lessons
router.get('/upcoming-lessons', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
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
