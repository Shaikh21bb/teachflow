const { getOne, getAll } = require('../db/database');

const PLAN_LIMITS = {
    free: {
        lessons: 5,
        classes: 1,
        ai_credits: 10
    },
    pro: {
        lessons: 9999, // practically unlimited
        classes: 10,
        ai_credits: 100
    },
    school: {
        lessons: 9999,
        classes: 9999,
        ai_credits: 500
    }
};

/**
 * Middleware to check lesson creation limits
 */
async function checkLessonLimit(req, res, next) {
    try {
        const userId = req.user.userId;
        const user = await getOne('SELECT plan FROM users WHERE id = ?', [userId]);
        const plan = user?.plan || 'free';
        
        const stats = await getOne('SELECT COUNT(*) as count FROM lessons WHERE user_id = ?', [userId]);
        const count = stats?.count || 0;
        
        const limit = PLAN_LIMITS[plan].lessons;
        
        if (count >= limit) {
            return res.status(403).json({ 
                error: 'Превышен лимит уроков', 
                message: `На вашем текущем тарифе (${plan}) можно создать не более ${limit} уроков.`,
                limit_reached: true,
                code: 'LIMIT_REACHED_LESSONS'
            });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * Middleware to check class creation limits
 */
async function checkClassLimit(req, res, next) {
    try {
        const userId = req.user.userId;
        const user = await getOne('SELECT plan FROM users WHERE id = ?', [userId]);
        const plan = user?.plan || 'free';
        
        const stats = await getOne('SELECT COUNT(*) as count FROM classes WHERE user_id = ?', [userId]);
        const count = stats?.count || 0;
        
        const limit = PLAN_LIMITS[plan].classes;
        
        if (count >= limit) {
            return res.status(403).json({ 
                error: 'Превышен лимит классов', 
                message: `На вашем текущем тарифе (${plan}) можно создать не более ${limit} классов.`,
                limit_reached: true,
                code: 'LIMIT_REACHED_CLASSES'
            });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * Middleware to check AI credits
 */
async function checkAICredits(req, res, next) {
    try {
        const userId = req.user.userId;
        const user = await getOne('SELECT credits, plan FROM users WHERE id = ?', [userId]);
        
        if (!user || user.credits <= 0) {
            return res.status(403).json({ 
                error: 'Недостаточно AI-кредитов', 
                message: 'У вас закончились кредиты для использования ИИ. Пожалуйста, обновите тариф или подождите следующего месяца.',
                no_credits: true,
                code: 'NO_AI_CREDITS'
            });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * Deduct AI credits from user
 */
async function deductAICredits(userId, amount = 1) {
    try {
        const { runQuery } = require('../db/database');
        await runQuery('UPDATE users SET credits = credits - ? WHERE id = ?', [amount, userId]);
        return true;
    } catch (err) {
        console.error('Deduct credits error:', err);
        return false;
    }
}

module.exports = {
    checkLessonLimit,
    checkClassLimit,
    checkAICredits,
    deductAICredits,
    PLAN_LIMITS
};
