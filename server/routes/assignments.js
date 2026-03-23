const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

const router = express.Router();

// GET all assignments
router.get('/', async (req, res) => {
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

        const assignments = await getAll(sql, params);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single assignment
router.get('/:id', async (req, res) => {
    try {
        const assignment = await getOne(`
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
router.post('/', async (req, res) => {
    try {
        const { title, type, class_id, due_date, total } = req.body;

        await runQuery(`
      INSERT INTO assignments (title, type, class_id, due_date, total, submitted, status)
      VALUES (?, ?, ?, ?, ?, 0, 'active')
    `, [title, type || 'homework', parseInt(class_id), due_date, total || 0]);

        const id = await getLastInsertId();
        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [id]);
        res.status(201).json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update assignment
router.put('/:id', async (req, res) => {
    try {
        const { title, type, class_id, due_date, submitted, total, status } = req.body;

        await runQuery(`
      UPDATE assignments 
      SET title = ?, type = ?, class_id = ?, due_date = ?, submitted = ?, total = ?, status = ?
      WHERE id = ?
    `, [title, type, parseInt(class_id), due_date, submitted, total, status, parseInt(req.params.id)]);

        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [parseInt(req.params.id)]);
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE assignment
router.delete('/:id', async (req, res) => {
    try {
        await runQuery('DELETE FROM assignments WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
