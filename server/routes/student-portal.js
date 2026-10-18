const express = require('express');
const router = express.Router();
const { runQuery, getAll, getOne, withTransaction } = require('../db/database');
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
        const student = await getOne('SELECT id, name, username, class_id, avatar_color, xp, level FROM students WHERE id = ?', [studentId]);
        
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
                   sub.grade_label, sub.feedback, sub.status as submission_status, sub.submitted_at
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
                   sub.grade_label, sub.feedback, sub.mistakes, sub.status, sub.submitted_at, sub.graded_at
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
        if (!answerText.length) {
            return res.status(400).json({ error: language === 'kk' ? 'Жауап тым қысқа' : 'Ответ слишком короткий' });
        }
        if (answerText.length > 6000) {
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
        const student = await getOne('SELECT id, name FROM students WHERE id = ?', [req.student.studentId]);
        const previous = await getOne('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignmentId, student.id]);
        if (previous?.answer_text === answerText) {
            return res.json({ ...previous, mistakes: JSON.parse(previous.mistakes || '[]'), creditsCharged: 0 });
        }
        const grading = teacherBalance.credits >= creditCost
            ? await gradeAssignment({ assignment, student, answerText, language })
            : { score: null, max_score: assignment.max_score, grade_label: null, mistakes: [], provider: 'pending',
                feedback: language === 'kk' ? 'Жауап сақталды. Мұғалімнің тексеруін күтуде.' : 'Ответ сохранён и ожидает проверки учителем.' };
        const isAI = grading.provider !== 'pending';
        const result = await withTransaction(async transaction => {
            // Deduct only when an actual AI assessment can be saved in the same transaction.
            if (isAI) {
                const debit = await transaction.execute({ sql: 'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?', args: [creditCost, assignment.user_id, creditCost] });
                if (!debit.rowsAffected) throw Object.assign(new Error('Кредиты закончились. Отправьте ответ ещё раз для проверки учителем.'), { status: 409 });
            }
            await transaction.execute({
                sql: `INSERT INTO assignment_submissions
                    (assignment_id, student_id, answer_text, score, max_score, grade_label, feedback, mistakes, status, submitted_at, graded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                    ON CONFLICT(assignment_id, student_id) DO UPDATE SET
                    answer_text = excluded.answer_text, score = excluded.score, max_score = excluded.max_score,
                    grade_label = excluded.grade_label, feedback = excluded.feedback, mistakes = excluded.mistakes,
                    status = excluded.status, submitted_at = CURRENT_TIMESTAMP, graded_at = excluded.graded_at`,
                args: [assignmentId, student.id, answerText, grading.score, grading.max_score, grading.grade_label,
                    grading.feedback, JSON.stringify(grading.mistakes || []), isAI ? 'graded' : 'pending', isAI ? new Date().toISOString() : null],
            });
            await transaction.execute({ sql: `UPDATE assignments SET
                submitted = (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = ?),
                total = (SELECT COUNT(*) FROM students WHERE class_id = ?),
                status = CASE WHEN EXISTS (SELECT 1 FROM assignment_submissions WHERE assignment_id = ? AND status = 'pending')
                    THEN 'completed'
                    WHEN (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = ?) >= (SELECT COUNT(*) FROM students WHERE class_id = ?)
                    THEN 'graded' ELSE 'active' END WHERE id = ?`,
                args: [assignmentId, req.student.classId, assignmentId, assignmentId, req.student.classId, assignmentId] });
            return { ...grading, status: isAI ? 'graded' : 'pending', answer_text: answerText, creditsCharged: isAI ? creditCost : 0, submitted_at: new Date().toISOString() };
        });
        res.json(result);

        // ── Notify teacher via in-app + Telegram ─────────────
        try {
            const { createNotification } = require('./notifications');
            const student = await getOne('SELECT name FROM students WHERE id = ?', [req.student.studentId]);
            await createNotification(
                assignment.user_id,
                'success',
                `${student?.name || 'Ученик'} сдал задание "${assignment.title}" — ${grading.provider === 'pending' ? 'ожидает проверки' : grading.grade_label || grading.score + '/' + grading.max_score}`
            );
            // Telegram push to teacher
            const { decrypt } = require('../utils/encryption');
            const { sendMessage } = require('../utils/telegram');
            const integration = await getOne(
                'SELECT encrypted_token, chat_id FROM integrations WHERE user_id = ? AND type = ? AND is_active = 1',
                [assignment.user_id, 'telegram']
            );
            if (integration?.chat_id) {
                const botToken = decrypt(integration.encrypted_token);
                const msg = `✅ *Жаңа жұмыс тапсырылды*\n\n👤 ${student?.name || 'Оқушы'}\n📝 ${assignment.title}\n📊 Баға: *${grading.grade_label || grading.score + '/' + grading.max_score}*`;
                sendMessage(botToken, integration.chat_id, msg).catch(() => {});
            }
        } catch { /* silent */ }
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

        if (!quiz || !assignment || !quiz.is_active) {
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
            options: q.options,
            time_limit: Number(q.time_limit) || null
        }));
        if (!secureQuestions.length) return res.status(400).json({ error: 'В тесте пока нет вопросов' });

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
router.post('/quizzes/:id/submit', async (req, res, next) => {
    try {
        const quizId = Number(req.params.id);
        const studentId = req.student.studentId;
        const { answers, time_spent = 0 } = req.body;
        if (!Array.isArray(answers) || answers.length > 100 || !answers.every(answer => answer === null || typeof answer === 'string')) {
            return res.status(400).json({ error: 'Неверный формат ответов' });
        }
        const result = await withTransaction(async transaction => {
            const quiz = (await transaction.execute({
                sql: `SELECT q.*, qa.deadline FROM quizzes q JOIN quiz_assignments qa ON qa.quiz_id = q.id
                    JOIN classes c ON c.id = qa.class_id AND c.user_id = q.user_id
                    WHERE q.id = ? AND qa.class_id = ? AND q.is_active = 1`, args: [quizId, req.student.classId]
            })).rows[0];
            if (!quiz) throw Object.assign(new Error('Тест недоступен'), { status: 404 });
            if (quiz.deadline && Date.now() > new Date(quiz.deadline.length === 10 ? quiz.deadline + 'T23:59:59' : quiz.deadline).getTime()) {
                throw Object.assign(new Error('Срок сдачи теста истёк'), { status: 400 });
            }
            const prior = (await transaction.execute({ sql: 'SELECT id FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?', args: [quizId, studentId] })).rows[0];
            if (prior) throw Object.assign(new Error('Вы уже сдали этот тест'), { status: 409 });
            const questions = JSON.parse(quiz.questions || '[]');
            if (!questions.length || answers.length !== questions.length) throw Object.assign(new Error('Неверное число ответов'), { status: 400 });
            const student = (await transaction.execute({ sql: 'SELECT id, name, xp FROM students WHERE id = ?', args: [studentId] })).rows[0];
            const score = questions.reduce((sum, question, index) => sum + (String(answers[index] ?? '').trim().toUpperCase() === String(question.correct).trim().toUpperCase() ? 1 : 0), 0);
            const max_score = questions.length;
            const xpGained = Math.round(score / max_score * 100) + 10;
            const spent = Number.isFinite(Number(time_spent)) ? Math.max(0, Math.min(86400, Math.round(Number(time_spent)))) : 0;
            await transaction.execute({
                sql: 'INSERT INTO quiz_attempts (quiz_id, student_id, student_name, answers, score, max_score, time_spent) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [quizId, studentId, student.name, JSON.stringify(answers), score, max_score, spent]
            });
            const newXp = Number(student.xp || 0) + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;
            await transaction.execute({ sql: 'UPDATE students SET xp = ?, level = ? WHERE id = ?', args: [newXp, newLevel, studentId] });
            return { score, max_score, xpGained, newXp, newLevel, correctAnswers: questions.map(question => question.correct) };
        });
        res.json(result);
    } catch (error) { next(error); }
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
