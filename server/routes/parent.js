/**
 * Parent Portal routes — no auth required for parents
 *
 * POST /api/parent/generate/:studentId  — teacher generates parent token (auth required)
 * GET  /api/parent/:token               — public: returns student progress for parents
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getOne, getAll, runQuery } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// ── Helper: generate unique 24-char token ──────────────────────
function makeToken() {
    return crypto.randomBytes(16).toString('base64url').slice(0, 24);
}

// ── POST /api/parent/generate/:studentId ──────────────────────
// Teacher generates (or retrieves) a parent access token for a student
router.post('/generate/:studentId', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const studentId = parseInt(req.params.studentId);

        // Verify this student belongs to a class owned by the teacher
        const student = await getOne(
            `SELECT s.*, c.user_id as teacher_id, c.name as class_name, c.subject
             FROM students s
             JOIN classes c ON c.id = s.class_id
             WHERE s.id = ? AND c.user_id = ?`,
            [studentId, teacherId]
        );
        if (!student) return res.status(404).json({ error: 'Ученик не найден или нет доступа' });

        // If token already exists, return it
        if (student.parent_token) {
            const baseUrl = process.env.FRONTEND_URL || 'https://urpaq.ai';
            return res.json({
                token: student.parent_token,
                url: `${baseUrl}/parent/${student.parent_token}`,
                student_name: student.name
            });
        }

        // Generate new token
        let token;
        let attempts = 0;
        do {
            token = makeToken();
            attempts++;
            if (attempts > 20) return res.status(500).json({ error: 'Не удалось создать токен' });
        } while (await getOne('SELECT id FROM students WHERE parent_token = ?', [token]));

        await runQuery('UPDATE students SET parent_token = ? WHERE id = ?', [token, studentId]);

        const baseUrl = process.env.FRONTEND_URL || 'https://urpaq.ai';
        res.json({
            token,
            url: `${baseUrl}/parent/${token}`,
            student_name: student.name
        });
    } catch (err) {
        console.error('Generate parent token error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/parent/revoke/:studentId ─────────────────────
// Teacher revokes a parent token
router.delete('/revoke/:studentId', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.userId;
        const studentId = parseInt(req.params.studentId);

        const student = await getOne(
            `SELECT s.id FROM students s JOIN classes c ON c.id = s.class_id
             WHERE s.id = ? AND c.user_id = ?`,
            [studentId, teacherId]
        );
        if (!student) return res.status(404).json({ error: 'Ученик не найден' });

        await runQuery('UPDATE students SET parent_token = NULL WHERE id = ?', [studentId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/parent/:token — public, no auth ─────────────────
// Returns student progress data for parents
router.get('/:token', async (req, res) => {
    try {
        const token = req.params.token;
        if (!token || token.length < 8) return res.status(400).json({ error: 'Неверный токен' });

        // Find student by parent_token
        const student = await getOne(
            `SELECT s.id, s.name, s.avg_grade, s.xp, s.level, s.status,
                    c.name as class_name, c.subject, c.grade as class_grade,
                    u.name as teacher_name
             FROM students s
             JOIN classes c ON c.id = s.class_id
             JOIN users u ON u.id = c.user_id
             WHERE s.parent_token = ?`,
            [token]
        );
        if (!student) return res.status(404).json({ error: 'Ссылка недействительна или устарела' });

        // Quiz attempts for this student
        const quizAttempts = await getAll(
            `SELECT qa.score, qa.max_score, qa.taken_at, qa.time_spent,
                    q.title as quiz_title, q.subject
             FROM quiz_attempts qa
             JOIN quizzes q ON q.id = qa.quiz_id
             WHERE qa.student_id = ?
             ORDER BY qa.taken_at DESC
             LIMIT 20`,
            [student.id]
        );

        // Assignment submissions for this student
        const submissions = await getAll(
            `SELECT asub.score, asub.max_score, asub.grade_label, asub.feedback,
                    asub.submitted_at, a.title as assignment_title, a.type
             FROM assignment_submissions asub
             JOIN assignments a ON a.id = asub.assignment_id
             WHERE asub.student_id = ?
             ORDER BY asub.submitted_at DESC
             LIMIT 20`,
            [student.id]
        );

        // Compute weekly performance (last 7 days of quiz attempts)
        const weekPerf = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        quizAttempts.forEach(a => {
            const d = new Date(a.taken_at); d.setHours(0, 0, 0, 0);
            const diff = Math.floor((today - d) / 86400000);
            if (diff >= 0 && diff < 7 && a.max_score > 0) {
                weekPerf[6 - diff] = Math.round((a.score / a.max_score) * 100);
            }
        });

        // Overall stats
        const totalAttempts = quizAttempts.length;
        const avgScore = totalAttempts > 0
            ? Math.round(quizAttempts.reduce((s, a) => s + (a.max_score > 0 ? (a.score / a.max_score) * 100 : 0), 0) / totalAttempts)
            : 0;
        const bestScore = totalAttempts > 0
            ? Math.max(...quizAttempts.map(a => a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0))
            : 0;

        res.json({
            student: {
                name: student.name,
                class_name: student.class_name,
                subject: student.subject,
                grade: student.class_grade,
                teacher_name: student.teacher_name,
                avg_grade: student.avg_grade || 0,
                xp: student.xp || 0,
                level: student.level || 1,
                status: student.status || 'active',
            },
            stats: { totalAttempts, avgScore, bestScore },
            weeklyPerformance: weekPerf,
            quizAttempts: quizAttempts.slice(0, 10),
            submissions: submissions.slice(0, 10),
        });
    } catch (err) {
        console.error('Parent portal error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
