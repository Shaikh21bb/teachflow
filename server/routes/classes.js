const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

const router = express.Router();

// GET all classes
router.get('/', (req, res) => {
    try {
        const classes = getAll(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      ORDER BY c.name
    `);
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single class with students
router.get('/:id', (req, res) => {
    try {
        const classInfo = getOne('SELECT * FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        if (!classInfo) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const students = getAll('SELECT * FROM students WHERE class_id = ? ORDER BY name', [parseInt(req.params.id)]);

        res.json({ ...classInfo, students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET students of a class
router.get('/:id/students', (req, res) => {
    try {
        const students = getAll('SELECT * FROM students WHERE class_id = ? ORDER BY name', [parseInt(req.params.id)]);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create class
router.post('/', (req, res) => {
    try {
        const { name, subject, grade } = req.body;

        runQuery(`
      INSERT INTO classes (name, subject, grade)
      VALUES (?, ?, ?)
    `, [name, subject, grade]);

        const id = getLastInsertId();
        const classInfo = getOne('SELECT * FROM classes WHERE id = ?', [id]);
        res.status(201).json(classInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add student to class
router.post('/:id/students', (req, res) => {
    try {
        const { name, email } = req.body;

        runQuery(`
      INSERT INTO students (name, email, class_id)
      VALUES (?, ?, ?)
    `, [name, email, parseInt(req.params.id)]);

        const id = getLastInsertId();
        const student = getOne('SELECT * FROM students WHERE id = ?', [id]);
        res.status(201).json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update class
router.put('/:id', (req, res) => {
    try {
        const { name, subject, grade } = req.body;

        runQuery(`
      UPDATE classes SET name = ?, subject = ?, grade = ?
      WHERE id = ?
    `, [name, subject, grade, parseInt(req.params.id)]);

        const classInfo = getOne('SELECT * FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        res.json(classInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE class
router.delete('/:id', (req, res) => {
    try {
        runQuery('DELETE FROM classes WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE student
router.delete('/:classId/students/:studentId', (req, res) => {
    try {
        runQuery('DELETE FROM students WHERE id = ?', [parseInt(req.params.studentId)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
