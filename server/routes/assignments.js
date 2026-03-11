const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

const router = express.Router();

// GET all assignments
router.get('/', (req, res) => {
    try {
        const { status } = req.query;
        const params = [];

        let sql = `
      SELECT a.*, c.name as class_name 
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;

        if (status && status !== 'all') {
            sql += ` AND a.status = ?`;
            params.push(status);
        }

        sql += ' ORDER BY a.due_date ASC';

        const assignments = getAll(sql, params);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single assignment
router.get('/:id', (req, res) => {
    try {
        const assignment = getOne(`
      SELECT a.*, c.name as class_name 
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE a.id = ?
    `, [parseInt(req.params.id)]);

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create assignment
router.post('/', (req, res) => {
    try {
        const { title, type, class_id, due_date, total } = req.body;

        runQuery(`
      INSERT INTO assignments (title, type, class_id, due_date, total, submitted, status)
      VALUES (?, ?, ?, ?, ?, 0, 'active')
    `, [title, type || 'homework', parseInt(class_id), due_date, total || 0]);

        const id = getLastInsertId();
        const assignment = getOne('SELECT * FROM assignments WHERE id = ?', [id]);
        res.status(201).json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update assignment
router.put('/:id', (req, res) => {
    try {
        const { title, type, class_id, due_date, submitted, total, status } = req.body;

        runQuery(`
      UPDATE assignments 
      SET title = ?, type = ?, class_id = ?, due_date = ?, submitted = ?, total = ?, status = ?
      WHERE id = ?
    `, [title, type, parseInt(class_id), due_date, submitted, total, status, parseInt(req.params.id)]);

        const assignment = getOne('SELECT * FROM assignments WHERE id = ?', [parseInt(req.params.id)]);
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE assignment
router.delete('/:id', (req, res) => {
    try {
        runQuery('DELETE FROM assignments WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
