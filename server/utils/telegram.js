const https = require('https');

/**
 * Send a plain text message via Telegram Bot API.
 * @param {string} botToken - The bot token from @BotFather
 * @param {string|number} chatId - Target chat/user ID
 * @param {string} text - Message text (supports Markdown)
 */
async function sendMessage(botToken, chatId, text) {
    if (!botToken || !chatId) return null;

    const body = JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'api.telegram.org',
                path: `/bot${botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve(data); }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Format and send a lesson card as a Telegram message.
 */
async function sendLessonCard(botToken, chatId, lesson) {
    const status = lesson.is_published ? '✅ Опубликован' : '📝 Черновик';
    const text = [
        `📚 *${lesson.title}*`,
        ``,
        `📖 Предмет: ${lesson.subject || '—'}`,
        `🎓 Класс: ${lesson.grade || '—'}`,
        `⏱ Длительность: ${lesson.duration || 45} мин`,
        `👁 Просмотры: ${lesson.views_count || 0}`,
        `📊 Статус: ${status}`,
        ``,
        `🕒 Создан: ${new Date(lesson.created_at).toLocaleDateString('ru-RU')}`
    ].join('\n');

    return sendMessage(botToken, chatId, text);
}

/**
 * Register a webhook for a Telegram bot.
 * Call this once when user connects their Telegram integration.
 */
async function setWebhook(botToken, webhookUrl) {
    const body = JSON.stringify({ url: webhookUrl });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'api.telegram.org',
                path: `/bot${botToken}/setWebhook`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve(data); }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Get bot info (used to validate the token).
 */
async function getMe(botToken) {
    return new Promise((resolve, reject) => {
        https.get(
            `https://api.telegram.org/bot${botToken}/getMe`,
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve({ ok: false }); }
                });
            }
        ).on('error', reject);
    });
}

module.exports = { sendMessage, sendLessonCard, setWebhook, getMe };
