// User Profile Component
function UserProfile() {
    const { user, logout } = useAuth()
    const { language } = useLanguage()
    const [showDropdown, setShowDropdown] = useState(false)

    if (!user) return null

    function handleLogout() {
        logout()
        window.location.href = '/'
    }

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="topbar-user"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ cursor: 'pointer' }}
            >
                <div className="topbar-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </div>
                <div className="topbar-user-info">
                    <div className="topbar-user-name">{user.name}</div>
                    <div className="topbar-user-role">{user.role === 'teacher' ? (language === 'kk' ? 'Мұғалім' : 'Учитель') : user.role}</div>
                </div>
            </div>

            {showDropdown && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 999
                        }}
                        onClick={() => setShowDropdown(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 'var(--spacing-2)',
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '200px',
                        padding: 'var(--spacing-2)',
                        zIndex: 1000
                    }}>
                        <div style={{
                            padding: 'var(--spacing-3)',
                            borderBottom: '1px solid var(--color-gray-200)'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{user.name}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{user.email}</div>
                        </div>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleLogout}
                            style={{ width: '100%', justifyContent: 'flex-start', marginTop: 'var(--spacing-2)' }}
                        >
                            🚪 {language === 'kk' ? 'Шығу' : 'Выйти'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
