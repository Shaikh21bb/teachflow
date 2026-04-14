const express = require('express');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, assignmentSchema } = require('../middleware/validate');

const router = express.Router();

// All assignment routes require authentication
router.use(authenticateToken);

// GET all assignments (scoped to current teacher)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const params = [req.user.userId];

        let sql = `
            SELECT a.*, c.name as class_name
            FROM assignments a
            LEFT JOIN classes c ON a.class_id = c.id
            WHERE a.user_id = ?
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

// GET single assignment (must belong to current teacher)
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const assignment = await getOne(
            `SELECT a.*, c.name as class_name
             FROM assignments a
             LEFT JOIN classes c ON a.class_id = c.id
             WHERE a.id = ? AND a.user_id = ?`,
            [id, req.user.userId]
        );

        if (!assignment) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create assignment (with Zod validation)
router.post('/', validate(assignmentSchema), async (req, res) => {
    try {
        const { title, type, class_id, due_date } = req.body;

        // Verify class belongs to this teacher
        const cls = await getOne(
            'SELECT id FROM classes WHERE id = ? AND user_id = ?',
            [class_id, req.user.userId]
        );
        if (!cls) {
            return res.status(403).json({ error: 'Класс не найден или не принадлежит вам' });
        }

        await runQuery(
            `INSERT INTO assignments (title, type, class_id, due_date, total, submitted, status, user_id)
             VALUES (?, ?, ?, ?, 0, 0, 'active', ?)`,
            [title, type, class_id, due_date || null, req.user.userId]
        );

        const id = await getLastInsertId();
        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [id]);
        res.status(201).json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update assignment (must belong to current teacher)
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const existing = await getOne(
            'SELECT id FROM assignments WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (!existing) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        const { title, type, class_id, due_date, submitted, total, status } = req.body;

        await runQuery(
            `UPDATE assignments
             SET title = ?, type = ?, class_id = ?, due_date = ?, submitted = ?, total = ?, status = ?
             WHERE id = ? AND user_id = ?`,
            [title, type, parseInt(class_id, 10), due_date, submitted, total, status, id, req.user.userId]
        );

        const assignment = await getOne('SELECT * FROM assignments WHERE id = ?', [id]);
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE assignment (must belong to current teacher)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID задания' });

        const existing = await getOne(
            'SELECT id FROM assignments WHERE id = ? AND user_id = ?',
            [id, req.user.userId]
        );
        if (!existing) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        await runQuery('DELETE FROM assignments WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
