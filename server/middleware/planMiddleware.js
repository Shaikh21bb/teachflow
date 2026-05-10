const { getOne, getAll, runQuery } = require('../db/database');
const { PLAN_CREDIT_LIMITS, getCreditCost } = require('../utils/creditCosts');

const PLAN_LIMITS = {
    free: {
        lessons: 5,
        classes: 1,
        ai_credits: PLAN_CREDIT_LIMITS.free
    },
    pro: {
        lessons: 9999, // practically unlimited
        classes: 10,
        ai_credits: PLAN_CREDIT_LIMITS.pro
    },
    school: {
        lessons: 9999,
        classes: 9999,
        ai_credits: PLAN_CREDIT_LIMITS.school
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
        const cost = Number(req.creditCost || req.body?.creditCost || 1);
        const user = await getOne('SELECT credits, plan FROM users WHERE id = ?', [userId]);
        
        if (!user || Number(user.credits || 0) < cost) {
            return res.status(403).json({ 
                error: 'Недостаточно AI-кредитов', 
                message: `Бұл әрекетке ${cost} кредит керек. Сізде ${user?.credits || 0} кредит қалды.`,
                no_credits: true,
                code: 'NO_AI_CREDITS',
                required: cost,
                remaining: Number(user?.credits || 0)
            });
        }

        req.creditBalance = Number(user.credits || 0);
        req.creditCost = cost;
        
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

function requireCredits(feature) {
    return (req, res, next) => {
        req.creditFeature = feature;
        req.creditCost = getCreditCost(feature);
        return checkAICredits(req, res, next);
    };
}

/**
 * Deduct AI credits from user
 */
async function deductAICredits(userId, amount = 1) {
    try {
        const result = await runQuery(
            'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?',
            [amount, userId, amount]
        );
        return Number(result.rowsAffected || 0) > 0;
    } catch (err) {
        console.error('Deduct credits error:', err);
        return false;
    }
}

async function getCreditBalance(userId) {
    const user = await getOne('SELECT credits, plan FROM users WHERE id = ?', [userId]);
    return {
        credits: Number(user?.credits || 0),
        plan: user?.plan || 'free',
        limit: PLAN_CREDIT_LIMITS[user?.plan || 'free'] || PLAN_CREDIT_LIMITS.free
    };
}

module.exports = {
    checkLessonLimit,
    checkClassLimit,
    checkAICredits,
    requireCredits,
    deductAICredits,
    getCreditBalance,
    PLAN_LIMITS
};
