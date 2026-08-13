/**
 * Admin authentication middleware
 * Checks that the user is authenticated AND has role_admin = 1
 */
const { authenticateToken } = require('./auth');
const { getOne } = require('../db/database');

async function requireAdmin(req, res, next) {
    // First run regular auth
    authenticateToken(req, res, async () => {
        try {
            const user = await getOne(
                'SELECT id, role, role_admin FROM users WHERE id = ? AND is_active = 1',
                [req.user.userId]
            );
            if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
            if (!user.role_admin && user.role !== 'admin') {
                return res.status(403).json({ error: 'Нет прав администратора', code: 'NOT_ADMIN' });
            }
            req.admin = user;
            next();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

module.exports = { requireAdmin };
