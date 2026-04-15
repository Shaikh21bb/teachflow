import { useState, useEffect, useRef } from 'react';
import { useAuth, authFetch } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    User, Link2, Users, CheckCircle, AlertCircle, Loader2,
    Instagram, Youtube, Send, Globe, MapPin, School,
    UserCheck, UserPlus, Search, Camera, Settings, ChevronRight,
    Star, BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const subjectOptions = [
    'Математика', 'Физика', 'Химия', 'Биология',
    'Информатика', 'История', 'География', 'Русский язык',
    'Қазақ тілі', 'Ағылшын тілі', 'Əдебиет', 'Музыка', 'Дене тәрбиесі'
];

export default function Profile() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeout = useRef(null);

    // Profile state
    const [profileData, setProfileData] = useState({
        name: '', bio: '', school: '', city: '', avatar_url: '', subjects: [],
    });

    // Links state
    const [links, setLinks] = useState({
        instagram_url: '', youtube_url: '', telegram_url: '', website_url: '',
    });

    // Stats
    const [stats, setStats] = useState({ following: 0, followers: 0 });

    // Colleagues
    const [colleagues, setColleagues] = useState([]);
    const [colleaguesLoading, setColleaguesLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    // ─── Load profile ────────────────────────────────────────────────
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/auth/teacher-profile`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setProfileData({
                name: data.user.name || '',
                bio: data.profile.bio || '',
                school: data.profile.school || '',
                city: data.profile.city || '',
                avatar_url: data.profile.avatar_url || '',
                subjects: data.user.subjects || [],
            });
            setLinks({
                instagram_url: data.profile.instagram_url || '',
                youtube_url: data.profile.youtube_url || '',
                telegram_url: data.profile.telegram_url || '',
                website_url: data.profile.website_url || '',
            });
            setStats(data.stats || { following: 0, followers: 0 });
        } catch {
            setError(language === 'kk' ? 'Профиль жүктелмеді' : 'Не удалось загрузить профиль');
        } finally {
            setLoading(false);
        }
    };

    // ─── Load colleagues ─────────────────────────────────────────────
    const fetchColleagues = async (search = '') => {
        try {
            setColleaguesLoading(true);
            const url = search
                ? `${API_BASE}/auth/colleagues?search=${encodeURIComponent(search)}`
                : `${API_BASE}/auth/colleagues`;
            const res = await authFetch(url);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setColleagues(data.colleagues || []);
        } catch {
            setColleagues([]);
        } finally {
            setColleaguesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'colleagues') fetchColleagues(searchQuery);
    }, [activeTab]);

    const handleSearch = (q) => {
        setSearchQuery(q);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => fetchColleagues(q), 400);
    };

    // ─── Save profile ────────────────────────────────────────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(''); setError('');
        try {
            const res = await authFetch(`${API_BASE}/auth/teacher-profile`, {
                method: 'PUT',
                body: JSON.stringify({ ...profileData, ...links }),
            });
            if (!res.ok) throw new Error('Failed');
            showMsg(t('profile.profileSaved'), 'success');
        } catch {
            showMsg(language === 'kk' ? 'Қате шықты' : 'Произошла ошибка', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Save links ──────────────────────────────────────────────────
    const handleSaveLinks = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(''); setError('');
        try {
            const res = await authFetch(`${API_BASE}/auth/teacher-profile`, {
                method: 'PUT',
                body: JSON.stringify({ ...profileData, ...links }),
            });
            if (!res.ok) throw new Error('Failed');
            showMsg(t('profile.linksSaved'), 'success');
        } catch {
            showMsg(language === 'kk' ? 'Қате шықты' : 'Произошла ошибка', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Toggle colleague ────────────────────────────────────────────
    const handleToggleColleague = async (targetId) => {
        setTogglingId(targetId);
        try {
            const res = await authFetch(`${API_BASE}/auth/colleagues/toggle`, {
                method: 'POST',
                body: JSON.stringify({ targetId }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setColleagues(prev => prev.map(c =>
                c.id === targetId ? { ...c, is_following: data.action === 'followed' } : c
            ));
            setStats(prev => ({
                ...prev,
                following: data.action === 'followed' ? prev.following + 1 : Math.max(0, prev.following - 1)
            }));
        } catch {}
        setTogglingId(null);
    };

    const showMsg = (msg, type) => {
        if (type === 'success') { setMessage(msg); setError(''); }
        else { setError(msg); setMessage(''); }
        setTimeout(() => { setMessage(''); setError(''); }, 3000);
    };

    const handleSubjectToggle = (sub) => {
        setProfileData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(sub)
                ? prev.subjects.filter(s => s !== sub)
                : [...prev.subjects, sub]
        }));
    };

    const nameInitials = profileData.name
        ? profileData.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : (user?.name?.charAt(0)?.toUpperCase() || '?');

    const tabs = [
        { id: 'profile', icon: <User size={18} />, label: t('profile.tabProfile') },
        { id: 'links', icon: <Link2 size={18} />, label: t('profile.tabLinks') },
        { id: 'colleagues', icon: <Users size={18} />, label: t('profile.tabColleagues') },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} className="spin" style={{ color: 'var(--color-primary-500)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--color-gray-500)' }}>{language === 'kk' ? 'Жүктелуде...' : 'Загрузка...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'var(--spacing-6)' }}>

            {/* ── Hero Profile Card ──────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-400) 100%)',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '28px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative blob */}
                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '200px', height: '200px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', right: '80px',
                    width: '140px', height: '140px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '50%',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {profileData.avatar_url ? (
                            <img
                                src={profileData.avatar_url}
                                alt="avatar"
                                style={{
                                    width: '90px', height: '90px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '3px solid rgba(255,255,255,0.4)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}
                                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                        ) : null}
                        <div style={{
                            width: '90px', height: '90px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            display: profileData.avatar_url ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 700,
                            border: '3px solid rgba(255,255,255,0.4)',
                            color: 'white',
                        }}>
                            {nameInitials}
                        </div>
                        <div style={{
                            position: 'absolute', bottom: '0', right: '0',
                            width: '28px', height: '28px',
                            background: 'white',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                            onClick={() => setActiveTab('profile')}
                            title={language === 'kk' ? 'Суретті өзгерту' : 'Изменить фото'}
                        >
                            <Camera size={14} style={{ color: 'var(--color-primary-600)' }} />
                        </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, marginBottom: '4px' }}>
                            {profileData.name || user?.name}
                        </h1>
                        <p style={{ opacity: 0.8, margin: 0, marginBottom: '8px', fontSize: '0.9rem' }}>
                            {user?.email}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {profileData.city && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85, fontSize: '0.85rem' }}>
                                    <MapPin size={13} /> {profileData.city}
                                </span>
                            )}
                            {profileData.school && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85, fontSize: '0.85rem' }}>
                                    <School size={13} /> {profileData.school}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '24px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{stats.following}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{t('profile.following')}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{stats.followers}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{t('profile.followers')}</div>
                        </div>
                    </div>
                </div>

                {/* Subjects pills */}
                {profileData.subjects.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px', position: 'relative' }}>
                        {profileData.subjects.map(s => (
                            <span key={s} style={{
                                padding: '4px 12px',
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: '20px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                border: '1px solid rgba(255,255,255,0.2)',
                            }}>
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Tabs ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                background: 'var(--color-gray-100)',
                borderRadius: '14px',
                padding: '5px',
                marginBottom: '24px',
                gap: '2px',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '11px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === tab.id
                                ? 'white'
                                : 'transparent',
                            color: activeTab === tab.id
                                ? 'var(--color-primary-600)'
                                : 'var(--color-gray-600)',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                        }}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Alerts ────────────────────────────────────────── */}
            {message && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--color-success-50)',
                    color: 'var(--color-success-700)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    border: '1px solid var(--color-success-200)',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    <CheckCircle size={18} /> {message}
                </div>
            )}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--color-error-50)',
                    color: 'var(--color-error-700)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    border: '1px solid var(--color-error-200)',
                }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                TAB 1: PROFILE INFO
            ════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
                <form className="card" onSubmit={handleSaveProfile}
                    style={{ padding: '28px', borderRadius: '16px' }}>

                    {/* Avatar URL */}
                    <div style={{ marginBottom: '20px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Camera size={15} style={{ color: 'var(--color-primary-500)' }} />
                            {t('profile.avatarUrl')}
                        </label>
                        <input
                            className="input"
                            type="url"
                            value={profileData.avatar_url}
                            onChange={e => setProfileData(p => ({ ...p, avatar_url: e.target.value }))}
                            placeholder={t('profile.avatarPlaceholder')}
                        />
                        <small style={{ color: 'var(--color-gray-400)', marginTop: '4px', display: 'block' }}>
                            {language === 'kk'
                                ? 'Google Drive, Cloudinary немесе кез-келген суреттің тікелей сілтемесі'
                                : 'Прямая ссылка на фото с Google Drive, Cloudinary или любого сервиса'}
                        </small>
                    </div>

                    {/* Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label className="label">
                            {language === 'kk' ? 'Аты-жөні' : 'Имя'}
                        </label>
                        <input
                            className="input"
                            value={profileData.name}
                            onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                            required
                            minLength={2}
                        />
                    </div>

                    {/* School + City in 2 cols */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <School size={15} style={{ color: 'var(--color-primary-500)' }} />
                                {t('profile.school')}
                            </label>
                            <input
                                className="input"
                                value={profileData.school}
                                onChange={e => setProfileData(p => ({ ...p, school: e.target.value }))}
                                placeholder={t('profile.schoolPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={15} style={{ color: 'var(--color-primary-500)' }} />
                                {t('profile.city')}
                            </label>
                            <input
                                className="input"
                                value={profileData.city}
                                onChange={e => setProfileData(p => ({ ...p, city: e.target.value }))}
                                placeholder={t('profile.cityPlaceholder')}
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">
                            {t('profile.bio')}
                        </label>
                        <textarea
                            className="input"
                            rows={4}
                            value={profileData.bio}
                            onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))}
                            placeholder={t('profile.bioPlaceholder')}
                            style={{ resize: 'vertical', minHeight: '100px', lineHeight: 1.6 }}
                        />
                    </div>

                    {/* Subjects */}
                    <div style={{ marginBottom: '28px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={15} style={{ color: 'var(--color-primary-500)' }} />
                            {t('profile.subjects')}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {subjectOptions.map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSubjectToggle(sub)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        border: `1.5px solid ${profileData.subjects.includes(sub)
                                            ? 'var(--color-primary-500)'
                                            : 'var(--color-gray-200)'}`,
                                        background: profileData.subjects.includes(sub)
                                            ? 'var(--color-primary-50)'
                                            : 'var(--color-gray-50)',
                                        color: profileData.subjects.includes(sub)
                                            ? 'var(--color-primary-700)'
                                            : 'var(--color-gray-600)',
                                        fontSize: '0.82rem',
                                        fontWeight: profileData.subjects.includes(sub) ? 600 : 400,
                                        cursor: 'pointer',
                                        transition: 'all 0.18s',
                                    }}
                                >
                                    {profileData.subjects.includes(sub) && '✓ '}{sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Security shortcut */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'var(--color-gray-50)',
                        borderRadius: '10px',
                        marginBottom: '24px',
                        border: '1px solid var(--color-gray-200)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings size={18} style={{ color: 'var(--color-gray-500)' }} />
                            <span style={{ fontSize: '0.88rem', color: 'var(--color-gray-700)' }}>
                                {language === 'kk' ? 'Пароль өзгерту' : 'Изменить пароль'}
                            </span>
                        </div>
                        <Link to="/settings" style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: 'var(--color-primary-600)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}>
                            {t('profile.goToSettings')} <ChevronRight size={16} />
                        </Link>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}
                            style={{ minWidth: '160px', borderRadius: '10px', fontWeight: 700 }}>
                            {saving ? <Loader2 size={18} className="spin" /> : t('profile.saveProfile')}
                        </button>
                    </div>
                </form>
            )}

            {/* ════════════════════════════════════════════════════
                TAB 2: LINKS
            ════════════════════════════════════════════════════ */}
            {activeTab === 'links' && (
                <form className="card" onSubmit={handleSaveLinks}
                    style={{ padding: '28px', borderRadius: '16px' }}>

                    <p style={{ color: 'var(--color-gray-500)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {language === 'kk'
                            ? 'Əріптестеріңіз сіздің сілтемелеріңізді профиліңіз арқылы көре алады.'
                            : 'Коллеги смогут видеть ваши ссылки через профиль.'}
                    </p>

                    {[
                        {
                            key: 'instagram_url', icon: <Instagram size={20} />,
                            label: t('profile.instagram'), placeholder: 'https://instagram.com/username',
                            color: '#E1306C',
                        },
                        {
                            key: 'youtube_url', icon: <Youtube size={20} />,
                            label: t('profile.youtube'), placeholder: 'https://youtube.com/@channel',
                            color: '#FF0000',
                        },
                        {
                            key: 'telegram_url', icon: <Send size={20} />,
                            label: t('profile.telegram'), placeholder: 'https://t.me/username',
                            color: '#229ED9',
                        },
                        {
                            key: 'website_url', icon: <Globe size={20} />,
                            label: t('profile.website'), placeholder: 'https://mysite.kz',
                            color: '#10b981',
                        },
                    ].map(field => (
                        <div key={field.key} style={{ marginBottom: '20px' }}>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: field.color }}>{field.icon}</span>
                                {field.label}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: field.color, pointerEvents: 'none',
                                }}>
                                    {field.icon}
                                </div>
                                <input
                                    className="input"
                                    type="url"
                                    value={links[field.key]}
                                    onChange={e => setLinks(p => ({ ...p, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    style={{ paddingLeft: '46px' }}
                                />
                            </div>
                            {links[field.key] && (
                                <a
                                    href={links[field.key]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '0.78rem',
                                        color: 'var(--color-primary-600)',
                                        marginTop: '4px',
                                        display: 'inline-block',
                                        textDecoration: 'none',
                                    }}
                                >
                                    ↗ {language === 'kk' ? 'Тексеру' : 'Проверить'}
                                </a>
                            )}
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}
                            style={{ minWidth: '160px', borderRadius: '10px', fontWeight: 700 }}>
                            {saving ? <Loader2 size={18} className="spin" /> : t('profile.saveLinks')}
                        </button>
                    </div>
                </form>
            )}

            {/* ════════════════════════════════════════════════════
                TAB 3: COLLEAGUES
            ════════════════════════════════════════════════════ */}
            {activeTab === 'colleagues' && (
                <div>
                    {/* Search */}
                    <div style={{
                        position: 'relative',
                        marginBottom: '20px',
                    }}>
                        <Search size={18} style={{
                            position: 'absolute', left: '14px', top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-gray-400)',
                            pointerEvents: 'none',
                        }} />
                        <input
                            className="input"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder={t('profile.searchColleagues')}
                            style={{ paddingLeft: '44px', borderRadius: '12px' }}
                        />
                    </div>

                    {/* Filter chips */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {[
                            { label: language === 'kk' ? 'Барлығы' : 'Все', filter: '' },
                            { label: language === 'kk' ? 'Байланыстарым' : 'Мои связи', filter: 'following' },
                        ].map(f => (
                            <button
                                key={f.filter}
                                type="button"
                                onClick={() => {
                                    if (f.filter === 'following') {
                                        setColleagues(prev => prev.slice().sort((a, b) =>
                                            b.is_following - a.is_following
                                        ));
                                    } else {
                                        fetchColleagues(searchQuery);
                                    }
                                }}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    border: '1.5px solid var(--color-gray-200)',
                                    background: 'var(--color-gray-50)',
                                    color: 'var(--color-gray-700)',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    {colleaguesLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                            <Loader2 size={32} className="spin" style={{ marginBottom: '12px' }} />
                            <p>{language === 'kk' ? 'Жүктелуде...' : 'Загрузка...'}</p>
                        </div>
                    ) : colleagues.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px',
                            background: 'var(--color-gray-50)',
                            borderRadius: '16px',
                            border: '2px dashed var(--color-gray-200)',
                        }}>
                            <Users size={48} style={{ color: 'var(--color-gray-300)', marginBottom: '16px' }} />
                            <p style={{ color: 'var(--color-gray-500)', fontWeight: 500 }}>{t('profile.noColleagues')}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {colleagues.map(colleague => (
                                <ColleagueCard
                                    key={colleague.id}
                                    colleague={colleague}
                                    onToggle={handleToggleColleague}
                                    toggling={togglingId === colleague.id}
                                    t={t}
                                    language={language}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Colleague Card Component ─────────────────────────────────────────────────
function ColleagueCard({ colleague, onToggle, toggling, t, language }) {
    const initials = colleague.name
        ? colleague.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const linkIcons = [
        colleague.instagram_url && { href: colleague.instagram_url, icon: <Instagram size={14} />, color: '#E1306C' },
        colleague.youtube_url && { href: colleague.youtube_url, icon: <Youtube size={14} />, color: '#FF0000' },
        colleague.telegram_url && { href: colleague.telegram_url, icon: <Send size={14} />, color: '#229ED9' },
        colleague.website_url && { href: colleague.website_url, icon: <Globe size={14} />, color: '#10b981' },
    ].filter(Boolean);

    return (
        <div className="card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderRadius: '14px',
            transition: 'transform 0.18s, box-shadow 0.18s',
            cursor: 'default',
            border: colleague.is_following ? '1.5px solid var(--color-primary-200)' : '1px solid var(--color-gray-200)',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
            }}
        >
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
                {colleague.avatar_url ? (
                    <img
                        src={colleague.avatar_url}
                        alt={colleague.name}
                        style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                ) : null}
                <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: colleague.avatar_url ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                }}>
                    {initials}
                </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                    {colleague.name}
                </div>
                {colleague.school && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <School size={12} /> {colleague.school}
                        {colleague.city && <span> · <MapPin size={12} style={{ display: 'inline' }} /> {colleague.city}</span>}
                    </div>
                )}
                {colleague.subjects?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {colleague.subjects.slice(0, 3).map(s => (
                            <span key={s} style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: 'var(--color-primary-50)',
                                color: 'var(--color-primary-700)',
                                fontSize: '0.72rem',
                                fontWeight: 500,
                            }}>
                                {s}
                            </span>
                        ))}
                        {colleague.subjects.length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', padding: '2px 0' }}>
                                +{colleague.subjects.length - 3}
                            </span>
                        )}
                    </div>
                )}
                {linkIcons.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {linkIcons.map((l, i) => (
                            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
                                style={{ color: l.color, display: 'flex', alignItems: 'center' }}
                                onClick={e => e.stopPropagation()}
                            >
                                {l.icon}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Follow button */}
            <button
                onClick={() => onToggle(colleague.id)}
                disabled={toggling}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: colleague.is_following
                        ? '1.5px solid var(--color-primary-300)'
                        : '1.5px solid var(--color-gray-300)',
                    background: colleague.is_following
                        ? 'var(--color-primary-50)'
                        : 'white',
                    color: colleague.is_following
                        ? 'var(--color-primary-700)'
                        : 'var(--color-gray-700)',
                    fontWeight: 600,
                    fontSize: '0.83rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    minWidth: '110px',
                    justifyContent: 'center',
                }}
            >
                {toggling
                    ? <Loader2 size={14} className="spin" />
                    : colleague.is_following
                        ? <><UserCheck size={15} /> {t('profile.removeColleague')}</>
                        : <><UserPlus size={15} /> {t('profile.addColleague')}</>
                }
            </button>
        </div>
    );
}
