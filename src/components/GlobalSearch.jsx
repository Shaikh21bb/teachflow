import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, ClipboardList, Loader2 } from 'lucide-react'
import api from '../api'
import { useLanguage } from '../contexts/LanguageContext'

export default function GlobalSearch() {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState({ lessons: [], assignments: [] })
    const wrapperRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults({ lessons: [], assignments: [] })
                return
            }
            setLoading(true)
            try {
                const [lessonsRes, assignmentsRes] = await Promise.all([
                    api.lessons.getAll().catch(() => ({ lessons: [] })),
                    api.assignments.getAll().catch(() => ({ assignments: [] }))
                ])
                
                const searchLower = query.toLowerCase()
                
                const allLessons = Array.isArray(lessonsRes) ? lessonsRes : (lessonsRes?.lessons || [])
                const lessons = allLessons.filter(l => 
                    l.title?.toLowerCase().includes(searchLower) || 
                    l.description?.toLowerCase().includes(searchLower)
                ).slice(0, 4)

                const allAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || [])
                const assignments = allAssignments.filter(a => 
                    a.title?.toLowerCase().includes(searchLower) || 
                    a.description?.toLowerCase().includes(searchLower)
                ).slice(0, 4)

                setResults({ lessons, assignments })
            } catch (err) {
                console.error('Search error:', err)
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(() => {
            if (query) fetchResults()
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (type, item) => {
        setIsOpen(false)
        setQuery('')
        if (type === 'lesson') {
            navigate(`/builder?edit=${item.id}`)
        } else if (type === 'assignment') {
            navigate(`/assignments`)
        }
    }

    const hasResults = results.lessons.length > 0 || results.assignments.length > 0
    const showDropdown = isOpen && query.trim().length > 0

    return (
        <div className="topbar-search" ref={wrapperRef} style={{ position: 'relative' }}>
            <Search size={18} style={{ color: 'var(--color-gray-400)' }} />
            <input 
                type="text" 
                placeholder={t('common.searchPlaceholder')}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
            />

            {showDropdown && (
                <div className="global-search-dropdown">
                    {loading ? (
                        <div className="search-loading">
                            <Loader2 className="spinner" size={20} />
                            <span>Ищем...</span>
                        </div>
                    ) : !hasResults ? (
                        <div className="search-empty">
                            Ничего не найдено по запросу «{query}»
                        </div>
                    ) : (
                        <div className="search-results-list">
                            {results.lessons.length > 0 && (
                                <div className="search-group">
                                    <div className="search-group-title">Уроки</div>
                                    {results.lessons.map(lesson => (
                                        <div 
                                            key={lesson.id} 
                                            className="search-item"
                                            onClick={() => handleSelect('lesson', lesson)}
                                        >
                                            <div className="search-item-icon lesson-icon">
                                                <BookOpen size={16} />
                                            </div>
                                            <div className="search-item-content">
                                                <div className="search-item-title">{lesson.title}</div>
                                                {lesson.description && <div className="search-item-desc">{lesson.description}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {results.assignments.length > 0 && (
                                <div className="search-group">
                                    <div className="search-group-title">Задания</div>
                                    {results.assignments.map(assignment => (
                                        <div 
                                            key={assignment.id} 
                                            className="search-item"
                                            onClick={() => handleSelect('assignment', assignment)}
                                        >
                                            <div className="search-item-icon assignment-icon">
                                                <ClipboardList size={16} />
                                            </div>
                                            <div className="search-item-content">
                                                <div className="search-item-title">{assignment.title}</div>
                                                {assignment.description && <div className="search-item-desc">{assignment.description}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
