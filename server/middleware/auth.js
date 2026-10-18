const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is weak or missing. Set a strong secret in .env (min 32 chars).');
}

/**
 * Middleware: Verifies JWT Bearer token.
 * Returns 401 with code TOKEN_EXPIRED when token has expired
 * so the client can automatically refresh.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Токен истёк',
                    code: 'TOKEN_EXPIRED',
                });
            }
            return res.status(401).json({ error: 'Неверный токен', code: 'INVALID_TOKEN' });
        }
        if (!Number.isInteger(user.userId) || !['teacher', 'admin'].includes(user.role)) {
            return res.status(403).json({ error: 'Доступ разрешён только учителям', code: 'FORBIDDEN' });
        }
        try {
            const { getOne } = require('../db/database');
            const account = await getOne('SELECT role, is_active FROM users WHERE id = ?', [user.userId]);
            if (!account?.is_active) return res.status(401).json({ error: 'Аккаунт недоступен', code: 'ACCOUNT_DISABLED' });
            req.user = { ...user, role: account.role };
            next();
        } catch (error) { next(error); }
    });
}

/**
 * Middleware: Requires admin role.
 * Must be used AFTER authenticateToken.
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён: требуются права администратора' });
    }
    next();
}

/**
 * Middleware: Requires teacher role.
 * Must be used AFTER authenticateToken.
 */
function requireTeacher(req, res, next) {
    if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Доступ запрещён: только для учителей' });
    }
    next();
}

module.exports = { authenticateToken, requireAdmin, requireTeacher };
