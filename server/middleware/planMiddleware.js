const { getOne, getAll, runQuery } = require('../db/database');
const { PLAN_CREDIT_LIMITS, getCreditCost, CREDIT_COSTS, STARTER_CREDITS } = require('../utils/creditCosts');

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
    premium: {
        lessons: 9999, // legacy alias for the pro plan
        classes: 10,
        ai_credits: PLAN_CREDIT_LIMITS.premium
    },
    school: {
        lessons: 9999,
        classes: 9999,
        ai_credits: PLAN_CREDIT_LIMITS.school
    }
};

function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

async function checkLessonLimit(req, res, next) {
    try {
        const userId = req.user.userId;
        // Combined query — one round-trip instead of two
        const row = await getOne(
            `SELECT u.plan, COUNT(l.id) as count
             FROM users u LEFT JOIN lessons l ON l.user_id = u.id AND l.is_archived = 0
             WHERE u.id = ? GROUP BY u.id`,
            [userId]
        );
        const plan = row?.plan || 'free';
        const count = Number(row?.count || 0);
        const limit = getPlanLimits(plan).lessons;
        if (count >= limit) {
            return res.status(403).json({ error: 'Превышен лимит уроков', message: `На тарифе ${plan} можно создать не более ${limit} уроков.`, limit_reached: true, code: 'LIMIT_REACHED_LESSONS' });
        }
        next();
    } catch (err) { res.status(500).json({ error: err.message }); }
}

async function checkClassLimit(req, res, next) {
    try {
        const userId = req.user.userId;
        const row = await getOne(
            `SELECT u.plan, COUNT(c.id) as count
             FROM users u LEFT JOIN classes c ON c.user_id = u.id
             WHERE u.id = ? GROUP BY u.id`,
            [userId]
        );
        const plan = row?.plan || 'free';
        const count = Number(row?.count || 0);
        const limit = getPlanLimits(plan).classes;
        if (count >= limit) {
            return res.status(403).json({ error: 'Превышен лимит классов', message: `На тарифе ${plan} можно создать не более ${limit} классов.`, limit_reached: true, code: 'LIMIT_REACHED_CLASSES' });
        }
        next();
    } catch (err) { res.status(500).json({ error: err.message }); }
}

/**
 * Middleware to check AI credits
 */
async function checkAICredits(req, res, next) {
    try {
        const userId = req.user.userId;
        const cost = Number(req.creditCost || 1);
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
 * Deduct AI credits ATOMICALLY — returns { success, newBalance }
 * Uses RETURNING to get new balance in one round-trip
 */
async function deductAICredits(userId, amount = 1) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid credit amount');
    try {
        const result = await runQuery(
            `UPDATE users SET credits = credits - ?
             WHERE id = ? AND credits >= ?`,
            [amount, userId, amount]
        );
        if (!result.rowsAffected) return false;
        return true;
    } catch (err) {
        console.error('Deduct credits error:', err);
        return false;
    }
}

/**
 * Refund credits (used when AI call fails after deduction)
 */
async function refundCredits(userId, amount) {
    try {
        await runQuery('UPDATE users SET credits = credits + ? WHERE id = ?', [amount, userId]);
    } catch (err) {
        console.error('Refund credits error:', err);
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
    refundCredits,
    getCreditBalance,
    getCreditCost,
    CREDIT_COSTS,
    PLAN_CREDIT_LIMITS,
    STARTER_CREDITS,
    PLAN_LIMITS,
    getPlanLimits,
};
