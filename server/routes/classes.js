const express = require('express');
const { getOne, getAll, runQuery, withTransaction } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { checkClassLimit } = require('../middleware/planMiddleware');
const { validate, classSchema } = require('../middleware/validate');

const router = express.Router();
const studentFields = 'id, name, email, class_id, avg_grade, status, username, avatar_color, xp, level, created_at';
router.use(authenticateToken);

router.get('/', async (req, res, next) => {
    try {
        res.json(await getAll(`SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
            FROM classes c WHERE c.user_id = ? ORDER BY c.name`, [req.user.userId]));
    } catch (error) { next(error); }
});

router.post('/', checkClassLimit, validate(classSchema), async (req, res, next) => {
    try {
        const { name, subject = '', grade = null } = req.body;
        const result = await runQuery('INSERT INTO classes (name, subject, grade, user_id) VALUES (?, ?, ?, ?)',
            [name, subject, grade, req.user.userId]);
        res.status(201).json(await getOne('SELECT * FROM classes WHERE id = ?', [Number(result.lastInsertRowid)]));
    } catch (error) { next(error); }
});

// All nested operations must pass the same ownership check.
router.use('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Неверный ID класса' });
        req.classInfo = await getOne('SELECT * FROM classes WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        if (!req.classInfo) return res.status(404).json({ error: 'Класс не найден' });
        next();
    } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const students = await getAll(`SELECT ${studentFields} FROM students WHERE class_id = ? ORDER BY name`, [req.classInfo.id]);
        res.json({ ...req.classInfo, students });
    } catch (error) { next(error); }
});
router.get('/:id/students', async (req, res, next) => {
    try { res.json(await getAll(`SELECT ${studentFields} FROM students WHERE class_id = ? ORDER BY name`, [req.classInfo.id])); }
    catch (error) { next(error); }
});
router.post('/:id/students', async (req, res, next) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        if (!name || name.length > 100 || email.length > 200) return res.status(400).json({ error: 'Укажите имя ученика (до 100 символов)' });
        const result = await runQuery('INSERT INTO students (name, email, class_id) VALUES (?, ?, ?)', [name, email, req.classInfo.id]);
        res.status(201).json(await getOne(`SELECT ${studentFields} FROM students WHERE id = ?`, [Number(result.lastInsertRowid)]));
    } catch (error) { next(error); }
});
router.put('/:id', validate(classSchema), async (req, res, next) => {
    try {
        const { name, subject = '', grade = null } = req.body;
        await runQuery('UPDATE classes SET name = ?, subject = ?, grade = ? WHERE id = ? AND user_id = ?', [name, subject, grade, req.classInfo.id, req.user.userId]);
        res.json(await getOne('SELECT * FROM classes WHERE id = ?', [req.classInfo.id]));
    } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await runQuery('DELETE FROM classes WHERE id = ? AND user_id = ?', [req.classInfo.id, req.user.userId]);
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.delete('/:id/students/:studentId', async (req, res, next) => {
    try {
        const found = await withTransaction(async transaction => {
            const args = [Number(req.params.studentId), req.classInfo.id];
            const student = (await transaction.execute({ sql: 'SELECT password_hash FROM students WHERE id = ? AND class_id = ?', args })).rows[0];
            if (!student) return false;
            await transaction.execute({ sql: student.password_hash ? 'UPDATE students SET class_id = NULL WHERE id = ? AND class_id = ?' : 'DELETE FROM students WHERE id = ? AND class_id = ?', args });
            return true;
        });
        if (!found) return res.status(404).json({ error: 'Ученик не найден' });
        res.json({ success: true });
    } catch (error) { next(error); }
});
module.exports = router;
