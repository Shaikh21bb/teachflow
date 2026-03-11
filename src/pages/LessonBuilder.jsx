import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'

function LessonBuilder() {
    const { t, language } = useLanguage()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [lessonBlocks, setLessonBlocks] = useState([
        { id: 1, type: 'introduction', title: language === 'kk' ? 'Кіріспе' : 'Введение', content: '' },
    ])
    const [lessonTitle, setLessonTitle] = useState(language === 'kk' ? 'Жаңа сабақ' : 'Новый урок')
    const [lessonSubject, setLessonSubject] = useState('Математика')
    const [lessonGrade, setLessonGrade] = useState(5)
    const [lessonDuration, setLessonDuration] = useState(45)

    const blockTypes = [
        { id: 'introduction', name: language === 'kk' ? 'Кіріспе' : 'Введение', icon: '👋' },
        { id: 'explanation', name: language === 'kk' ? 'Түсіндіру' : 'Объяснение', icon: '📖' },
        { id: 'example', name: language === 'kk' ? 'Мысал' : 'Пример', icon: '💡' },
        { id: 'exercise', name: language === 'kk' ? 'Жаттығу' : 'Упражнение', icon: '✏️' },
        { id: 'quiz', name: language === 'kk' ? 'Тест' : 'Тест', icon: '❓' },
        { id: 'discussion', name: language === 'kk' ? 'Талқылау' : 'Обсуждение', icon: '💬' },
        { id: 'video', name: language === 'kk' ? 'Видео' : 'Видео', icon: '🎥' },
        { id: 'image', name: language === 'kk' ? 'Сурет' : 'Изображение', icon: '🖼️' },
        { id: 'homework', name: language === 'kk' ? 'Үй жұмысы' : 'ДЗ', icon: '📝' },
        { id: 'summary', name: language === 'kk' ? 'Қорытынды' : 'Итог', icon: '📋' },
        { id: 'reflection', name: language === 'kk' ? 'Рефлексия' : 'Рефлексия', icon: '🤔' }
    ]

    const addBlock = (type) => {
        const newBlock = {
            id: Date.now(),
            type: type.id,
            title: type.name,
            content: ''
        }
        setLessonBlocks([...lessonBlocks, newBlock])
        setSelectedBlock(newBlock.id)
    }

    const removeBlock = (id) => {
        setLessonBlocks(lessonBlocks.filter(b => b.id !== id))
        if (selectedBlock === id) setSelectedBlock(null)
    }

    async function handleSave() {
        if (!lessonTitle.trim()) {
            alert(language === 'kk' ? 'Сабақ атауын енгізіңіз' : 'Введите название урока')
            return
        }

        setSaving(true)
        try {
            await lessonsAPI.create({
                title: lessonTitle,
                subject: lessonSubject,
                grade: lessonGrade,
                duration: lessonDuration,
                description: lessonBlocks[0]?.content || '',
                content: JSON.stringify(lessonBlocks)
            })
            alert(language === 'kk' ? 'Сабақ сақталды!' : 'Урок сохранён!')
            navigate('/library')
        } catch (err) {
            alert((language === 'kk' ? 'Сақтау қатесі: ' : 'Ошибка сохранения: ') + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="builder">
            {/* Left Sidebar - Block Palette */}
            <div className="builder-sidebar">
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
                        {t('builder.blocksTitle')}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                        {t('builder.addBlock')}
                    </p>
                </div>

                <div className="block-palette">
                    {blockTypes.map(type => (
                        <div
                            key={type.id}
                            className="block-item"
                            onClick={() => addBlock(type)}
                        >
                            <span className="block-item-icon">{type.icon}</span>
                            <span>{type.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="builder-canvas">
                <div className="canvas-area">
                    {/* Lesson Header */}
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-6)',
                        marginBottom: 'var(--spacing-6)'
                    }}>
                        <input
                            type="text"
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                outline: 'none',
                                marginBottom: 'var(--spacing-4)'
                            }}
                            placeholder={t('builder.lessonTitle')}
                        />

                        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                            <select
                                className="filter-select"
                                value={lessonSubject}
                                onChange={(e) => setLessonSubject(e.target.value)}
                            >
                                <option>Математика</option>
                                <option>Физика</option>
                                <option>Биология</option>
                                <option>Английский язык</option>
                                <option>Русский язык</option>
                                <option>История</option>
                                <option>Информатика</option>
                            </select>

                            <select
                                className="filter-select"
                                value={lessonGrade}
                                onChange={(e) => setLessonGrade(parseInt(e.target.value))}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                                    <option key={g} value={g}>{g} {t('library.grade')}</option>
                                ))}
                            </select>

                            <select
                                className="filter-select"
                                value={lessonDuration}
                                onChange={(e) => setLessonDuration(parseInt(e.target.value))}
                            >
                                <option value={15}>15 {t('library.minutes')}</option>
                                <option value={30}>30 {t('library.minutes')}</option>
                                <option value={45}>45 {t('library.minutes')}</option>
                                <option value={60}>60 {t('library.minutes')}</option>
                            </select>

                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-2)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? `💾 ${t('common.saving')}` : `💾 ${t('common.save')}`}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lesson Blocks */}
                    {lessonBlocks.length === 0 ? (
                        <div className="canvas-empty">
                            <div className="canvas-empty-icon">📝</div>
                            <h3>{language === 'kk' ? 'Сабақ құруды бастаңыз' : 'Начните создавать урок'}</h3>
                            <p>{language === 'kk' ? 'Сол жақ панельден блоктарды қосыңыз' : 'Добавьте блоки из панели слева'}</p>
                        </div>
                    ) : (
                        lessonBlocks.map((block, index) => (
                            <div
                                key={block.id}
                                className={`canvas-block ${selectedBlock === block.id ? 'selected' : ''}`}
                                onClick={() => setSelectedBlock(block.id)}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 'var(--spacing-4)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                        <span style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'var(--color-primary-100)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1rem'
                                        }}>
                                            {blockTypes.find(t => t.id === block.type)?.icon || '📝'}
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{block.title}</span>
                                        <span className="badge badge-gray">{index + 1}</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={(e) => { e.stopPropagation(); removeBlock(block.id) }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    value={block.content}
                                    onChange={(e) => {
                                        setLessonBlocks(lessonBlocks.map(b =>
                                            b.id === block.id ? { ...b, content: e.target.value } : b
                                        ))
                                    }}
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        border: '1px solid var(--color-gray-200)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--spacing-4)',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                    placeholder={language === 'kk' ? 'Блок мазмұнын енгізіңіз...' : 'Введите содержимое блока...'}
                                />
                            </div>
                        ))
                    )}

                    {/* Add Block Button */}
                    <div
                        style={{
                            border: '2px dashed var(--color-gray-300)',
                            borderRadius: 'var(--radius-xl)',
                            padding: 'var(--spacing-8)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                        onClick={() => addBlock(blockTypes[0])}
                    >
                        <span style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)', display: 'block' }}>+</span>
                        <span style={{ color: 'var(--color-gray-500)' }}>{t('builder.addBlock')}</span>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Properties */}
            <div className="builder-properties">
                {selectedBlock ? (
                    <>
                        <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-4)' }}>
                            {language === 'kk' ? 'Блок баптаулары' : 'Свойства блока'}
                        </h3>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Тақырып' : 'Заголовок'}</label>
                            <input
                                type="text"
                                className="input"
                                value={lessonBlocks.find(b => b.id === selectedBlock)?.title || ''}
                                onChange={(e) => {
                                    setLessonBlocks(lessonBlocks.map(b =>
                                        b.id === selectedBlock ? { ...b, title: e.target.value } : b
                                    ))
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Блок түрі' : 'Тип блока'}</label>
                            <select className="filter-select" style={{ width: '100%' }}>
                                {blockTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.icon} {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', paddingTop: 'var(--spacing-8)' }}>
                        <span style={{ fontSize: '2rem', marginBottom: 'var(--spacing-4)', display: 'block' }}>👆</span>
                        <p>{language === 'kk' ? 'Өңдеу үшін блокты таңдаңыз' : 'Выберите блок для редактирования'}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LessonBuilder
