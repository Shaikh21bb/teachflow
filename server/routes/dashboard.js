const express = require('express');
const router = express.Router();
const { getOne, getAll } = require('../db/database');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Count lessons for today
        const today = new Date().toISOString().split('T')[0];
        const lessonsToday = await getAll(
            `SELECT COUNT(*) as count FROM lessons WHERE DATE(created_at) = ?`,
            [today]
        );

        // Count active assignments
        const activeAssignments = await getAll(
            `SELECT COUNT(*) as count FROM assignments WHERE status = 'active'`
        );

        // Count total students
        const totalStudents = await getAll(
            `SELECT COUNT(*) as count FROM students`
        );

        // Count pending reviews (completed assignments not yet graded)
        const pendingReviews = await getAll(
            `SELECT COUNT(*) as count FROM assignments WHERE status = 'completed'`
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
router.get('/upcoming-lessons', async (req, res) => {
    try {
        const lessons = await getAll(
            `SELECT l.*, c.name as class_name 
             FROM lessons l 
             LEFT JOIN classes c ON l.grade = c.grade 
             ORDER BY l.created_at DESC
             LIMIT 5`
        );

        res.json(lessons || []);
    } catch (error) {
        console.error('Upcoming lessons error:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming lessons' });
    }
});

module.exports = router;
