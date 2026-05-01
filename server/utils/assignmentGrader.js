const { chatWithAI, getAvailableProviders } = require('./aiProviders');

function clampScore(value, maxScore) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return Math.round(maxScore * 0.7);
    return Math.max(0, Math.min(maxScore, Math.round(numeric)));
}

function getGradeLabel(score, maxScore) {
    const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percent >= 90) return '5';
    if (percent >= 75) return '4';
    if (percent >= 50) return '3';
    return '2';
}

function parseJsonResponse(raw) {
    if (!raw) return null;
    let cleaned = String(raw).trim();
    if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0];
    else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0];

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
}

function fallbackGrade({ answerText, answerKey = '', maxScore = 100, language = 'kk' }) {
    const answer = String(answerText || '').trim();
    const key = String(answerKey || '').trim();
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    let percent = 45;

    if (wordCount >= 20) percent += 20;
    if (wordCount >= 60) percent += 15;
    if (/[.!?]$/.test(answer)) percent += 5;

    if (key) {
        const keyWords = key
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter(w => w.length > 3);
        const unique = [...new Set(keyWords)].slice(0, 20);
        const matched = unique.filter(w => answer.toLowerCase().includes(w)).length;
        percent = Math.max(percent, 40 + Math.round((matched / Math.max(unique.length, 1)) * 50));
    }

    percent = Math.max(20, Math.min(95, percent));
    const score = clampScore((percent / 100) * maxScore, maxScore);
    const feedback = language === 'kk'
        ? 'Жауап қабылданды. Негізгі ой бар, бірақ дәлелдерді нақтылап, шешім қадамдарын толық көрсету керек.'
        : 'Ответ принят. Основная мысль есть, но стоит точнее раскрыть доказательства и показать шаги решения.';

    return {
        score,
        max_score: maxScore,
        grade_label: getGradeLabel(score, maxScore),
        feedback,
        mistakes: [
            language === 'kk'
                ? 'Мұғалім берген үлгі жауаппен салыстырып, жетіспейтін тұстарды толықтырыңыз.'
                : 'Сравните с эталонным ответом учителя и дополните недостающие части.'
        ],
        provider: 'fallback'
    };
}

async function gradeAssignment({ assignment, student, answerText, language = 'kk' }) {
    const maxScore = Number(assignment.max_score) || 100;
    const providers = getAvailableProviders();

    if (providers.primary === 'none') {
        return fallbackGrade({ answerText, answerKey: assignment.answer_key, maxScore, language });
    }

    const prompt = language === 'kk'
        ? `Сен мұғалімнің көмекшісісің. Оқушының үй жұмысын әділ тексер.
Тапсырма: ${assignment.title}
Нұсқаулық: ${assignment.instructions || 'Берілмеген'}
Мұғалімнің үлгі жауабы/критерийі: ${assignment.answer_key || 'Берілмеген'}
Оқушы: ${student.name}
Оқушы жауабы:
${String(answerText).slice(0, 6000)}

Тек JSON қайтар: {"score": сан 0-${maxScore}, "feedback": "оқушыға нақты қысқа кеңес", "mistakes": ["қате немесе жетілдіру 1", "қате немесе жетілдіру 2"]}`
        : `Ты помощник учителя. Проверь домашнюю работу ученика справедливо.
Задание: ${assignment.title}
Инструкция: ${assignment.instructions || 'Не указана'}
Эталон/критерии учителя: ${assignment.answer_key || 'Не указаны'}
Ученик: ${student.name}
Ответ ученика:
${String(answerText).slice(0, 6000)}

Верни только JSON: {"score": число 0-${maxScore}, "feedback": "конкретный короткий совет ученику", "mistakes": ["ошибка или улучшение 1", "ошибка или улучшение 2"]}`;

    try {
        const raw = await chatWithAI(prompt, [], language);
        const parsed = parseJsonResponse(raw);
        if (!parsed) throw new Error('AI returned non-JSON grading response');
        const score = clampScore(parsed.score, maxScore);
        const mistakes = Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5).map(String) : [];

        return {
            score,
            max_score: maxScore,
            grade_label: getGradeLabel(score, maxScore),
            feedback: String(parsed.feedback || '').slice(0, 2000) || fallbackGrade({ answerText, maxScore, language }).feedback,
            mistakes,
            provider: providers.primary
        };
    } catch (err) {
        console.warn('Assignment AI grading fallback:', err.message);
        return fallbackGrade({ answerText, answerKey: assignment.answer_key, maxScore, language });
    }
}

module.exports = {
    gradeAssignment,
    getGradeLabel
};
