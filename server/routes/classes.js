const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET all classes
router.get('/', authenticateToken, async (req, res) => {
    try {
        const classes = await getAll(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      WHERE c.user_id = ?
      ORDER BY c.name
    `, [req.user.userId]);
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single class with students
router.get('/:id', async (req, res) => {
    try {
        const classInfo = await getOne('SELECT * FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        if (!classInfo) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const students = await getAll('SELECT * FROM students WHERE class_id = ? ORDER BY name', [parseInt(req.params.id)]);

        res.json({ ...classInfo, students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET students of a class
router.get('/:id/students', async (req, res) => {
    try {
        const students = await getAll('SELECT * FROM students WHERE class_id = ? ORDER BY name', [parseInt(req.params.id)]);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create class
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, subject, grade } = req.body;

        await runQuery(`
      INSERT INTO classes (name, subject, grade, user_id)
      VALUES (?, ?, ?, ?)
    `, [name, subject, grade, req.user.userId]);

        const id = await getLastInsertId();
        const classInfo = await getOne('SELECT * FROM classes WHERE id = ?', [id]);
        res.status(201).json(classInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add student to class
router.post('/:id/students', async (req, res) => {
    try {
        const { name, email } = req.body;

        await runQuery(`
      INSERT INTO students (name, email, class_id)
      VALUES (?, ?, ?)
    `, [name, email, parseInt(req.params.id)]);

        const id = await getLastInsertId();
        const student = await getOne('SELECT * FROM students WHERE id = ?', [id]);
        res.status(201).json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update class
router.put('/:id', async (req, res) => {
    try {
        const { name, subject, grade } = req.body;

        await runQuery(`
      UPDATE classes SET name = ?, subject = ?, grade = ?
      WHERE id = ?
    `, [name, subject, grade, parseInt(req.params.id)]);

        const classInfo = await getOne('SELECT * FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        res.json(classInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE class
router.delete('/:id', async (req, res) => {
    try {
        await runQuery('DELETE FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE student
router.delete('/:classId/students/:studentId', async (req, res) => {
    try {
        await runQuery('DELETE FROM students WHERE id = ?', [parseInt(req.params.studentId)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
