const express = require('express');
const router = express.Router();
const { chatWithAI, getAvailableProviders } = require('../utils/aiProviders');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/ai/chat
 * Chat with AI assistant (AlFarabiBot)
 */
router.post('/chat', async (req, res) => {
    const language = req.body?.language || 'ru';
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Сообщение обязательно' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ error: 'Сообщение слишком длинное (макс 2000 символов)' });
        }

        const aiResponse = await chatWithAI(message, conversationHistory, language);
        res.json({
            response: aiResponse,
            provider: getAvailableProviders().primary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        let errorMessage = 'Произошла ошибка. Попробуйте позже.';
        if (error.message?.includes('No AI provider')) {
            errorMessage = 'AI сервис недоступен.';
        } else if (error.message?.includes('rate limit')) {
            errorMessage = 'Слишком много запросов. Подождите немного.';
        }
        res.status(500).json({ error: errorMessage });
    }
});

/**
 * POST /api/ai/lesson-plan
 * Generate a structured lesson plan by topic, subject, grade
 */
router.post('/lesson-plan', authenticateToken, async (req, res) => {
    try {
        const { topic, subject, grade, duration = 45, language = 'ru' } = req.body;
        if (!topic || !subject) {
            return res.status(400).json({ error: 'topic и subject обязательны' });
        }

        const prompt = language === 'kk'
            ? `${grade}-сынып оқушыларына арналған "${topic}" тақырыбы бойынша ${subject} пәнінің ${duration} минуттық сабақ жоспарын жаз. Жоспарда болуы керек: 1. Мақсаттар, 2. Жабдықтар, 3. Кіріспе (5 мин), 4. Негізгі бөлім (${duration - 15} мин), 5. Қорытынды (5 мин), 6. Үй тапсырмасы, 7. Бағалау критерийлері.`
            : `Составь подробный план урока по предмету "${subject}" на тему "${topic}" для ${grade} класса, длительностью ${duration} минут. Включи: 1. Цели и задачи, 2. Оборудование, 3. Орг. момент (5 мин), 4. Основная часть (${duration - 15} мин — объяснение, практика), 5. Подведение итогов (5 мин), 6. Домашнее задание, 7. Критерии оценивания. Отвечай структурированно.`;

        const plan = await chatWithAI(prompt, [], language);
        res.json({ plan, topic, subject, grade, duration });
    } catch (err) {
        console.error('Lesson plan error:', err);
        res.status(500).json({ error: 'Не удалось сгенерировать план урока' });
    }
});

/**
 * POST /api/ai/quiz
 * Generate a quiz/test from lesson content or topic
 */
router.post('/quiz', authenticateToken, async (req, res) => {
    try {
        const { content, topic, subject, grade, question_count = 5, language = 'ru' } = req.body;
        if (!content && !topic) {
            return res.status(400).json({ error: 'content или topic обязательны' });
        }

        const source = content ? `следующему тексту: "${content.substring(0, 1500)}"` : `теме "${topic}" по предмету ${subject} для ${grade} класса`;
        const prompt = `Создай тест из ${question_count} вопросов с несколькими вариантами ответов (A, B, C, D) по ${source}. Для каждого вопроса укажи правильный ответ. Отвечай в формате JSON массива: [{"question":"...", "options":["A)...","B)...","C)...","D)..."], "correct":"A"}]. Только JSON, без пояснений!`;

        const raw = await chatWithAI(prompt, [], language);

        // Try to extract JSON from response
        let questions = [];
        try {
            let cleanedRaw = raw;
            if (cleanedRaw.includes('```json')) {
                cleanedRaw = cleanedRaw.split('```json')[1].split('```')[0];
            } else if (cleanedRaw.includes('```')) {
                cleanedRaw = cleanedRaw.split('```')[1].split('```')[0];
            }
            const jsonMatch = cleanedRaw.match(/\[[\s\S]*\]/);
            if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
        } catch {
            questions = [];
        }

        res.json({ questions, raw, count: questions.length });
    } catch (err) {
        console.error('Quiz gen error:', err);
        res.status(500).json({ error: 'Не удалось создать тест' });
    }
});

/**
 * POST /api/ai/summarize
 * Summarize text content (e.g. PDF text extraction)
 */
router.post('/summarize', authenticateToken, async (req, res) => {
    try {
        const { content, language = 'ru' } = req.body;
        if (!content) return res.status(400).json({ error: 'content обязателен' });

        const trimmed = content.substring(0, 3000);
        const prompt = language === 'kk'
            ? `Келесі мәтінді 5-7 нүктеде қысқаша қорытындыла (оқушыларға арналған, түсінікті тілде):\n\n${trimmed}`
            : `Сделай краткое резюме следующего текста в 5-7 ключевых пунктах (для учеников, понятным языком):\n\n${trimmed}`;

        const summary = await chatWithAI(prompt, [], language);
        res.json({ summary });
    } catch (err) {
        console.error('Summarize error:', err);
        res.status(500).json({ error: 'Не удалось создать резюме' });
    }
});

/**
 * POST /api/ai/translate
 * Translate lesson content to another language
 */
router.post('/translate', authenticateToken, async (req, res) => {
    try {
        const { content, from = 'ru', to = 'kk' } = req.body;
        if (!content) return res.status(400).json({ error: 'content обязателен' });

        const langNames = { ru: 'русском', kk: 'казахском', en: 'английском' };
        const trimmed = content.substring(0, 2000);
        const prompt = `Переведи следующий текст с ${langNames[from] || from} на ${langNames[to] || to} язык, сохраняя структуру и смысл:\n\n${trimmed}`;

        const translated = await chatWithAI(prompt, [], to);
        res.json({ translated, from, to });
    } catch (err) {
        console.error('Translate error:', err);
        res.status(500).json({ error: 'Не удалось перевести текст' });
    }
});

/**
 * GET /api/ai/status
 */
router.get('/status', (req, res) => {
    const providers = getAvailableProviders();
    res.json({
        available: providers.primary !== 'none',
        primary: providers.primary,
        providers: {
            gemini: providers.gemini,
            groq: providers.groq,
            huggingface: providers.huggingface
        }
    });
});

module.exports = router;
