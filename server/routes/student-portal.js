const express = require('express');
const router = express.Router();
const { runQuery, getAll, getOne, getLastInsertId } = require('../db/database');
const { authenticateStudent } = require('../middleware/studentAuth');
const { gradeAssignment } = require('../utils/assignmentGrader');
const { deductAICredits, getCreditBalance } = require('../middleware/planMiddleware');
const { getCreditCost } = require('../utils/creditCosts');

// All routes here require student authentication
router.use(authenticateStudent);

/**
 * GET /api/student/dashboard
 * Return student summary: rank, level, xp, and upcoming quizzes
 */
router.get('/dashboard', async (req, res) => {
    try {
        const studentId = req.student.studentId;
        const classId = req.student.classId;

        // Fetch student info
        const student = await getOne('SELECT * FROM students WHERE id = ?', [studentId]);
        
        // Fetch leaderboard rank (naive approach: count how many students have more XP)
        const rankInfo = await getOne(`
            SELECT COUNT(*) + 1 as rank 
            FROM students 
            WHERE class_id = ? AND xp > ?
        `, [classId, student.xp]);

        // Fetch assigned quizzes for the class that the student hasn't taken yet
        const upcomingQuizzes = await getAll(`
            SELECT qa.id as assignment_id, qa.deadline, q.id as quiz_id, q.title, q.subject, q.time_limit
            FROM quiz_assignments qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.class_id = ? 
              AND q.id NOT IN (SELECT quiz_id FROM quiz_attempts WHERE student_id = ?)
            ORDER BY qa.created_at DESC
        `, [classId, studentId]);

        const homeworkAssignments = await getAll(`
            SELECT a.id, a.title, a.type, a.instructions, a.due_date, a.max_score, c.subject,
                   sub.id as submission_id, sub.score, sub.max_score as submitted_max_score,
                   sub.grade_label, sub.feedback, sub.submitted_at
            FROM assignments a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN assignment_submissions sub
                ON sub.assignment_id = a.id AND sub.student_id = ?
            WHERE a.class_id = ?
              AND a.type IN ('homework', 'project', 'test')
            ORDER BY CASE WHEN sub.id IS NULL THEN 0 ELSE 1 END, a.due_date ASC, a.created_at DESC
        `, [studentId, classId]);

        // Fetch recent attempts
        const recentAttempts = await getAll(`
            SELECT qa.id, qa.score, qa.max_score, qa.taken_at, q.title, q.subject
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.student_id = ?
            ORDER BY qa.taken_at DESC
            LIMIT 5
        `, [studentId]);

        res.json({
            student: {
                ...student,
                rank: rankInfo.rank
            },
            upcomingQuizzes,
            homeworkAssignments,
            recentAttempts
        });

    } catch (err) {
        console.error('Student dashboard error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * GET /api/student-portal/assignments/:id
 * Retrieve one homework assignment for the logged-in student
 */
router.get('/assignments/:id', async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) return res.status(400).json({ error: 'Неверный ID задания' });

        const assignment = await getOne(`
            SELECT a.id, a.title, a.type, a.instructions, a.due_date, a.max_score, c.name as class_name, c.subject,
                   sub.id as submission_id, sub.answer_text, sub.score, sub.max_score as submitted_max_score,
                   sub.grade_label, sub.feedback, sub.mistakes, sub.submitted_at, sub.graded_at
            FROM assignments a
            JOIN classes c ON a.class_id = c.id
            LEFT JOIN assignment_submissions sub
                ON sub.assignment_id = a.id AND sub.student_id = ?
            WHERE a.id = ? AND a.class_id = ?
        `, [req.student.studentId, assignmentId, req.student.classId]);

        if (!assignment) {
            return res.status(404).json({ error: 'Тапсырма табылмады' });
        }

        res.json({
            ...assignment,
            mistakes: (() => {
                try { return JSON.parse(assignment.mistakes || '[]'); } catch { return []; }
            })()
        });
    } catch (err) {
        console.error('Get student assignment error:', err);
        res.status(500).json({ error: 'Не удалось загрузить задание' });
    }
});

/**
 * POST /api/student-portal/assignments/:id/submit
 * Submit homework and get automatic AI feedback
 */
router.post('/assignments/:id/submit', async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) return res.status(400).json({ error: 'Неверный ID задания' });

        const answerText = String(req.body.answer_text || '').trim();
        const language = req.body.language === 'ru' ? 'ru' : 'kk';
        if (answerText.length < 10) {
            return res.status(400).json({ error: language === 'kk' ? 'Жауап тым қысқа' : 'Ответ слишком короткий' });
        }
        if (answerText.length > 12000) {
            return res.status(400).json({ error: language === 'kk' ? 'Жауап тым ұзын' : 'Ответ слишком длинный' });
        }

        const assignment = await getOne(`
            SELECT a.*, c.subject
            FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = ? AND a.class_id = ?
        `, [assignmentId, req.student.classId]);

        if (!assignment) {
            return res.status(404).json({ error: language === 'kk' ? 'Тапсырма табылмады' : 'Задание не найдено' });
        }

        const creditCost = getCreditCost('homework_grading');
        const teacherBalance = await getCreditBalance(assignment.user_id);
        if (teacherBalance.credits < creditCost) {
            return res.status(403).json({
                error: language === 'kk'
                    ? 'Мұғалімнің AI кредиті жеткіліксіз. Кейінірек қайталап көріңіз.'
                    : 'У учителя недостаточно AI-кредитов. Попробуйте позже.',
                code: 'NO_AI_CREDITS',
                required: creditCost,
                remaining: teacherBalance.credits
            });
        }

        const student = await getOne('SELECT * FROM students WHERE id = ?', [req.student.studentId]);
        const grading = await gradeAssignment({ assignment, student, answerText, language });
        const charged = await deductAICredits(assignment.user_id, creditCost);
        if (!charged) {
            return res.status(403).json({
                error: language === 'kk'
                    ? 'Мұғалімнің AI кредиті жеткіліксіз. Кейінірек қайталап көріңіз.'
                    : 'У учителя недостаточно AI-кредитов. Попробуйте позже.',
                code: 'NO_AI_CREDITS'
            });
        }
        const updatedTeacherBalance = await getCreditBalance(assignment.user_id);

        await runQuery(`
            INSERT INTO assignment_submissions
                (assignment_id, student_id, answer_text, score, max_score, grade_label, feedback, mistakes, status, submitted_at, graded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'graded', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(assignment_id, student_id) DO UPDATE SET
                answer_text = excluded.answer_text,
                score = excluded.score,
                max_score = excluded.max_score,
                grade_label = excluded.grade_label,
                feedback = excluded.feedback,
                mistakes = excluded.mistakes,
                status = 'graded',
                submitted_at = CURRENT_TIMESTAMP,
                graded_at = CURRENT_TIMESTAMP
        `, [
            assignmentId,
            req.student.studentId,
            answerText,
            grading.score,
            grading.max_score,
            grading.grade_label,
            grading.feedback,
            JSON.stringify(grading.mistakes || [])
        ]);

        const counts = await getOne(`
            SELECT COUNT(*) as submitted
            FROM assignment_submissions
            WHERE assignment_id = ?
        `, [assignmentId]);

        const classTotal = await getOne('SELECT COUNT(*) as total FROM students WHERE class_id = ?', [req.student.classId]);
        await runQuery(
            `UPDATE assignments SET submitted = ?, total = ?, status = ? WHERE id = ?`,
            [
                Number(counts?.submitted || 0),
                Number(classTotal?.total || 0),
                Number(counts?.submitted || 0) >= Number(classTotal?.total || 0) ? 'graded' : 'completed',
                assignmentId
            ]
        );

        res.json({
            ...grading,
            answer_text: answerText,
            creditsCharged: creditCost,
            teacherCreditsRemaining: updatedTeacherBalance.credits,
            submitted_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Submit assignment error:', err);
        res.status(500).json({ error: 'Не удалось проверить домашнюю работу' });
    }
});

/**
 * GET /api/student/quizzes/:id
 * Retrieve quiz questions
 */
router.get('/quizzes/:id', async (req, res) => {
    try {
        const quizId = req.params.id;
        
        // Ensure this quiz is actually assigned to the student's class
        const assignment = await getOne(`
            SELECT * FROM quiz_assignments 
            WHERE quiz_id = ? AND class_id = ?
        `, [quizId, req.student.classId]);

        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);

        if (!quiz || !assignment) {
            return res.status(404).json({ error: 'Тест не найден или недоступен' });
        }

        // We should send questions but maybe without correct answer if we want strictness.
        // For now, we'll send the full questions JSON and trust the frontend, 
        // to simplify the flow and allow instant client-side feedback if needed.
        // It's better not to send answers, but given existing logic we'll just parse it.
        const questions = JSON.parse(quiz.questions || '[]');
        
        // Strip correct answers to prevent simple cheating
        const secureQuestions = questions.map(q => ({
            question: q.question,
            options: q.options
        }));

        res.json({
            id: quiz.id,
            title: quiz.title,
            subject: quiz.subject,
            time_limit: quiz.time_limit,
            description: quiz.description,
            questions: secureQuestions
        });

    } catch (err) {
        console.error('Get student quiz error:', err);
        res.status(500).json({ error: 'Не удалось загрузить тест' });
    }
});

/**
 * POST /api/student/quizzes/:id/submit
 * Submit quiz answers and award XP
 */
router.post('/quizzes/:id/submit', async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.student.studentId;
        const { answers, time_spent } = req.body; // Check against server questions

        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }

        const student = await getOne('SELECT * FROM students WHERE id = ?', [studentId]);

        const questions = JSON.parse(quiz.questions || '[]');
        let score = 0;
        const max_score = questions.length;

        questions.forEach((q, idx) => {
            if (answers[idx] === q.correct) {
                score++;
            }
        });

        // Calculate XP
        const xpGained = Math.round((score / max_score) * 100) + 10; // Base 10 XP for taking it
        
        await runQuery(
            `INSERT INTO quiz_attempts (quiz_id, student_id, student_name, answers, score, max_score, time_spent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [quizId, studentId, student.name, JSON.stringify(answers), score, max_score, time_spent || 0]
        );

        // Update student XP and level
        const newXp = student.xp + xpGained;
        const newLevel = Math.floor(newXp / 100) + 1; // 100 XP per level

        await runQuery(
            `UPDATE students SET xp = ?, level = ? WHERE id = ?`,
            [newXp, newLevel, studentId]
        );

        res.json({
            score,
            max_score,
            xpGained,
            newXp,
            newLevel,
            correctAnswers: questions.map(q => q.correct)
        });

    } catch (err) {
        console.error('Submit quiz error:', err);
        res.status(500).json({ error: 'Не удалось сохранить результаты' });
    }
});

/**
 * GET /api/student/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const classId = req.student.classId;

        const students = await getAll(`
            SELECT id, name, username, avatar_color, xp, level
            FROM students
            WHERE class_id = ?
            ORDER BY xp DESC, name ASC
        `, [classId]);

        res.json({ leaderboard: students });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Не удалось загрузить таблицу лидеров' });
    }
});

module.exports = router;
