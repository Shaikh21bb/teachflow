const STARTER_CREDITS = 5;

const CREDIT_COSTS = {
    lesson_plan: 2,
    open_lesson: 2,
    quiz_generation: 2,
    homework_grading: 1,
    summarize: 1,
    translate: 1,
    ai_chat: 1,
    generate_lesson: 5  // Full lesson: slides + quiz + homework in one call
};

const PLAN_CREDIT_LIMITS = {
    free: STARTER_CREDITS,
    pro: 100,
    school: 500
};

function getCreditCost(feature) {
    return CREDIT_COSTS[feature] || 1;
}

module.exports = {
    STARTER_CREDITS,
    CREDIT_COSTS,
    PLAN_CREDIT_LIMITS,
    getCreditCost
};
