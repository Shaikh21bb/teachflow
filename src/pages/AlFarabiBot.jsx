import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const STORAGE_KEY = 'urpaq_bot_chats'

function AlFarabiBot() {
    const { t, language } = useLanguage()

    // Helper: Initial Bot Message
    const getWelcomeMessage = (lang) => ({
        id: 1,
        type: 'bot',
        text: lang === 'kk'
            ? 'Сәлем! Мен әл-Фарабимін. Сізге қалай көмектесе аламын?'
            : 'Приветствую! Я аль-Фараби. Чем могу быть полезен?'
    })

    const [chats, setChats] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) return JSON.parse(saved)
        } catch(e) {}
        return []
    })

    const [currentChatId, setCurrentChatId] = useState(null)
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const botAvatar = "👳‍♂️" // Placeholder

    // Load initial chat if history exists, or create new
    useEffect(() => {
        if (chats.length === 0) {
            startNewChat()
        } else if (!currentChatId) {
            // Pick most recent
            const recent = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)[0]
            setCurrentChatId(recent.id)
            setMessages(recent.messages)
        }
    }, [])

    // Sync to LocalStorage on chat changes
    useEffect(() => {
        if (chats.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [chats])

    // Update active chat's messages locally in the array
    useEffect(() => {
        if (currentChatId && messages.length > 0) {
            setChats(prev => prev.map(c => 
                c.id === currentChatId 
                ? { ...c, messages, updatedAt: Date.now() }
                : c
            ))
        }
    }, [messages])

    // Update bot welcome message dynamically if user switches language on empty chat
    useEffect(() => {
        if (messages.length === 1 && messages[0].id === 1) {
            setMessages([getWelcomeMessage(language)])
        }
    }, [language])

    function scrollToBottom() {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    function startNewChat() {
        const newChat = {
            id: Date.now().toString(),
            title: language === 'kk' ? 'Жаңа чат' : 'Новый чат',
            messages: [getWelcomeMessage(language)],
            updatedAt: Date.now()
        }
        setChats(prev => [newChat, ...prev])
        setCurrentChatId(newChat.id)
        setMessages(newChat.messages)
        setInputValue('')
    }

    function selectChat(id) {
        const chat = chats.find(c => c.id === id)
        if (chat) {
            setCurrentChatId(id)
            setMessages(chat.messages)
            setInputValue('')
        }
    }

    function deleteChat(id, e) {
        e.stopPropagation()
        const updated = chats.filter(c => c.id !== id)
        setChats(updated)
        
        if (currentChatId === id) {
            if (updated.length > 0) {
                const recent = [...updated].sort((a,b) => b.updatedAt - a.updatedAt)[0]
                setCurrentChatId(recent.id)
                setMessages(recent.messages)
            } else {
                startNewChat()
            }
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault()
        if (!inputValue.trim() || !currentChatId) return

        const userText = inputValue.trim()
        const newMsg = { id: Date.now(), type: 'user', text: userText }
        const newMessages = [...messages, newMsg]
        
        setMessages(newMessages)
        setInputValue('')
        setIsTyping(true)

        // Generate title if it's the first real user message
        if (messages.length === 1) {
            setChats(prev => prev.map(c => 
                c.id === currentChatId
                ? { ...c, title: (userText.length > 25 ? userText.substring(0, 25) + "..." : userText) }
                : c
            ))
        }

        try {
            const { aiAPI } = await import('../api')
            const conversationHistory = newMessages.slice(-8).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))

            const response = await aiAPI.chat(userText, conversationHistory, language)

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: response.response
            }])
        } catch (error) {
            console.error('AI Error:', error)
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: language === 'kk' ? 'Қате орын алды. Қайталап көріңіз.' : 'Произошла ошибка. Попробуйте снова.'
            }])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 'var(--spacing-4)', paddingBottom: 0 }}>
                <h1 className="page-title">{t('alfarabi.title')}</h1>
                <p className="page-subtitle">{t('alfarabi.subtitle')}</p>
            </div>

            {/* Layout Wrapper */}
            <div className="chat-layout" style={{ 
                display: 'flex', flex: 1, gap: 'var(--spacing-6)', overflow: 'hidden' 
            }}>
                {/* Sidebar History */}
                <div className="chat-sidebar" style={{
                    width: '300px',
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-gray-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--color-gray-100)' }}>
                        <button onClick={startNewChat} style={{
                            width: '100%', padding: '12px', background: 'var(--color-primary-50)',
                            color: 'var(--color-primary-600)', border: '1px dashed var(--color-primary-300)',
                            borderRadius: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                        }}>
                             <span>➕</span> {language === 'kk' ? 'Жаңа чат' : 'Новый чат'}
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2)' }}>
                        {[...chats].sort((a,b) => b.updatedAt - a.updatedAt).map(chat => (
                            <div key={chat.id} onClick={() => selectChat(chat.id)} className="chat-history-item" style={{
                                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                                background: currentChatId === chat.id ? 'var(--color-primary-50)' : 'transparent',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                transition: 'background 0.2s', marginBottom: '4px'
                            }}>
                                <div style={{ 
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    fontSize: '0.95rem', color: currentChatId === chat.id ? 'var(--color-primary-700)' : 'var(--color-gray-700)',
                                    fontWeight: currentChatId === chat.id ? 500 : 400
                                }}>
                                    💬 {chat.title}
                                </div>
                                <button onClick={(e) => deleteChat(chat.id, e)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                                    opacity: currentChatId === chat.id ? 1 : 0.3, transition: 'opacity 0.2s',
                                    fontSize: '1rem'
                                }} title="Удалить" className="delete-chat-btn">
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Interface */}
                <div style={{
                    flex: 1,
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-gray-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        padding: 'var(--spacing-6)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-4)',
                        background: '#f8fafc'
                    }}>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    gap: 'var(--spacing-3)',
                                    flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: msg.type === 'user' ? 'var(--gradient-primary)' : '#0f766e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    color: 'white',
                                    flexShrink: 0
                                }}>
                                    {msg.type === 'user' ? '👤' : botAvatar}
                                </div>
                                <div style={{
                                    background: msg.type === 'user' ? 'var(--color-primary-600)' : 'white',
                                    color: msg.type === 'user' ? 'white' : 'var(--color-gray-800)',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    borderTopLeftRadius: msg.type === 'bot' ? '4px' : '16px',
                                    borderTopRightRadius: msg.type === 'user' ? '4px' : '16px',
                                    maxWidth: '75%',
                                    boxShadow: msg.type === 'bot' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: '#0f766e',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem', color: 'white'
                                }}>
                                    {botAvatar}
                                </div>
                                <div style={{
                                    background: 'white', padding: '12px 16px', borderRadius: '16px',
                                    borderTopLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <span className="typing-dot">.</span>
                                    <span className="typing-dot" style={{ animationDelay: '0.2s' }}>.</span>
                                    <span className="typing-dot" style={{ animationDelay: '0.4s' }}>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'white',
                        borderTop: '1px solid var(--color-gray-100)'
                    }}>
                        <form onSubmit={handleSendMessage} style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('alfarabi.placeholder')}
                                style={{
                                    paddingRight: '120px',
                                    height: '54px',
                                    borderRadius: '27px',
                                    border: '1px solid var(--color-gray-200)',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                    background: '#f8fafc'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    position: 'absolute',
                                    right: '6px',
                                    top: '6px',
                                    bottom: '6px',
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '21px',
                                    padding: '0 24px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: !inputValue.trim() ? 0.6 : 1
                                }}
                                disabled={!inputValue.trim()}
                            >
                                {language === 'kk' ? 'Жіберу' : 'Отправить'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                .typing-dot {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: typing 1.4s infinite ease-in-out both;
                }
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                .chat-history-item:hover {
                    background: var(--color-gray-50) !important;
                }
                .chat-history-item:hover .delete-chat-btn {
                    opacity: 1 !important;
                }
                @media (max-width: 768px) {
                    .chat-layout { flex-direction: column !important; overflow: auto !important; }
                    .chat-sidebar { width: 100% !important; height: 180px !important; flex: none !important; }
                }
            `}</style>
        </div>
    )
}

export default AlFarabiBot
