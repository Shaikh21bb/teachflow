const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'urpaq-ai-secret-key-change-in-production';

/**
 * Middleware: Verifies JWT Bearer token.
 * Attaches decoded user payload to req.user.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный или истекший токен' });
        }
        req.user = user;
        next();
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

module.exports = { authenticateToken, requireAdmin };
