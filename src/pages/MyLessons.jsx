import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { 
    Plus, Search, LayoutGrid, List, MoreVertical, 
    Share2, Edit3, Trash2, Archive, Copy, ExternalLink,
    BookOpen, Eye, FileText, CheckCircle, Clock,
    Loader2, Calendar, PlayCircle, Film, Image, Paperclip,
    Youtube, Download
} from 'lucide-react'
import MaterialsTabs from '../components/MaterialsTabs'
import { InboxEmptyIcon } from '../components/Icons'
import { useReactToPrint } from 'react-to-print'
import PrintTemplate from '../components/PrintTemplate'

const SUBJECTS = [
    { value: '', ru: 'Все предметы', kk: 'Барлық пәндер' },
    { value: 'Математика', ru: 'Математика', kk: 'Математика' },
    { value: 'Алгебра', ru: 'Алгебра', kk: 'Алгебра' },
    { value: 'Физика', ru: 'Физика', kk: 'Физика' },
    { value: 'Химия', ru: 'Химия', kk: 'Химия' },
    { value: 'Биология', ru: 'Биология', kk: 'Биология' },
    { value: 'История', ru: 'История', kk: 'Тарих' },
    { value: 'География', ru: 'География', kk: 'География' },
    { value: 'Литература', ru: 'Литература', kk: 'Әдебиет' },
    { value: 'Информатика', ru: 'Информатика', kk: 'Информатика' },
    { value: 'Английский', ru: 'Английский', kk: 'Ағылшын тілі' },
    { value: 'Английский язык', ru: 'Английский язык', kk: 'Ағылшын тілі (орысша)' },
    { value: 'Ағылшын тілі', ru: 'Английский (каз.)', kk: 'Ағылшын тілі' },
    { value: 'Казахский', ru: 'Казахский', kk: 'Қазақ тілі' },
    { value: 'Казахский язык', ru: 'Казахский язык', kk: 'Қазақ тілі (орысша)' },
    { value: 'Русский язык', ru: 'Русский язык', kk: 'Орыс тілі' },
    { value: 'Казахская литература', ru: 'Казахская литература', kk: 'Қазақ әдебиеті' },
    { value: 'Русская литература', ru: 'Русская литература', kk: 'Орыс әдебиеті' },
    { value: 'Физическая культура', ru: 'Физическая культура', kk: 'Дене шынықтыру' },
    { value: 'Музыка', ru: 'Музыка', kk: 'Музыка' },
    { value: 'Рисование', ru: 'Рисование', kk: 'Сурет салу' },
    { value: 'Технология', ru: 'Технология', kk: 'Технология' },
]
const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const STATUSES = [
    { value: '', ru: 'Все (без архива)', kk: 'Барлығы (мұрағатсыз)' },
    { value: 'published', ru: 'Опубликованные', kk: 'Жарияланған' },
    { value: 'draft', ru: 'Черновики', kk: 'Жобалар' },
    { value: 'archived', ru: 'Архив', kk: 'Мұрағат' },
]

const COPY = {
    ru: {
        lesson: 'Урок', loadError: 'Не удалось загрузить уроки', deleted: 'Урок удалён',
        deleteError: 'Не удалось удалить урок', soldDeleteError: 'Проданный урок нельзя удалить. Переместите его в архив.', archived: 'Урок архивирован', restored: 'Урок восстановлен из архива',
        actionError: 'Не удалось выполнить действие', duplicated: 'Урок скопирован', duplicateError: 'Не удалось скопировать урок',
        shareError: 'Не удалось создать ссылку', copied: 'Ссылка скопирована', copyError: 'Не удалось скопировать ссылку',
        shareTitle: 'Ссылка для учеников', shareHelp: 'Поделитесь этой ссылкой — ученики смогут открыть урок без регистрации',
        copy: 'Скопировать', close: 'Закрыть', title: 'Мои уроки', greetingStart: 'Привет,', greetingEnd: 'Управляйте своими материалами',
        create: 'Создать урок', total: 'Всего уроков', published: 'Опубликовано', drafts: 'Черновики', views: 'Просмотры',
        searchLabel: 'Поиск уроков', search: 'Поиск по названию...', subjectLabel: 'Предмет', gradeLabel: 'Класс', statusLabel: 'Статус',
        allGrades: 'Все классы', grade: 'класс', gridView: 'Показать сеткой', listView: 'Показать списком', loading: 'Загрузка уроков...',
        nothing: 'Ничего не найдено', noLessons: 'У вас пока нет уроков', changeFilters: 'Попробуйте изменить фильтры',
        emptyHelp: 'Создайте первый урок и начните обучать!', createFirst: 'Создать первый урок',
        deleteTitle: 'Удалить урок?', deleteText: 'Это действие нельзя отменить. Урок и связанные с ним записи будут удалены.',
        cancel: 'Отмена', deleting: 'Удаление...', delete: 'Удалить',
        actions: 'Действия', conduct: 'Вести урок', print: 'Печать / PDF', edit: 'Редактировать', duplicate: 'Дублировать',
        share: 'Поделиться', restore: 'Восстановить', archive: 'Архивировать', archivedStatus: 'Архив',
        publishedStatus: 'Опубликован', draftStatus: 'Черновик', minutes: 'мин',
    },
    kk: {
        lesson: 'Сабақ', loadError: 'Сабақтарды жүктеу мүмкін болмады', deleted: 'Сабақ жойылды',
        deleteError: 'Сабақты жою мүмкін болмады', soldDeleteError: 'Сатылған сабақты жоюға болмайды. Оны мұрағатқа жіберіңіз.', archived: 'Сабақ мұрағатқа жіберілді', restored: 'Сабақ мұрағаттан қалпына келтірілді',
        actionError: 'Әрекетті орындау мүмкін болмады', duplicated: 'Сабақ көшірілді', duplicateError: 'Сабақты көшіру мүмкін болмады',
        shareError: 'Сілтеме жасау мүмкін болмады', copied: 'Сілтеме көшірілді', copyError: 'Сілтемені көшіру мүмкін болмады',
        shareTitle: 'Оқушыларға арналған сілтеме', shareHelp: 'Осы сілтемені бөлісіңіз — оқушылар сабақты тіркелмей аша алады',
        copy: 'Көшіру', close: 'Жабу', title: 'Менің сабақтарым', greetingStart: 'Сәлем,', greetingEnd: 'Материалдарыңызды басқарыңыз',
        create: 'Сабақ құру', total: 'Барлық сабақ', published: 'Жарияланған', drafts: 'Жобалар', views: 'Қаралымдар',
        searchLabel: 'Сабақтарды іздеу', search: 'Атауы бойынша іздеу...', subjectLabel: 'Пән', gradeLabel: 'Сынып', statusLabel: 'Күйі',
        allGrades: 'Барлық сыныптар', grade: 'сынып', gridView: 'Тор түрінде көрсету', listView: 'Тізім түрінде көрсету', loading: 'Сабақтар жүктелуде...',
        nothing: 'Ештеңе табылмады', noLessons: 'Сізде әзірге сабақ жоқ', changeFilters: 'Сүзгілерді өзгертіп көріңіз',
        emptyHelp: 'Алғашқы сабағыңызды құрып, оқытуды бастаңыз!', createFirst: 'Алғашқы сабақты құру',
        deleteTitle: 'Сабақты жою керек пе?', deleteText: 'Бұл әрекетті қайтару мүмкін емес. Сабақ пен оған байланысты жазбалар жойылады.',
        cancel: 'Бас тарту', deleting: 'Жойылуда...', delete: 'Жою',
        actions: 'Әрекеттер', conduct: 'Сабақты өткізу', print: 'Басып шығару / PDF', edit: 'Өңдеу', duplicate: 'Көшіру',
        share: 'Бөлісу', restore: 'Қалпына келтіру', archive: 'Мұрағаттау', archivedStatus: 'Мұрағат',
        publishedStatus: 'Жарияланған', draftStatus: 'Жоба', minutes: 'мин',
    },
}

function FileTypeIcon({ type, size = 24 }) {
    if (type === 'pdf') return <FileText size={size} color="#ef4444" />
    if (type === 'video') return <Film size={size} color="#245fb5" />
    if (type === 'youtube') return <Youtube size={size} color="#ef4444" />
    if (type === 'image') return <Image size={size} color="#10b981" />
    if (type === 'docx') return <FileText size={size} color="#3b82f6" />
    return <Paperclip size={size} color="#6b7280" />
}

function formatDate(dateStr, language) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getActionMenuPosition(anchor) {
    const rect = anchor.getBoundingClientRect()
    const menuWidth = 216
    const menuHeight = 322
    const gap = 6
    const top = rect.bottom + menuHeight + gap <= window.innerHeight
        ? rect.bottom + gap
        : Math.max(8, rect.top - menuHeight - gap)
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
    return { top, left }
}

function lessonMatchesQuery(lesson, query) {
    if (query.subject && lesson.subject !== query.subject) return false
    if (query.grade && String(lesson.grade) !== String(query.grade)) return false
    if (query.search) {
        const needle = query.search.toLocaleLowerCase()
        const haystack = `${lesson.title || ''} ${lesson.description || ''}`.toLocaleLowerCase()
        if (!haystack.includes(needle)) return false
    }
    if (query.status === 'published') return Boolean(lesson.is_published) && !lesson.is_archived
    if (query.status === 'draft') return !lesson.is_published && !lesson.is_archived
    if (query.status === 'archived') return Boolean(lesson.is_archived)
    return !lesson.is_archived
}

function trapDialogFocus(event) {
    if (event.key !== 'Tab') return
    const focusable = [...event.currentTarget.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) {
        event.preventDefault()
        event.currentTarget.focus()
        return
    }
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
    }
}

export default function MyLessons() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const navigate = useNavigate()
    const labels = COPY[language === 'kk' ? 'kk' : 'ru']

    // ── Print state ──────────────────────────────────────────
    const [printLesson, setPrintLesson] = useState(null)
    const [printSlides, setPrintSlides] = useState(null)
    const printRef = useRef(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: printLesson?.title || labels.lesson,
        onAfterPrint: () => { setPrintLesson(null); setPrintSlides(null) }
    })

    const openPrint = async (lesson) => {
        let slides = null
        try {
            const data = await lessonsAPI.getSlides(lesson.id)
            slides = data.slides
        } catch { /* silent */ }
        setPrintLesson(lesson)
        setPrintSlides(slides)
        setTimeout(() => handlePrint(), 300)
    }
    const [lessons, setLessons] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [subject, setSubject] = useState('')
    const [grade, setGrade] = useState('')
    const [status, setStatus] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [pendingActionIds, setPendingActionIds] = useState(() => new Set())
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleteError, setDeleteError] = useState('')
    const [actionMenu, setActionMenu] = useState(null)
    const [shareModal, setShareModal] = useState(null)
    const [toast, setToast] = useState(null)
    const [view, setView] = useState('grid') // 'grid' | 'list'
    const toastTimerRef = useRef(null)
    const lessonsRequestRef = useRef(0)
    const statsRequestRef = useRef(0)
    const deleteConfirmRef = useRef(null)
    const deleteDialogRef = useRef(null)
    const pendingActionIdsRef = useRef(new Set())
    const shareRequestRef = useRef(0)
    const lessonsQueryRef = useRef(null)
    lessonsQueryRef.current = { search, subject, grade, status }

    const showToast = useCallback((message, type = 'success') => {
        window.clearTimeout(toastTimerRef.current)
        setToast({ message, type })
        toastTimerRef.current = window.setTimeout(() => setToast(null), 4000)
    }, [])

    const localizedError = useCallback((error, fallback) => (
        language === 'kk' ? fallback : error?.message || fallback
    ), [language])

    useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

    useEffect(() => {
        if (!deletingId) return undefined
        const frame = window.requestAnimationFrame(() => deleteDialogRef.current?.focus())
        return () => window.cancelAnimationFrame(frame)
    }, [deletingId])

    const beginLessonAction = lessonId => {
        if (pendingActionIdsRef.current.has(lessonId)) return false
        pendingActionIdsRef.current.add(lessonId)
        setPendingActionIds(new Set(pendingActionIdsRef.current))
        return true
    }

    const finishLessonAction = lessonId => {
        pendingActionIdsRef.current.delete(lessonId)
        setPendingActionIds(new Set(pendingActionIdsRef.current))
    }

    const loadLessons = useCallback(async (silent = false) => {
        const requestId = ++lessonsRequestRef.current
        const query = lessonsQueryRef.current
        if (!silent) setLoading(true)
        try {
            const params = {}
            if (query.search) params.search = query.search
            if (query.subject) params.subject = query.subject
            if (query.grade) params.grade = query.grade
            if (query.status) params.status = query.status

            const data = await lessonsAPI.getAll(params)
            if (requestId === lessonsRequestRef.current) setLessons(data)
        } catch (e) {
            console.error(e)
            if (requestId === lessonsRequestRef.current) showToast(localizedError(e, labels.loadError), 'error')
        } finally {
            if (requestId === lessonsRequestRef.current) setLoading(false)
        }
    }, [labels.loadError, localizedError, showToast])

    const loadStats = useCallback(async () => {
        const requestId = ++statsRequestRef.current
        try {
            const data = await lessonsAPI.getStatsSummary()
            if (requestId === statsRequestRef.current) setStats(data)
        } catch (e) {
            console.error(e)
        }
    }, [])

    useEffect(() => {
        loadLessons()
    }, [search, subject, grade, status, loadLessons])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    const closeDeleteDialog = useCallback(() => {
        const lessonId = deleteTarget?.id
        setDeleteTarget(null)
        setDeleteError('')
        if (lessonId) {
            window.requestAnimationFrame(() => document.getElementById(`lesson-actions-trigger-${lessonId}`)?.focus())
        }
    }, [deleteTarget])

    const closeShareDialog = useCallback(() => {
        const lessonId = shareModal?.lessonId
        setShareModal(null)
        if (lessonId) {
            window.requestAnimationFrame(() => document.getElementById(`lesson-actions-trigger-${lessonId}`)?.focus())
        }
    }, [shareModal])

    const closeActionMenu = useCallback((restoreFocus = false) => {
        const lessonId = actionMenu?.lessonId
        setActionMenu(null)
        if (restoreFocus && lessonId) {
            window.requestAnimationFrame(() => document.getElementById(`lesson-actions-trigger-${lessonId}`)?.focus())
        }
    }, [actionMenu])

    const activeMenuLessonId = actionMenu?.lessonId
    const activeMenuAnchor = actionMenu?.anchor

    useEffect(() => {
        if (!activeMenuLessonId) return undefined
        const frame = window.requestAnimationFrame(() => {
            document.querySelector(`#lesson-actions-${activeMenuLessonId} [role="menuitem"]`)?.focus()
        })
        return () => window.cancelAnimationFrame(frame)
    }, [activeMenuLessonId])

    useEffect(() => {
        if (!activeMenuAnchor) return undefined
        const closeMenuAndRestoreFocus = () => {
            setActionMenu(null)
            window.requestAnimationFrame(() => {
                const target = document.body.contains(activeMenuAnchor)
                    ? activeMenuAnchor
                    : document.getElementById('my-lessons-heading')
                target?.focus({ preventScroll: true })
            })
        }
        const repositionMenu = () => {
            if (!document.body.contains(activeMenuAnchor)) {
                closeMenuAndRestoreFocus()
                return
            }
            const rect = activeMenuAnchor.getBoundingClientRect()
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                closeMenuAndRestoreFocus()
                return
            }
            const position = getActionMenuPosition(activeMenuAnchor)
            setActionMenu(current => {
                if (!current || current.anchor !== activeMenuAnchor) return current
                if (current.top === position.top && current.left === position.left) return current
                return { ...current, ...position }
            })
        }
        window.addEventListener('scroll', repositionMenu, true)
        window.addEventListener('resize', closeMenuAndRestoreFocus)
        return () => {
            window.removeEventListener('scroll', repositionMenu, true)
            window.removeEventListener('resize', closeMenuAndRestoreFocus)
        }
    }, [activeMenuAnchor])

    // Portaled action menus stay visible outside clipped cards and follow their anchor while scrolling.
    useEffect(() => {
        const closeMenu = () => setActionMenu(null)
        const handleKey = event => {
            if (event.key !== 'Escape') return
            closeMenu()
            closeShareDialog()
            if (!deletingId) closeDeleteDialog()
        }
        document.addEventListener('click', closeMenu)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('click', closeMenu)
            document.removeEventListener('keydown', handleKey)
        }
    }, [closeDeleteDialog, closeShareDialog, deletingId])

    const openActionMenu = (event, lessonId) => {
        event.stopPropagation()
        if (pendingActionIdsRef.current.has(lessonId)) return
        if (actionMenu?.lessonId === lessonId) {
            setActionMenu(null)
            return
        }
        const anchor = event.currentTarget
        setActionMenu({ lessonId, anchor, ...getActionMenuPosition(anchor) })
    }

    const requestDelete = lesson => {
        setDeleteError('')
        setDeleteTarget(lesson)
    }

    const handleDelete = async () => {
        if (!deleteTarget || deletingId) return
        const lessonToDelete = deleteTarget
        const lessonId = deleteTarget.id
        const deletedIndex = lessons.findIndex(lesson => lesson.id === lessonId)
        const nextLessonId = lessons[deletedIndex + 1]?.id || lessons[deletedIndex - 1]?.id
        setDeletingId(lessonId)
        setDeleteError('')
        try {
            await lessonsAPI.delete(lessonId)
            setLessons(prev => prev.filter(lesson => lesson.id !== lessonId))
            setStats(prev => prev ? {
                ...prev,
                total_lessons: Math.max(0, Number(prev.total_lessons || 0) - 1),
                archived: Math.max(0, Number(prev.archived || 0) - (lessonToDelete.is_archived ? 1 : 0)),
                published: Math.max(0, Number(prev.published || 0) - (!lessonToDelete.is_archived && lessonToDelete.is_published ? 1 : 0)),
                drafts: Math.max(0, Number(prev.drafts || 0) - (!lessonToDelete.is_archived && !lessonToDelete.is_published ? 1 : 0)),
                total_views: Math.max(0, Number(prev.total_views || 0) - Number(lessonToDelete.views_count || 0)),
                total_downloads: Math.max(0, Number(prev.total_downloads || 0) - Number(lessonToDelete.downloads_count || 0)),
            } : prev)
            setDeleteTarget(null)
            showToast(labels.deleted)
            window.requestAnimationFrame(() => {
                const nextTrigger = nextLessonId && document.getElementById(`lesson-actions-trigger-${nextLessonId}`)
                ;(nextTrigger || document.getElementById('my-lessons-heading'))?.focus()
            })
            void Promise.all([loadLessons(true), loadStats()])
        } catch (e) {
            const message = e.code === 'LESSON_HAS_PURCHASES' ? labels.soldDeleteError : localizedError(e, labels.deleteError)
            setDeleteError(message)
        } finally {
            setDeletingId(null)
            window.requestAnimationFrame(() => deleteConfirmRef.current?.focus())
        }
    }

    const handleArchive = async (lesson) => {
        if (!beginLessonAction(lesson.id)) return
        const lessonIndex = lessons.findIndex(item => item.id === lesson.id)
        const fallbackLessonId = lessons[lessonIndex + 1]?.id || lessons[lessonIndex - 1]?.id
        const restoreArchiveFocusIfNeeded = () => window.requestAnimationFrame(() => {
            if (document.activeElement && document.activeElement !== document.body) return
            const currentTrigger = document.getElementById(`lesson-actions-trigger-${lesson.id}`)
            const fallbackTrigger = fallbackLessonId && document.getElementById(`lesson-actions-trigger-${fallbackLessonId}`)
            ;(currentTrigger || fallbackTrigger || document.getElementById('my-lessons-heading'))?.focus()
        })
        try {
            const result = await lessonsAPI.archive(lesson.id)
            const isArchived = Boolean(result.is_archived)
            const archiveDelta = isArchived ? 1 : -1
            setLessons(prev => prev.filter(item => item.id !== lesson.id))
            setStats(prev => prev ? {
                ...prev,
                archived: Math.max(0, Number(prev.archived || 0) + archiveDelta),
                published: Math.max(0, Number(prev.published || 0) - (lesson.is_published ? archiveDelta : 0)),
                drafts: Math.max(0, Number(prev.drafts || 0) - (!lesson.is_published ? archiveDelta : 0)),
            } : prev)
            showToast(isArchived ? labels.archived : labels.restored)
            void Promise.all([loadLessons(true), loadStats()])
        } catch (e) {
            showToast(localizedError(e, labels.actionError), 'error')
        } finally {
            finishLessonAction(lesson.id)
            restoreArchiveFocusIfNeeded()
        }
    }

    const handleDuplicate = async (id) => {
        if (!beginLessonAction(id)) return
        try {
            const duplicated = await lessonsAPI.duplicate(id)
            if (lessonMatchesQuery(duplicated, lessonsQueryRef.current)) {
                setLessons(prev => prev.some(lesson => lesson.id === duplicated.id) ? prev : [duplicated, ...prev])
            }
            setStats(prev => prev ? {
                ...prev,
                total_lessons: Number(prev.total_lessons || 0) + 1,
                drafts: Number(prev.drafts || 0) + 1,
            } : prev)
            showToast(labels.duplicated)
            void Promise.all([loadLessons(true), loadStats()])
        } catch (e) {
            showToast(localizedError(e, labels.duplicateError), 'error')
        } finally {
            finishLessonAction(id)
        }
    }

    const handleShare = async (id) => {
        if (!beginLessonAction(id)) return
        const requestId = ++shareRequestRef.current
        try {
            const data = await lessonsAPI.share(id)
            if (requestId === shareRequestRef.current) {
                setShareModal({ url: data.share_url, lessonId: id })
            }
        } catch (e) {
            if (requestId === shareRequestRef.current) {
                showToast(localizedError(e, labels.shareError), 'error')
            }
        } finally {
            finishLessonAction(id)
        }
    }

    const copyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(shareModal.url)
            showToast(labels.copied)
        } catch (e) {
            console.error(e)
            showToast(labels.copyError, 'error')
        }
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
            {/* Hidden print template */}
            <PrintTemplate ref={printRef} type="lesson" data={printLesson} slides={printSlides} language={language} />

            {/* Toast */}
            {toast && (
                <div role={toast.type === 'error' ? 'alert' : 'status'} aria-live="polite" style={{
                    position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
                    background: 'var(--color-bg-card, white)',
                    color: 'var(--color-gray-900)',
                    padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    animation: 'slideIn 0.3s ease',
                    fontWeight: 500,
                    borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    {toast.type === 'error'
                        ? <CheckCircle size={16} color="#ef4444" />
                        : <CheckCircle size={16} color="#10b981" />}
                    {toast.message}
                </div>
            )}

            {/* Share Modal */}
            {shareModal && (
                <div onMouseDown={event => { if (event.target === event.currentTarget) closeShareDialog() }} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
                }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" aria-describedby="share-dialog-description" onKeyDown={trapDialogFocus} style={{
                        background: 'var(--color-white, white)', borderRadius: '16px',
                        padding: '32px', maxWidth: '480px', width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                    }}>
                        <h3 id="share-dialog-title" style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>
                            <Share2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                            {labels.shareTitle}
                        </h3>
                        <p id="share-dialog-description" style={{ color: 'var(--color-gray-500, #6b7280)', margin: '0 0 16px', fontSize: '0.9rem' }}>
                            {labels.shareHelp}
                        </p>
                        <div style={{
                            background: 'var(--color-gray-100, #f3f4f6)', borderRadius: '8px',
                            padding: '12px 16px', wordBreak: 'break-all', fontSize: '0.85rem',
                            fontFamily: 'monospace', marginBottom: '16px'
                        }}>
                            {shareModal.url}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button autoFocus onClick={copyShareLink} style={{
                                flex: 1, padding: '10px', background: 'var(--gradient-primary, #245fb5)',
                                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <Copy size={16} /> {labels.copy}
                            </button>
                            <button onClick={closeShareDialog} style={{
                                padding: '10px 20px', background: 'var(--color-gray-100, #f3f4f6)',
                                border: 'none', borderRadius: '8px', cursor: 'pointer'
                            }}>{labels.close}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div
                    onMouseDown={event => {
                        if (event.target === event.currentTarget && !deletingId) closeDeleteDialog()
                    }}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.58)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1100, padding: '20px', backdropFilter: 'blur(3px)'
                    }}
                >
                    <div
                        ref={deleteDialogRef}
                        role="dialog"
                        tabIndex={-1}
                        aria-modal="true"
                        aria-labelledby="delete-dialog-title"
                        aria-describedby="delete-dialog-description"
                        onKeyDown={trapDialogFocus}
                        style={{
                            width: 'min(100%, 440px)', background: 'var(--color-bg-card, white)',
                            border: '1px solid var(--color-gray-100, #f3f4f6)', borderRadius: '20px',
                            boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)', padding: '28px',
                            maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box'
                        }}
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2',
                            color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
                        }}>
                            <Trash2 size={24} />
                        </div>
                        <h2 id="delete-dialog-title" style={{ margin: '0 0 8px', fontSize: '1.25rem', color: 'var(--color-gray-900, #111827)' }}>
                            {labels.deleteTitle}
                        </h2>
                        <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--color-gray-800, #1f2937)', overflowWrap: 'anywhere' }}>
                            {deleteTarget.title}
                        </p>
                        <p id="delete-dialog-description" style={{ margin: '0 0 20px', color: 'var(--color-gray-500, #6b7280)', lineHeight: 1.5 }}>
                            {labels.deleteText}
                        </p>
                        {deleteError && (
                            <div role="alert" style={{
                                background: '#fef2f2', color: '#b91c1c', borderRadius: '10px',
                                padding: '10px 12px', marginBottom: '16px', fontSize: '0.875rem'
                            }}>
                                {deleteError}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                autoFocus
                                onClick={closeDeleteDialog}
                                disabled={Boolean(deletingId)}
                                style={{
                                    padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--color-gray-200, #e5e7eb)',
                                    background: 'var(--color-bg-card, white)', color: 'var(--color-gray-700, #374151)',
                                    cursor: deletingId ? 'not-allowed' : 'pointer', fontWeight: 700
                                }}
                            >
                                {labels.cancel}
                            </button>
                            <button
                                ref={deleteConfirmRef}
                                onClick={handleDelete}
                                disabled={Boolean(deletingId)}
                                style={{
                                    padding: '10px 18px', borderRadius: '10px', border: 'none',
                                    background: '#dc2626', color: 'white', cursor: deletingId ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: deletingId ? 0.7 : 1
                                }}
                            >
                                {deletingId ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                                {deletingId ? labels.deleting : labels.delete}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <MaterialsTabs />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 id="my-lessons-heading" tabIndex={-1} style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BookOpen size={32} color="#245fb5" /> {labels.title}
                    </h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-gray-500)', fontSize: '1rem' }}>
                        {labels.greetingStart} <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{user?.name}</span>! {labels.greetingEnd}
                    </p>
                </div>
                <Link to="/builder" className="primary-btn" style={{ 
                    textDecoration: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '14px 28px',
                    background: 'var(--gradient-primary)',
                    boxShadow: '0 8px 25px rgba(37, 99, 235, 0.25)'
                }}>
                    <Plus size={20} /> {labels.create}
                </Link>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px', marginBottom: '40px'
                }}>
                    {[
                        { label: labels.total, value: stats.total_lessons, icon: <BookOpen size={24} />, color: '#245fb5', bg: 'rgba(36,95,181,0.08)' },
                        { label: labels.published, value: stats.published, icon: <CheckCircle size={24} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                        { label: labels.drafts, value: stats.drafts, icon: <FileText size={24} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                        { label: labels.views, value: stats.total_views, icon: <Eye size={24} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                    ].map(card => (
                        <div key={card.label} className="builder-card" style={{
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: card.bg, color: card.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {card.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)', lineHeight: '1.2' }}>{card.value ?? 0}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="builder-card" style={{
                padding: '16px 20px',
                marginBottom: '32px',
                display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                    <input
                        type="text"
                        aria-label={labels.searchLabel}
                        placeholder={labels.search}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="builder-input"
                        style={{ paddingLeft: '44px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <select aria-label={labels.subjectLabel} value={subject} onChange={e => setSubject(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '140px' }}>
                        {SUBJECTS.map(item => <option key={item.value || 'all'} value={item.value}>{item[language === 'kk' ? 'kk' : 'ru']}</option>)}
                    </select>

                    <select aria-label={labels.gradeLabel} value={grade} onChange={e => setGrade(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '130px' }}>
                        <option value="">{labels.allGrades}</option>
                        {GRADES.map(item => <option key={item} value={item}>{item} {labels.grade}</option>)}
                    </select>

                    <select aria-label={labels.statusLabel} value={status} onChange={e => setStatus(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '160px' }}>
                        {STATUSES.map(item => <option key={item.value || 'all'} value={item.value}>{item[language === 'kk' ? 'kk' : 'ru']}</option>)}
                    </select>
                </div>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '6px', background: 'var(--color-gray-100)', padding: '4px', borderRadius: '12px', marginLeft: 'auto' }}>
                    {[
                        { id: 'grid', label: labels.gridView, icon: <LayoutGrid size={18} /> },
                        { id: 'list', label: labels.listView, icon: <List size={18} /> }
                    ].map(v => (
                        <button key={v.id} onClick={() => setView(v.id)} aria-label={v.label} aria-pressed={view === v.id} style={{
                            padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                            background: view === v.id ? 'var(--color-white, white)' : 'transparent',
                            color: view === v.id ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
                            boxShadow: view === v.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center'
                        }}>
                            {v.icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lessons Grid/List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-gray-400, #9ca3af)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#245fb5' }} />
                    <p>{labels.loading}</p>
                </div>
            ) : lessons.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'var(--color-white, white)', borderRadius: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                }}>
                    <InboxEmptyIcon size={64} color="#d1d5db" />
                    <h3 style={{ margin: '16px 0 8px', color: 'var(--color-gray-700, #374151)' }}>
                        {search || subject || grade || status ? labels.nothing : labels.noLessons}
                    </h3>
                    <p style={{ color: 'var(--color-gray-400, #9ca3af)', margin: '0 0 24px' }}>
                        {search || subject || grade || status ? labels.changeFilters : labels.emptyHelp}
                    </p>
                    {!search && !subject && !grade && !status && (
                        <Link to="/builder" style={{
                            background: 'var(--gradient-primary, #245fb5)',
                            color: 'white', textDecoration: 'none', padding: '12px 28px',
                            borderRadius: '12px', fontWeight: 700, display: 'inline-flex', gap: '8px', alignItems: 'center'
                        }}>
                            <Plus size={18} /> {labels.createFirst}
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{
                    display: view === 'grid'
                        ? 'grid'
                        : 'flex',
                    gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' : undefined,
                    flexDirection: view === 'list' ? 'column' : undefined,
                    gap: '16px'
                }}>
                    {lessons.map(lesson => (
                        <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            view={view}
                            language={language}
                            labels={labels}
                            actionMenu={actionMenu}
                            openActionMenu={openActionMenu}
                            closeActionMenu={closeActionMenu}
                            deletingId={deletingId}
                            actionPending={pendingActionIds.has(lesson.id)}
                            onConduct={() => navigate(`/lesson/${lesson.id}/present?live=true`)}
                            onPrint={() => openPrint(lesson)}
                            onEdit={() => navigate(`/builder?edit=${lesson.id}`)}
                            onDelete={() => requestDelete(lesson)}
                            onArchive={() => handleArchive(lesson)}
                            onDuplicate={() => handleDuplicate(lesson.id)}
                            onShare={() => handleShare(lesson.id)}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .lesson-card-wrapper {
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .lesson-card-wrapper:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
                    border-color: var(--color-primary-200) !important;
                }
                
                .builder-card {
                    backdrop-filter: blur(8px);
                    background: var(--color-bg-card, rgba(255, 255, 255, 0.95)) !important;
                    border-radius: 20px;
                    border: 1px solid var(--color-gray-100);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                
                .builder-input {
                    width: 100%; padding: 12px 16px; border-radius: 12px;
                    border: 1px solid var(--color-gray-200);
                    background: var(--color-gray-50); fontSize: 0.9rem;
                    outline: none; transition: all 0.2s; color: var(--color-gray-900);
                }
                .builder-input:focus {
                    border-color: var(--color-primary-500);
                    box-shadow: 0 0 0 4px var(--color-primary-100);
                    background: white;
                }
                
                .primary-btn {
                    border: none; border-radius: 12px; cursor: pointer;
                    font-weight: 700; transition: all 0.2s; color: white;
                }
                .primary-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    )
}

function LessonCard({
    lesson, view, language, labels, actionMenu, openActionMenu, closeActionMenu,
    deletingId, actionPending, onConduct, onEdit, onDelete, onArchive, onDuplicate, onShare, onPrint
}) {
    const isGrid = view === 'grid'
    const isMenuOpen = actionMenu?.lessonId === lesson.id
    const titleId = `lesson-title-${lesson.id}`
    const menuId = `lesson-actions-${lesson.id}`

    const statusColor = lesson.is_archived
        ? '#6b7280' : lesson.is_published ? '#10b981' : '#f59e0b'

    const StatusIcon = lesson.is_archived ? Archive : lesson.is_published ? CheckCircle : FileText
    const statusLabel = lesson.is_archived ? labels.archivedStatus : lesson.is_published ? labels.publishedStatus : labels.draftStatus
    const menuItems = [
        { icon: <PlayCircle size={16} />, label: labels.conduct, action: onConduct, highlight: true },
        { icon: <Download size={16} />, label: labels.print, action: onPrint, restoreFocus: true },
        { icon: <Edit3 size={16} />, label: labels.edit, action: onEdit },
        { icon: <Copy size={16} />, label: labels.duplicate, action: onDuplicate, restoreFocus: true },
        { icon: <Share2 size={16} />, label: labels.share, action: onShare, restoreFocus: true },
        {
            icon: lesson.is_archived ? <ExternalLink size={16} /> : <Archive size={16} />,
            label: lesson.is_archived ? labels.restore : labels.archive,
            action: onArchive,
            restoreFocus: true,
        },
        { icon: <Trash2 size={16} />, label: labels.delete, action: onDelete, danger: true },
    ]

    const handleMenuKeyDown = event => {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            closeActionMenu(true)
            return
        }

        if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) return
        const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')]
        if (!items.length) return

        event.preventDefault()
        const currentIndex = items.indexOf(document.activeElement)
        let nextIndex
        if (event.key === 'Home') nextIndex = 0
        else if (event.key === 'End') nextIndex = items.length - 1
        else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
            nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1
        } else {
            nextIndex = currentIndex < 0 || currentIndex === items.length - 1 ? 0 : currentIndex + 1
        }
        items[nextIndex].focus()
    }

    return (
        <article aria-labelledby={titleId} className="builder-card lesson-card-wrapper" style={{
            overflow: 'hidden',
            display: 'flex',
            flexDirection: isGrid ? 'column' : 'row',
            opacity: lesson.is_archived ? 0.75 : 1,
            padding: 0,
            border: '1px solid var(--color-gray-100)',
            height: '100%'
        }}>
            {/* Thumbnail */}
            {isGrid && (
                <div style={{
                    height: '160px',
                    background: lesson.thumbnail_url
                        ? `url(${lesson.thumbnail_url}) center/cover`
                        : 'linear-gradient(135deg, #245fb5 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', flexShrink: 0
                }}>
                    {!lesson.thumbnail_url && (
                        <FileTypeIcon type={lesson.file_type} size={40} />
                    )}
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                        <StatusIcon size={11} color={statusColor} />
                        {statusLabel}
                    </div>
                </div>
            )}

            {/* Content */}
            <div style={{ padding: isGrid ? '16px' : '16px 20px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                        {!isGrid && (
                            <span style={{
                                background: statusColor + '20', color: statusColor,
                                fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                                <StatusIcon size={11} /> {statusLabel}
                            </span>
                        )}
                        <h3 id={titleId} style={{
                            margin: isGrid ? '0 0 6px' : '4px 0 4px',
                            fontSize: '1rem', fontWeight: 700, lineHeight: 1.3,
                            color: 'var(--color-gray-900, #111827)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                            {lesson.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {lesson.subject && (
                                <span style={{ fontSize: '0.75rem', color: '#245fb5', background: '#ede9fe', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                    {lesson.subject}
                                </span>
                            )}
                            {lesson.grade && (
                                <span style={{ fontSize: '0.75rem', color: '#0891b2', background: '#e0f2fe', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                    {lesson.grade} {labels.grade}
                                </span>
                            )}
                            {lesson.duration && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={12} /> {lesson.duration} {labels.minutes}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {lesson.views_count || 0}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatDate(lesson.created_at, language)}</span>
                        </div>
                    </div>

                    {/* Action Menu */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            id={`lesson-actions-trigger-${lesson.id}`}
                            onClick={event => openActionMenu(event, lesson.id)}
                            aria-label={`${labels.actions}: ${lesson.title}`}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-disabled={actionPending}
                            aria-controls={isMenuOpen ? menuId : undefined}
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                                background: 'var(--color-gray-100)', cursor: actionPending ? 'wait' : 'pointer',
                                color: 'var(--color-gray-600)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', opacity: actionPending ? 0.65 : 1
                            }}
                        >
                            {actionPending
                                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                : <MoreVertical size={18} />}
                        </button>

                        {isMenuOpen && typeof document !== 'undefined' && createPortal(
                            <div
                                id={menuId}
                                role="menu"
                                aria-label={`${labels.actions}: ${lesson.title}`}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={handleMenuKeyDown}
                                style={{
                                    position: 'fixed', top: actionMenu.top, left: actionMenu.left, zIndex: 10000,
                                    background: 'var(--color-bg-card, var(--color-white, white))', borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                    width: '216px', padding: '6px', maxHeight: 'calc(100vh - 16px)', overflowY: 'auto',
                                    border: '1px solid var(--color-gray-100, #f3f4f6)'
                                }}
                            >
                                {menuItems.map(item => (
                                    <button
                                        key={item.label}
                                        role="menuitem"
                                        onClick={() => { item.action(); closeActionMenu(Boolean(item.restoreFocus)) }}
                                        disabled={deletingId === lesson.id || actionPending}
                                        style={{
                                            width: '100%', padding: '9px 12px', border: 'none',
                                            background: item.highlight ? 'linear-gradient(135deg, rgba(36,95,181,0.08), rgba(139,92,246,0.08))' : 'none',
                                            cursor: 'pointer', borderRadius: '8px',
                                            display: 'flex', gap: '10px', alignItems: 'center',
                                            fontSize: '0.875rem', fontWeight: item.highlight ? 700 : 500, textAlign: 'left',
                                            color: item.danger ? '#ef4444' : item.highlight ? '#245fb5' : 'var(--color-gray-700, #374151)',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : item.highlight ? 'linear-gradient(135deg, rgba(36,95,181,0.15), rgba(139,92,246,0.15))' : 'var(--color-gray-50, #f9fafb)'}
                                        onMouseLeave={e => e.currentTarget.style.background = item.highlight ? 'linear-gradient(135deg, rgba(36,95,181,0.08), rgba(139,92,246,0.08))' : 'none'}
                                    >
                                        {item.icon} {item.label}
                                    </button>
                                ))}
                            </div>
                        , document.body)}
                    </div>
                </div>

                {/* Conduct Lesson Button — visible directly on card */}
                <div style={{ padding: '0 16px 16px', paddingTop: 0 }}>
                    <button
                        onClick={onConduct}
                        style={{
                            width: '100%', padding: '10px 16px',
                            background: 'linear-gradient(135deg, #245fb5 0%, #8b5cf6 100%)',
                            color: 'white', border: 'none', borderRadius: '10px',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(36,95,181,0.25)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(36,95,181,0.35)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(36,95,181,0.25)' }}
                    >
                        <PlayCircle size={18} />
                        {labels.conduct}
                    </button>
                </div>
            </div>
        </article>
    )
}
