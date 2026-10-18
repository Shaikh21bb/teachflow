const { getOne } = require('../db/database');
async function canReadLesson(lesson, user) {
    if (!user || !lesson) return false;
    if (lesson.user_id === user.userId || user.role === 'admin') return true;
    if (!lesson.is_published || lesson.is_archived) return false;
    if (!lesson.for_sale || Number(lesson.price_tokens || 0) === 0) return true;
    return Boolean(await getOne('SELECT id FROM marketplace_purchases WHERE lesson_id = ? AND buyer_id = ?', [lesson.id, user.userId]));
}
module.exports = { canReadLesson };
