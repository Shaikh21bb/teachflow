const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getOne } = require('../db/database');
const { authenticateStudent } = require('../middleware/studentAuth');

const JWT_SECRET = process.env.JWT_SECRET || '';

// POST /api/student/register
router.post('/register', async (req, res) => {
    try {
        const { invite_code, username, password, name } = req.body;
        
        if (!invite_code || !username || !password || !name) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        // Find class by invite code
        const classRow = await getOne(
            'SELECT * FROM classes WHERE telegram_invite_code = ? OR telegram_invite_code = ?', 
            [invite_code, invite_code.trim()]
        );

        if (!classRow) {
            return res.status(404).json({ error: 'Неверный код приглашения' });
        }

        // Check if username exists
        const existingStudent = await getOne('SELECT * FROM students WHERE username = ?', [username]);
        if (existingStudent) {
            return res.status(400).json({ error: 'Имя пользователя уже занято' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        const avatar_color = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)];

        const result = await runQuery(
            `INSERT INTO students (name, class_id, username, password_hash, avatar_color)
             VALUES (?, ?, ?, ?, ?)`,
            [name, classRow.id, username, password_hash, avatar_color]
        );

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Student register error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: err.message });
    }
});

// POST /api/student/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
        }

        const student = await getOne('SELECT * FROM students WHERE username = ?', [username]);
        
        if (!student || !student.password_hash) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        const isValid = await bcrypt.compare(password, student.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        const token = jwt.sign(
            { 
                studentId: student.id, 
                classId: student.class_id, 
                role: 'student',
                username: student.username
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            student: {
                id: student.id,
                name: student.name,
                username: student.username,
                avatar_color: student.avatar_color,
                xp: student.xp,
                level: student.level
            }
        });

    } catch (err) {
        console.error('Student login error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// GET /api/student/me
router.get('/me', authenticateStudent, async (req, res) => {
    try {
        const student = await getOne(`
            SELECT s.id, s.name, s.username, s.avatar_color, s.xp, s.level, c.name as class_name 
            FROM students s 
            LEFT JOIN classes c ON s.class_id = c.id 
            WHERE s.id = ?
        `, [req.student.studentId]);

        if (!student) {
            return res.status(404).json({ error: 'Ученик не найден' });
        }

        res.json({ student });
    } catch (err) {
        console.error('Student /me error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;
