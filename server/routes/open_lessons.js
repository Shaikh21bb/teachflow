const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { authenticateToken } = require('./auth');
const { chatWithAI } = require('../utils/aiProviders');

// GET all open lessons for current teacher
router.get('/', authenticateToken, async (req, res) => {
    try {
        const lessons = await getAll(
            `SELECT ol.*, c.name as class_name 
             FROM open_lessons ol
             LEFT JOIN classes c ON c.id = ol.class_id
             WHERE ol.user_id = ?
             ORDER BY ol.created_at DESC`,
            [req.user.userId]
        );
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single open lesson with teams
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const lesson = await getOne(
            `SELECT ol.*, c.name as class_name
             FROM open_lessons ol
             LEFT JOIN classes c ON c.id = ol.class_id
             WHERE ol.id = ? AND ol.user_id = ?`,
            [parseInt(req.params.id), req.user.userId]
        );

        if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

        const teams = await getAll(
            'SELECT * FROM lesson_teams WHERE open_lesson_id = ? ORDER BY id',
            [parseInt(req.params.id)]
        );

        // Parse student_ids JSON for each team
        const parsedTeams = teams.map(t => ({
            ...t,
            student_ids: (() => { try { return JSON.parse(t.student_ids || '[]'); } catch { return []; } })()
        }));

        res.json({ ...lesson, teams: parsedTeams });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST generate AI plan for open lesson
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { title, subject, grade, topic, objectives, language = 'ru', numTeams = 4 } = req.body;

        if (!title || !subject || !topic) {
            return res.status(400).json({ error: 'Название, предмет и тема обязательны' });
        }

        const prompt = language === 'kk'
            ? `Сен тәжірибелі мұғалімсің. ${grade || ''}-сынып, "${subject}" пәні бойынша "${title}" деп аталатын ашық сабақтың толық жоспарын жаз.
Тақырып: ${topic}
Мақсаттар: ${objectives || 'жалпы мақсаттар'}
Командалар саны: ${numTeams}

Мына форматта жаз (JSON емес, тек мәтін):

🎯 САБАҚТЫҢ МАҚСАТТАРЫ:
(3-4 нақты мақсат)

📋 САБАҚТЫҢ БАРЫСЫ:
1. Ұйымдастыру кезеңі (5 мин): ...
2. Жаңа тақырыпты меңгеру (15 мин): ...
3. Командалық жұмыс (15 мин): ...
4. Нәтижені бекіту (5 мин): ...
5. Қорытынды (5 мин): ...

👥 КОМАНДАЛАРҒА ТАПСЫРМАЛАР (${numTeams} команда):
Команда 1: ...
Команда 2: ...
Команда 3: ...
Команда 4: ...

📊 БАҒАЛАУ КРИТЕРИЙЛЕРІ:
- ...

💡 МҰҒАЛІМГЕ КЕҢЕСТЕР:
- ...`
            : `Ты опытный учитель. Напиши полный план открытого урока "${title}" по предмету "${subject}"${grade ? ` для ${grade} класса` : ''}.
Тема урока: ${topic}
Цели: ${objectives || 'общие образовательные цели'}
Количество команд: ${numTeams}

Напиши в таком формате (не JSON, только текст):

🎯 ЦЕЛИ УРОКА:
(3-4 конкретные цели)

📋 ХОД УРОКА:
1. Организационный момент (5 мин): ...
2. Изучение новой темы (15 мин): ...
3. Командная работа (15 мин): ...
4. Закрепление (5 мин): ...
5. Подведение итогов (5 мин): ...

👥 ЗАДАНИЯ ДЛЯ КОМАНД (${numTeams} команды):
Команда 1: ...
Команда 2: ...
Команда 3: ...
Команда 4: ...

📊 КРИТЕРИИ ОЦЕНИВАНИЯ:
- ...

💡 СОВЕТЫ УЧИТЕЛЮ:
- ...`;

        const aiContent = await chatWithAI(prompt, [], language);

        res.json({ content: aiContent });
    } catch (err) {
        console.error('AI generate error:', err);
        res.status(500).json({ error: 'Ошибка генерации ИИ: ' + err.message });
    }
});

// POST save open lesson
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, subject, grade, topic, objectives, content, class_id } = req.body;

        await runQuery(
            `INSERT INTO open_lessons (title, subject, grade, topic, objectives, content, class_id, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, subject, grade || null, topic, objectives, content, class_id || null, req.user.userId]
        );

        const id = await getLastInsertId();
        const lesson = await getOne('SELECT * FROM open_lessons WHERE id = ?', [id]);
        res.status(201).json(lesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update open lesson
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, subject, grade, topic, objectives, content, class_id } = req.body;

        await runQuery(
            `UPDATE open_lessons SET title=?, subject=?, grade=?, topic=?, objectives=?, content=?, class_id=?
             WHERE id = ? AND user_id = ?`,
            [title, subject, grade || null, topic, objectives, content, class_id || null,
             parseInt(req.params.id), req.user.userId]
        );

        const lesson = await getOne('SELECT * FROM open_lessons WHERE id = ?', [parseInt(req.params.id)]);
        res.json(lesson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST save teams for a lesson
router.post('/:id/teams', authenticateToken, async (req, res) => {
    try {
        const lessonId = parseInt(req.params.id);
        const { teams } = req.body; // array of { team_name, student_ids, task }

        // Delete existing teams first
        await runQuery('DELETE FROM lesson_teams WHERE open_lesson_id = ?', [lessonId]);

        // Insert new teams
        for (const team of teams) {
            await runQuery(
                'INSERT INTO lesson_teams (open_lesson_id, team_name, student_ids, task) VALUES (?, ?, ?, ?)',
                [lessonId, team.team_name, JSON.stringify(team.student_ids || []), team.task || '']
            );
        }

        const savedTeams = await getAll('SELECT * FROM lesson_teams WHERE open_lesson_id = ? ORDER BY id', [lessonId]);
        res.json(savedTeams.map(t => ({
            ...t,
            student_ids: (() => { try { return JSON.parse(t.student_ids || '[]'); } catch { return []; } })()
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE open lesson
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await runQuery('DELETE FROM open_lessons WHERE id = ? AND user_id = ?',
            [parseInt(req.params.id), req.user.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
