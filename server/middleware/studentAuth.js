const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';

function authenticateStudent(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Токен истёк',
                    code: 'TOKEN_EXPIRED',
                });
            }
            return res.status(403).json({ error: 'Неверный токен', code: 'INVALID_TOKEN' });
        }
        
        if (decoded.role !== 'student') {
            return res.status(403).json({ error: 'Доступ разрешен только ученикам' });
        }
        
        req.student = decoded;
        next();
    });
}

module.exports = { authenticateStudent };
