const express = require('express');
const router = express.Router();
const { runQuery, getAll, getOne } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { chatWithAI } = require('../utils/aiProviders');

// All routes require auth
router.use(authenticateToken);

/**
 * GET /api/quizzes
 */
router.get('/', async (req, res) => {
    try {
        const quizzes = await getAll(
            `SELECT q.*, 
                (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id) as attempts_count
             FROM quizzes q
             WHERE q.user_id = ?
             ORDER BY q.created_at DESC`,
            [req.user.id]
        );
        res.json(quizzes.map(q => ({ ...q, questions: JSON.parse(q.questions || '[]') })));
    } catch (err) {
        console.error('Get quizzes error:', err);
        res.status(500).json({ error: 'Не удалось получить тесты' });
    }
});

/**
 * POST /api/quizzes
 */
router.post('/', async (req, res) => {
    try {
        const { title, subject, grade, questions, time_limit, description } = req.body;
        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'Название и хотя бы один вопрос обязательны' });
        }
        const result = await runQuery(
            `INSERT INTO quizzes (title, subject, grade, questions, time_limit, description, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, subject || '', grade || '', JSON.stringify(questions), time_limit || null, description || '', req.user.id]
        );
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ?', [result.lastID]);
        res.status(201).json({ ...quiz, questions: JSON.parse(quiz.questions || '[]') });
    } catch (err) {
        console.error('Create quiz error:', err);
        res.status(500).json({ error: 'Не удалось создать тест: ' + err.message });
    }
});

// ===== IMPORTANT: specific named routes BEFORE /:id =====

/**
 * POST /api/quizzes/ai-generate
 * MUST be before /:id routes
 */
router.post('/ai-generate', async (req, res) => {
    try {
        const { topic, subject, grade, question_count = 5, language = 'ru' } = req.body;
        if (!topic) return res.status(400).json({ error: 'Тема обязательна' });

        const prompt = language === 'kk'
            ? `${grade ? grade + '-сынып' : ''} оқушыларына арналған "${topic}" тақырыбы бойынша ${subject ? subject + ' пәнінен' : ''} ${question_count} сұрақтан тұратын тест жаса. Әр сұрақта 4 нұсқа болсын (A, B, C, D). Дұрыс жауапты және қысқаша түсіндірмені көрсет. Тек JSON массиві: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]. Тек JSON, ешқандай түсіндірме жоқ!`
            : `Создай тест из ${question_count} вопросов по теме "${topic}"${subject ? ` (предмет: ${subject})` : ''}${grade ? ` для ${grade} класса` : ''}. Каждый вопрос с 4 вариантами ответов (A, B, C, D). Укажи правильный ответ и краткое объяснение. Только JSON массив: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]. Только JSON, без пояснений!`;

        const raw = await chatWithAI(prompt, [], language);

        let questions = [];
        try {
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
        } catch {
            questions = [];
        }

        if (questions.length === 0) {
            return res.status(500).json({ error: 'ИИ не смог сгенерировать вопросы. Попробуйте ещё раз.' });
        }

        res.json({ questions, topic, subject, grade, count: questions.length });
    } catch (err) {
        console.error('AI generate error:', err);
        res.status(500).json({ error: 'Ошибка генерации ИИ: ' + err.message });
    }
});

/**
 * GET /api/quizzes/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const quiz = await getOne(
            `SELECT q.*, u.name as teacher_name FROM quizzes q JOIN users u ON q.user_id = u.id WHERE q.id = ?`,
            [req.params.id]
        );
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });
        res.json({ ...quiz, questions: JSON.parse(quiz.questions || '[]') });
    } catch (err) {
        console.error('Get quiz error:', err);
        res.status(500).json({ error: 'Не удалось получить тест' });
    }
});

/**
 * PUT /api/quizzes/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { title, subject, grade, questions, time_limit, description, is_active } = req.body;
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });

        await runQuery(
            `UPDATE quizzes SET title=?, subject=?, grade=?, questions=?, time_limit=?, description=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [
                title || quiz.title,
                subject !== undefined ? subject : quiz.subject,
                grade !== undefined ? grade : quiz.grade,
                questions ? JSON.stringify(questions) : quiz.questions,
                time_limit !== undefined ? time_limit : quiz.time_limit,
                description !== undefined ? description : quiz.description,
                is_active !== undefined ? (is_active ? 1 : 0) : quiz.is_active,
                req.params.id
            ]
        );
        const updated = await getOne('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
        res.json({ ...updated, questions: JSON.parse(updated.questions || '[]') });
    } catch (err) {
        console.error('Update quiz error:', err);
        res.status(500).json({ error: 'Не удалось обновить тест' });
    }
});

/**
 * DELETE /api/quizzes/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });
        await runQuery('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete quiz error:', err);
        res.status(500).json({ error: 'Не удалось удалить тест' });
    }
});

/**
 * POST /api/quizzes/:id/attempts
 */
router.post('/:id/attempts', async (req, res) => {
    try {
        const { student_name, answers, score, max_score, time_spent } = req.body;
        if (!student_name || !answers) {
            return res.status(400).json({ error: 'Имя ученика и ответы обязательны' });
        }
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });

        const result = await runQuery(
            `INSERT INTO quiz_attempts (quiz_id, student_name, answers, score, max_score, time_spent)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, student_name, JSON.stringify(answers), score || 0, max_score || 0, time_spent || 0]
        );
        res.status(201).json({ id: result.lastID, quiz_id: req.params.id, student_name, score, max_score });
    } catch (err) {
        console.error('Submit attempt error:', err);
        res.status(500).json({ error: 'Не удалось сохранить результат' });
    }
});

/**
 * GET /api/quizzes/:id/attempts
 */
router.get('/:id/attempts', async (req, res) => {
    try {
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });

        const attempts = await getAll(
            `SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY taken_at DESC`,
            [req.params.id]
        );
        res.json(attempts.map(a => ({ ...a, answers: JSON.parse(a.answers || '[]') })));
    } catch (err) {
        console.error('Get attempts error:', err);
        res.status(500).json({ error: 'Не удалось получить результаты' });
    }
});

/**
 * GET /api/quizzes/:id/report
 */
router.get('/:id/report', async (req, res) => {
    try {
        const quiz = await getOne('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!quiz) return res.status(404).json({ error: 'Тест не найден' });

        const attempts = await getAll(
            `SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY taken_at DESC`,
            [req.params.id]
        );

        const parsedAttempts = attempts.map(a => ({ ...a, answers: JSON.parse(a.answers || '[]') }));
        const questions = JSON.parse(quiz.questions || '[]');

        const scores = parsedAttempts.map(a => a.max_score > 0 ? (a.score / a.max_score) * 100 : 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const maxScore = scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
        const minScore = scores.length > 0 ? Math.round(Math.min(...scores)) : 0;
        const passCount = scores.filter(s => s >= 60).length;

        const questionStats = questions.map((q, qIdx) => {
            const correctCount = parsedAttempts.filter(a => {
                const ans = a.answers[qIdx];
                return ans && ans === q.correct;
            }).length;
            return {
                question: q.question,
                correct_rate: parsedAttempts.length > 0
                    ? Math.round((correctCount / parsedAttempts.length) * 100)
                    : 0,
                correct_count: correctCount,
                total: parsedAttempts.length
            };
        });

        res.json({
            quiz: { ...quiz, questions },
            stats: { avgScore, maxScore, minScore, total: parsedAttempts.length, passCount },
            question_stats: questionStats,
            attempts: parsedAttempts
        });
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ error: 'Не удалось сформировать отчёт' });
    }
});

module.exports = router;
