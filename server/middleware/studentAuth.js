const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';

function authenticateStudent(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Токен истёк',
                    code: 'TOKEN_EXPIRED',
                });
            }
            return res.status(401).json({ error: 'Неверный токен', code: 'INVALID_TOKEN' });
        }
        
        if (decoded.role !== 'student') {
            return res.status(403).json({ error: 'Доступ разрешен только ученикам' });
        }
        
        try {
            const { getOne } = require('../db/database');
            const student = await getOne('SELECT id, class_id FROM students WHERE id = ?', [decoded.studentId]);
            if (!student) return res.status(401).json({ error: 'Аккаунт ученика не найден' });
            req.student = { ...decoded, classId: student.class_id };
            next();
        } catch (error) { next(error); }
    });
}

module.exports = { authenticateStudent };
