const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// ──────────────────────────────────────────
// Helper: standard limiter response
// ──────────────────────────────────────────
const rateLimitHandler = (message) => (req, res) => {
    res.status(429).json({
        error: message,
        retryAfter: res.getHeader('Retry-After'),
    });
};

// ──────────────────────────────────────────
// Auth limiter — 10 attempts per 15 minutes per IP and account
// Protects /api/auth/login and /api/auth/register
// ──────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler(
        'Слишком много попыток входа. Подождите 15 минут и попробуйте снова.'
    ),
    keyGenerator: (req) => {
        const account = String(req.body?.email || req.body?.username || '').trim().toLowerCase().slice(0, 254);
        return `${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}:${account}`;
    },
});

// ──────────────────────────────────────────
// AI limiter — 30 requests per hour per IP
// Protects expensive /api/ai/* endpoints
// ──────────────────────────────────────────
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler(
        'Достигнут лимит AI-запросов (30/час). Подождите немного.'
    ),
});

// ──────────────────────────────────────────
// General API limiter — 200 requests per minute per IP
// Global DDoS protection
// ──────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'test' ? 10000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler(
        'Слишком много запросов. Пожалуйста, замедлитесь.'
    ),
});

module.exports = { authLimiter, aiLimiter, generalLimiter };
