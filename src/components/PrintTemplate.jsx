/**
 * PrintTemplate — renders a beautiful A4-ready print layout.
 * Usage: wrap in useReactToPrint, pass type='lesson' or type='quiz'
 *
 * Props:
 *   type: 'lesson' | 'quiz'
 *   data: lesson or quiz object
 *   slides: structured slides array (optional, for lessons)
 *   attempts: quiz attempts array (optional, for quizzes with answers)
 *   showAnswers: boolean — include correct answers in quiz print
 *   language: 'ru' | 'kk'
 */
import { forwardRef } from 'react'

const PrintTemplate = forwardRef(function PrintTemplate(
    { type = 'lesson', data, slides, attempts = [], showAnswers = false, language = 'ru' },
    ref
) {
    const L = (ru, kk) => language === 'kk' ? kk : ru

    if (!data) return null

    return (
        <div ref={ref} style={{ display: 'none' }}>
            <style>{`
                @media print {
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { margin: 0; }
                }
                .print-root {
                    display: block !important;
                    font-family: 'Arial', sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #111;
                    background: white;
                    padding: 28px 36px;
                    max-width: 794px;
                    margin: 0 auto;
                }
                .print-header {
                    border-bottom: 3px solid #6366f1;
                    padding-bottom: 14px;
                    margin-bottom: 20px;
                }
                .print-title {
                    font-size: 20pt;
                    font-weight: 900;
                    color: #111;
                    margin: 0 0 6px;
                }
                .print-meta {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    font-size: 10pt;
                    color: #555;
                }
                .print-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .print-badge {
                    background: #eff6ff;
                    color: #4338ca;
                    padding: 2px 10px;
                    border-radius: 20px;
                    font-size: 9pt;
                    font-weight: 700;
                }
                .print-section {
                    margin-bottom: 18px;
                }
                .print-section-title {
                    font-size: 12pt;
                    font-weight: 800;
                    color: #4338ca;
                    border-left: 4px solid #6366f1;
                    padding-left: 10px;
                    margin: 0 0 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-size: 10pt;
                }
                .print-text {
                    font-size: 11pt;
                    color: #333;
                    white-space: pre-wrap;
                    line-height: 1.7;
                }
                .print-slide {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 12px;
                    page-break-inside: avoid;
                }
                .print-slide-type {
                    font-size: 8pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #6366f1;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .print-slide-title {
                    font-size: 13pt;
                    font-weight: 800;
                    color: #111;
                    margin: 0 0 6px;
                }
                .print-slide-bullet {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                    margin-bottom: 3px;
                    font-size: 11pt;
                }
                .print-bullet-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #6366f1;
                    flex-shrink: 0;
                    margin-top: 6px;
                }
                .print-quiz-q {
                    border: 1px solid #e2e8f0;
                    border-left: 4px solid #6366f1;
                    border-radius: 6px;
                    padding: 12px 14px;
                    margin-bottom: 14px;
                    page-break-inside: avoid;
                }
                .print-quiz-question {
                    font-size: 12pt;
                    font-weight: 700;
                    margin: 0 0 8px;
                    color: #111;
                }
                .print-quiz-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 4px 0;
                    font-size: 11pt;
                    color: #333;
                }
                .print-quiz-option-letter {
                    width: 22px;
                    height: 22px;
                    border: 2px solid #d1d5db;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 9pt;
                    flex-shrink: 0;
                }
                .print-quiz-option-letter.correct {
                    border-color: #10b981;
                    background: #dcfce7;
                    color: #065f46;
                }
                .print-answer-line {
                    border-bottom: 1.5px solid #d1d5db;
                    height: 24px;
                    margin-bottom: 8px;
                }
                .print-footer {
                    border-top: 1px solid #e2e8f0;
                    margin-top: 24px;
                    padding-top: 10px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 9pt;
                    color: #9ca3af;
                }
                .print-logo {
                    font-weight: 900;
                    color: #6366f1;
                }
            `}</style>

            <div className="print-root">
                {/* ── HEADER ── */}
                <div className="print-header">
                    <div className="print-title">{data.title}</div>
                    <div className="print-meta">
                        {data.subject && <span className="print-badge">{data.subject}</span>}
                        {data.grade && <span className="print-meta-item">📚 {data.grade} {L('класс', 'сынып')}</span>}
                        {data.duration && <span className="print-meta-item">⏱ {data.duration} {L('мин', 'мин')}</span>}
                        {type === 'quiz' && data.questions?.length && (
                            <span className="print-meta-item">❓ {data.questions.length} {L('вопросов', 'сұрақ')}</span>
                        )}
                    </div>
                </div>

                {/* ══ LESSON PRINT ══ */}
                {type === 'lesson' && (
                    <>
                        {data.description && (
                            <div className="print-section">
                                <div className="print-section-title">{L('Описание', 'Сипаттама')}</div>
                                <div className="print-text">{data.description}</div>
                            </div>
                        )}

                        {/* Structured slides */}
                        {slides && slides.length > 0 ? (
                            <div className="print-section">
                                <div className="print-section-title">{L('Структура урока', 'Сабақ құрылымы')}</div>
                                {slides.map((slide, i) => (
                                    <div key={i} className="print-slide">
                                        <div className="print-slide-type">
                                            {i + 1}. {
                                                slide.type === 'cover' ? L('Обложка', 'Мұқаба') :
                                                slide.type === 'objectives' ? L('Цели', 'Мақсаттар') :
                                                slide.type === 'content' ? L('Контент', 'Мазмұн') :
                                                slide.type === 'example' ? L('Пример', 'Мысал') :
                                                slide.type === 'poll' ? L('Опрос', 'Сауалнама') :
                                                slide.type === 'homework' ? L('Домашнее задание', 'Үй тапсырмасы') :
                                                slide.type === 'summary' ? L('Итоги', 'Қорытынды') :
                                                slide.type
                                            }
                                        </div>
                                        <div className="print-slide-title">{slide.title}</div>
                                        {/* Bullets */}
                                        {(slide.items || slide.bullets || []).map((item, j) => (
                                            <div key={j} className="print-slide-bullet">
                                                <div className="print-bullet-dot" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                        {slide.content && <div className="print-text" style={{ marginTop: 4 }}>{slide.content}</div>}
                                        {slide.highlight && (
                                            <div style={{ marginTop: 8, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 12px', fontWeight: 700, fontSize: '11pt', color: '#92400e' }}>
                                                {slide.highlight}
                                            </div>
                                        )}
                                        {slide.type === 'poll' && slide.options && (
                                            <div style={{ marginTop: 6 }}>
                                                {slide.options.map((opt, k) => (
                                                    <div key={k} className="print-quiz-option">
                                                        <div className={`print-quiz-option-letter ${slide.correct === ['A','B','C','D'][k] ? 'correct' : ''}`}>
                                                            {['A','B','C','D'][k]}
                                                        </div>
                                                        <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {slide.type === 'homework' && slide.due && (
                                            <div style={{ marginTop: 6, fontSize: '10pt', color: '#059669', fontWeight: 700 }}>
                                                📅 {slide.due}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : data.content ? (
                            <div className="print-section">
                                <div className="print-section-title">{L('План урока', 'Сабақ жоспары')}</div>
                                <div className="print-text">{data.content}</div>
                            </div>
                        ) : null}
                    </>
                )}

                {/* ══ QUIZ PRINT ══ */}
                {type === 'quiz' && (
                    <>
                        {data.description && (
                            <div className="print-section">
                                <div className="print-section-title">{L('Описание', 'Сипаттама')}</div>
                                <div className="print-text">{data.description}</div>
                            </div>
                        )}
                        <div className="print-section">
                            <div className="print-section-title">
                                {showAnswers ? L('Вопросы с ответами', 'Жауаптары бар сұрақтар') : L('Вопросы', 'Сұрақтар')}
                            </div>
                            {(data.questions || []).map((q, i) => {
                                const opts = typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || [])
                                return (
                                    <div key={i} className="print-quiz-q">
                                        <div className="print-quiz-question">{i + 1}. {q.question}</div>
                                        {opts.length > 0 ? (
                                            opts.map((opt, k) => {
                                                const letter = ['A','B','C','D'][k] || String(k + 1)
                                                const isCorrect = showAnswers && (q.correct === letter || q.correct_answer === opt || q.correct_index === k)
                                                return (
                                                    <div key={k} className="print-quiz-option">
                                                        <div className={`print-quiz-option-letter ${isCorrect ? 'correct' : ''}`}>{letter}</div>
                                                        <span>{typeof opt === 'string' ? opt.replace(/^[A-D]\)\s*/, '') : opt}</span>
                                                        {isCorrect && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '10pt', marginLeft: 8 }}>✓</span>}
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            // Open-ended: draw answer lines
                                            <>
                                                <div className="print-answer-line" />
                                                <div className="print-answer-line" />
                                            </>
                                        )}
                                        {showAnswers && q.explanation && (
                                            <div style={{ marginTop: 6, fontSize: '10pt', color: '#555', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: 5 }}>
                                                💡 {q.explanation}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Attempts summary */}
                        {attempts.length > 0 && (
                            <div className="print-section">
                                <div className="print-section-title">{L('Результаты', 'Нәтижелер')}</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>№</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>{L('Имя', 'Аты')}</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>{L('Баллы', 'Балл')}</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>{L('Результат', 'Нәтиже')}</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: 700 }}>{L('Время', 'Уақыт')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attempts.map((a, i) => {
                                            const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '6px 10px', color: '#6b7280' }}>{i + 1}</td>
                                                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{a.student_name}</td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{a.score}/{a.max_score}</td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }}>
                                                        {pct}%
                                                    </td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6b7280' }}>
                                                        {a.time_spent ? `${Math.round(a.time_spent / 60)} мин` : '—'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* ── FOOTER ── */}
                <div className="print-footer">
                    <span className="print-logo">Urpaq.ai</span>
                    <span>{new Date().toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>
        </div>
    )
})

export default PrintTemplate
