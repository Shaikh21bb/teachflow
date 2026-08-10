const express = require('express');
const router = express.Router();
const { chatWithAI, getAvailableProviders } = require('../utils/aiProviders');
const { authenticateToken } = require('../middleware/auth');
const { requireCredits, deductAICredits, getCreditBalance } = require('../middleware/planMiddleware');
const { CREDIT_COSTS } = require('../utils/creditCosts');

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
router.post('/lesson-plan', authenticateToken, requireCredits('lesson_plan'), async (req, res) => {
    try {
        const { topic, subject, grade, duration = 45, language = 'ru' } = req.body;
        if (!topic || !subject) {
            return res.status(400).json({ error: 'topic и subject обязательны' });
        }

        const prompt = language === 'kk'
            ? `${grade}-сынып оқушыларына арналған "${topic}" тақырыбы бойынша ${subject} пәнінің ${duration} минуттық сабақ жоспарын жаз. Жоспарда болуы керек: 1. Мақсаттар, 2. Жабдықтар, 3. Кіріспе (5 мин), 4. Негізгі бөлім (${duration - 15} мин), 5. Қорытынды (5 мин), 6. Үй тапсырмасы, 7. Бағалау критерийлері. НАЗАР АУДАРЫҢЫЗ: Тек жоспардың өзін ғана жазыңыз. Сәлемдесу, қоштасу және басқа да артық сөздер жазбаңыз.`
            : `Составь подробный план урока по предмету "${subject}" на тему "${topic}" для ${grade} класса, длительностью ${duration} минут. Включи: 1. Цели и задачи, 2. Оборудование, 3. Орг. момент (5 мин), 4. Основная часть (${duration - 15} мин — объяснение, практика), 5. Подведение итогов (5 мин), 6. Домашнее задание, 7. Критерии оценивания. ВАЖНО: Выведи строго только сам план урока. Не здоровайся, не прощайся и не пиши никаких вводных слов ("Рад помочь" и т.д.). Никакой воды, только структура.`;

        const plan = await chatWithAI(prompt, [], language);
        
        const charged = await deductAICredits(req.user.userId, req.creditCost);
        if (!charged) return res.status(403).json({ error: 'Недостаточно AI-кредитов', code: 'NO_AI_CREDITS' });
        const balance = await getCreditBalance(req.user.userId);
        
        res.json({ plan, topic, subject, grade, duration, creditsCharged: req.creditCost, creditsRemaining: balance.credits });
    } catch (err) {
        console.error('Lesson plan error:', err);
        res.status(500).json({ error: 'Не удалось сгенерировать план урока' });
    }
});

/**
 * POST /api/ai/quiz
 * Generate a quiz/test from lesson content or topic
 */
router.post('/quiz', authenticateToken, requireCredits('quiz_generation'), async (req, res) => {
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

        const charged = await deductAICredits(req.user.userId, req.creditCost);
        if (!charged) return res.status(403).json({ error: 'Недостаточно AI-кредитов', code: 'NO_AI_CREDITS' });
        const balance = await getCreditBalance(req.user.userId);

        res.json({ questions, raw, count: questions.length, creditsCharged: req.creditCost, creditsRemaining: balance.credits });
    } catch (err) {
        console.error('Quiz gen error:', err);
        res.status(500).json({ error: 'Не удалось создать тест' });
    }
});

/**
 * POST /api/ai/summarize
 * Summarize text content (e.g. PDF text extraction)
 */
router.post('/summarize', authenticateToken, requireCredits('summarize'), async (req, res) => {
    try {
        const { content, language = 'ru' } = req.body;
        if (!content) return res.status(400).json({ error: 'content обязателен' });

        const trimmed = content.substring(0, 3000);
        const prompt = language === 'kk'
            ? `Келесі мәтінді 5-7 нүктеде қысқаша қорытындыла (оқушыларға арналған, түсінікті тілде):\n\n${trimmed}`
            : `Сделай краткое резюме следующего текста в 5-7 ключевых пунктах (для учеников, понятным языком):\n\n${trimmed}`;

        const summary = await chatWithAI(prompt, [], language);
        
        const charged = await deductAICredits(req.user.userId, req.creditCost);
        if (!charged) return res.status(403).json({ error: 'Недостаточно AI-кредитов', code: 'NO_AI_CREDITS' });
        const balance = await getCreditBalance(req.user.userId);
        
        res.json({ summary, creditsCharged: req.creditCost, creditsRemaining: balance.credits });
    } catch (err) {
        console.error('Summarize error:', err);
        res.status(500).json({ error: 'Не удалось создать резюме' });
    }
});

/**
 * POST /api/ai/translate
 * Translate lesson content to another language
 */
router.post('/translate', authenticateToken, requireCredits('translate'), async (req, res) => {
    try {
        const { content, from = 'ru', to = 'kk' } = req.body;
        if (!content) return res.status(400).json({ error: 'content обязателен' });

        const langNames = { ru: 'русском', kk: 'казахском', en: 'английском' };
        const trimmed = content.substring(0, 2000);
        const prompt = `Переведи следующий текст с ${langNames[from] || from} на ${langNames[to] || to} язык, сохраняя структуру и смысл:\n\n${trimmed}`;

        const translated = await chatWithAI(prompt, [], to);
        
        const charged = await deductAICredits(req.user.userId, req.creditCost);
        if (!charged) return res.status(403).json({ error: 'Недостаточно AI-кредитов', code: 'NO_AI_CREDITS' });
        const balance = await getCreditBalance(req.user.userId);
        
        res.json({ translated, from, to, creditsCharged: req.creditCost, creditsRemaining: balance.credits });
    } catch (err) {
        console.error('Translate error:', err);
        res.status(500).json({ error: 'Не удалось перевести текст' });
    }
});

/**
 * POST /api/ai/generate-lesson
 * Generate a complete structured lesson as JSON slides + quiz + homework in one call.
 * Cost: 5 credits
 *
 * Request:  { topic, subject, grade, duration, language }
 * Response: { slides: [...], quiz: [...], homework: "...", creditsCharged, creditsRemaining }
 *
 * Slide types: cover | objectives | content | example | poll | quiz_slide | homework | summary
 */
router.post('/generate-lesson', authenticateToken, requireCredits('generate_lesson'), async (req, res) => {
    try {
        const { topic, subject, grade, duration = 45, language = 'ru' } = req.body;
        if (!topic || !subject) {
            return res.status(400).json({ error: 'topic и subject обязательны' });
        }

        const gradeStr = grade ? `${grade} класс` : '';
        const isKk = language === 'kk';

        const prompt = isKk
            ? `Сен — кәсіби мұғалімсің. "${topic}" тақырыбы бойынша ${subject} пәнінен ${gradeStr} оқушыларына ${duration} минуттық интерактивті сабақ жасай. Тек JSON қайтар, ешқандай түсіндірме жазба.

JSON форматы:
{
  "slides": [
    { "type": "cover", "title": "...", "subtitle": "...", "subject": "...", "grade": "...", "duration": ${duration} },
    { "type": "objectives", "title": "Сабақтың мақсаттары", "items": ["...", "...", "..."] },
    { "type": "content", "title": "...", "bullets": ["...", "...", "..."] },
    { "type": "example", "title": "Мысал", "content": "...", "highlight": "..." },
    { "type": "content", "title": "...", "bullets": ["...", "...", "..."] },
    { "type": "poll", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A" },
    { "type": "homework", "title": "Үй тапсырмасы", "content": "...", "due": "Келесі сабаққа" },
    { "type": "summary", "title": "Қорытынды", "items": ["...", "...", "..."] }
  ],
  "quiz": [
    { "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A", "explanation": "..." }
  ],
  "homework": "..."
}

Слайд саны 7-9 аралығында болсын. Quiz 4-5 сұрақ болсын. Тек JSON, ешнәрсе жоқ.`
            : `Ты — профессиональный методист. Создай полный интерактивный урок по предмету "${subject}" на тему "${topic}" для ${gradeStr} продолжительностью ${duration} минут. Верни ТОЛЬКО JSON, без пояснений, без markdown.

Формат JSON:
{
  "slides": [
    { "type": "cover", "title": "...", "subtitle": "...", "subject": "${subject}", "grade": "${grade || ''}", "duration": ${duration} },
    { "type": "objectives", "title": "Цели урока", "items": ["...", "...", "..."] },
    { "type": "content", "title": "...", "bullets": ["...", "...", "..."] },
    { "type": "example", "title": "Пример", "content": "...", "highlight": "..." },
    { "type": "content", "title": "...", "bullets": ["...", "...", "..."] },
    { "type": "poll", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A" },
    { "type": "homework", "title": "Домашнее задание", "content": "...", "due": "К следующему уроку" },
    { "type": "summary", "title": "Итоги урока", "items": ["...", "...", "..."] }
  ],
  "quiz": [
    { "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A", "explanation": "..." }
  ],
  "homework": "..."
}

Слайдов 7-9 штук. Quiz 4-5 вопросов. ТОЛЬКО JSON, ничего больше.`;

        const raw = await chatWithAI(prompt, [], language);

        // ── Parse JSON robustly ──────────────────────────────────────────────
        let parsed = null;
        try {
            let cleaned = raw.trim();
            // Strip ```json ... ``` or ``` ... ``` fences
            if (cleaned.includes('```json')) {
                cleaned = cleaned.split('```json')[1].split('```')[0];
            } else if (cleaned.includes('```')) {
                cleaned = cleaned.split('```')[1].split('```')[0];
            }
            // Find first { ... } block
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.warn('JSON parse failed, attempting fallback:', parseErr.message);
        }

        // ── Fallback: wrap raw plan as text slides if parse failed ───────────
        if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
            const paragraphs = raw.split(/\n\n+/).filter(p => p.trim()).slice(0, 8);
            parsed = {
                slides: [
                    { type: 'cover', title: topic, subtitle: '', subject, grade: grade || '', duration },
                    ...paragraphs.map((p, i) => ({ type: 'content', title: `Часть ${i + 1}`, bullets: [p.trim()] })),
                    { type: 'summary', title: 'Итоги урока', items: ['Урок завершён'] }
                ],
                quiz: [],
                homework: ''
            };
        }

        // ── Ensure required fields ────────────────────────────────────────────
        const slides = (parsed.slides || []).map((s, i) => ({ ...s, _index: i }));
        const quiz   = Array.isArray(parsed.quiz) ? parsed.quiz : [];
        const homework = typeof parsed.homework === 'string' ? parsed.homework : '';

        // ── Deduct credits ────────────────────────────────────────────────────
        const charged = await deductAICredits(req.user.userId, req.creditCost);
        if (!charged) return res.status(403).json({ error: 'Недостаточно AI-кредитов', code: 'NO_AI_CREDITS' });
        const balance = await getCreditBalance(req.user.userId);

        res.json({
            slides,
            quiz,
            homework,
            topic, subject, grade, duration,
            creditsCharged: req.creditCost,
            creditsRemaining: balance.credits
        });

    } catch (err) {
        console.error('generate-lesson error:', err);
        res.status(500).json({ error: 'Не удалось сгенерировать урок: ' + err.message });
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
        },
        creditCosts: CREDIT_COSTS
    });
});

module.exports = router;
