const express = require('express');
const router = express.Router();
const { chatWithAI, getAvailableProviders } = require('../utils/aiProviders');

/**
 * POST /api/ai/chat
 * Chat with AI assistant
 */
router.post('/chat', async (req, res) => {
    const language = req.body?.language || 'ru';
    try {
        const { message, conversationHistory = [] } = req.body;

        // Validation
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: language === 'kk' ? 'Хабарлама қажет' : 'Сообщение обязательно'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                error: language === 'kk' ? 'Хабарлама тым ұзын (макс 2000 таңба)' : 'Сообщение слишком длинное (макс 2000 символов)'
            });
        }

        // Get AI response
        const aiResponse = await chatWithAI(message, conversationHistory, language);

        res.json({
            response: aiResponse,
            provider: getAvailableProviders().primary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI Chat Error:', error);

        // User-friendly error messages
        let errorMessage = 'Произошла ошибка. Попробуйте позже.';

        if (error.message.includes('No AI provider')) {
            errorMessage = language === 'kk'
                ? 'AI қызметі қолжетімсіз. Әкімшіге хабарласыңыз.'
                : 'AI сервис недоступен. Свяжитесь с администратором.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = language === 'kk'
                ? 'Тым көп сұраныс. Біраз күтіңіз.'
                : 'Слишком много запросов. Подождите немного.';
        }

        res.status(500).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/ai/status
 * Check AI service status
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
