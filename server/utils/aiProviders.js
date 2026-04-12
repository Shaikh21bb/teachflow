const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize AI providers
const groq = process.env.GROQ_API_KEY ? new Groq({
    apiKey: process.env.GROQ_API_KEY
}) : null;

const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * System prompt for educational AI assistant
 */
const SYSTEM_PROMPT = `Ты — әл-Фараби, AI помощник для казахстанских учителей на платформе Urpaq.ai.

Твоя роль:
- Помогать учителям создавать планы уроков
- Генерировать вопросы для тестов и заданий
- Давать педагогические советы
- Адаптировать материалы под разные уровни учеников
- Отвечать на вопросы по методике преподавания

Стиль общения:
- Дружелюбный и профессиональный
- Используй эмодзи умеренно
- Отвечай на том языке, на котором задан вопрос (казахский или русский)
- Будь кратким, но информативным

Контекст: Ты работаешь в образовательной системе Казахстана.`;

/**
 * Chat with AI using Gemini (primary), Groq (secondary) or Hugging Face (tertiary)
 * @param {string} userMessage - User's message
 * @param {Array} conversationHistory - Previous messages (optional)
 * @param {string} language - 'kk' or 'ru'
 * @returns {Promise<string>} - AI response
 */
async function chatWithAI(userMessage, conversationHistory = [], language = 'ru') {
    try {
        // Try Gemini first (most stable free option)
        if (genAI) {
            console.log('✨ Using Google Gemini AI...');
            try {
                return await chatWithGemini(userMessage, conversationHistory, language);
            } catch (err) {
                console.error('Gemini failed, trying other providers:', err.message);
            }
        }

        // Try Groq second
        if (groq) {
            console.log('🚀 Using Groq AI...');
            try {
                return await chatWithGroq(userMessage, conversationHistory, language);
            } catch (err) {
                console.error('Groq failed, trying fallback:', err.message);
            }
        }

        // Fallback to Hugging Face
        if (hf) {
            console.log('🤗 Using Hugging Face fallback...');
            return await chatWithHuggingFace(userMessage, conversationHistory, language);
        }

        // No AI provider available or all failed
        throw new Error('No AI provider configured or all providers failed. Please set GEMINI_API_KEY, GROQ_API_KEY or HUGGINGFACE_API_KEY in .env');
    } catch (error) {
        console.error('AI Error:', error.message);
        throw error;
    }
}

/**
 * Chat using Google Gemini 1.5 Pro
 */
async function chatWithGemini(userMessage, conversationHistory, language) {
    let context = "";
    if (conversationHistory && conversationHistory.length > 0) {
        context = "Предыдущие сообщения беседы:\n" + conversationHistory.map(m => `${m.role === 'user' ? 'Учитель' : 'Фараби'}: ${m.content}`).join("\n") + "\n\n";
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT + "\n\n" + context
    });

    const result = await model.generateContent(userMessage);
    const response = await result.response;
    return response.text();
}

/**
 * Chat using Groq (Llama 3.1 70B)
 */
async function chatWithGroq(userMessage, conversationHistory, language) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'Извините, не могу ответить.';
}

/**
 * Chat using Hugging Face (Mistral or similar)
 */
async function chatWithHuggingFace(userMessage, conversationHistory, language) {
    let prompt = SYSTEM_PROMPT + '\n\n';

    conversationHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    prompt += `User: ${userMessage}\nAssistant:`;

    const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: prompt,
        parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            return_full_text: false
        }
    });

    return response.generated_text.trim();
}

/**
 * Check if AI providers are available
 */
function getAvailableProviders() {
    return {
        gemini: !!genAI,
        groq: !!groq,
        huggingface: !!hf,
        primary: genAI ? 'gemini' : (groq ? 'groq' : (hf ? 'huggingface' : 'none'))
    };
}

module.exports = {
    chatWithAI,
    getAvailableProviders
};
