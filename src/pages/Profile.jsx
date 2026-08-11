import { useState, useEffect, useRef } from 'react';
import { useAuth, authFetch } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    User, Users, CheckCircle, AlertCircle, Loader2,
    Instagram, Youtube, Send, Globe, MapPin, School,
    UserCheck, UserPlus, Search, Camera, Settings, ChevronRight,
    BookOpen, Edit3, X, MessageSquare
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadToCloudinary, chatAPI } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const subjectOptions = [
    'Математика', 'Физика', 'Химия', 'Биология',
    'Информатика', 'История', 'География', 'Русский язык',
    'Қазақ тілі', 'Ағылшын тілі', 'Əдебиет', 'Музыка', 'Дене тәрбиесі'
];

export default function Profile() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    
    // Load states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    // Colleagues search
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

    const [stats, setStats] = useState({ following: 0, followers: 0 });

    const [colleagues, setColleagues] = useState([]);
    const [colleaguesLoading, setColleaguesLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const result = await uploadToCloudinary(file);
            setProfileData(p => ({ ...p, avatar_url: result.secure_url }));
            showMsg(language === 'kk' ? 'Сурет сәтті жүктелді!' : 'Фото успешно загружено!', 'success');
        } catch (err) {
            const errMsg = err.message || (language === 'kk' ? 'Белгісіз қате' : 'Unknown error');
            showMsg((language === 'kk' ? 'Сурет жүктеуде қате шықты: ' : 'Ошибка при загрузке фото: ') + errMsg, 'error');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

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

    const handleSaveFullProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(''); setError('');
        try {
            const res = await authFetch(`${API_BASE}/auth/teacher-profile`, {
                method: 'PUT',
                body: JSON.stringify({ ...profileData, ...links }),
            });
            if (!res.ok) throw new Error('Failed');
            showMsg(t('profile.profileSaved') || (language === 'kk' ? 'Сақталды!' : 'Сохранено!'), 'success');
            setIsEditing(false); // Close edit mode on success
        } catch {
            showMsg(language === 'kk' ? 'Қате шықты' : 'Произошла ошибка', 'error');
        } finally {
            setSaving(false);
        }
    };

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

    // Simplify tabs for mobile
    const tabs = [
        { id: 'profile', icon: <User size={18} />, label: t('profile.tabProfile') || (language === 'kk' ? 'Профиль' : 'Профиль') },
        { id: 'colleagues', icon: <Users size={18} />, label: t('profile.tabColleagues') || (language === 'kk' ? 'Әріптестер' : 'Коллеги') },
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

    const hasFilledInfo = profileData.bio || profileData.school || profileData.city || profileData.subjects.length > 0 || 
                          links.instagram_url || links.youtube_url || links.telegram_url || links.website_url;

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'var(--spacing-4)', paddingBottom: '100px' }}>
            
            {/* ── Tabs ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                background: 'var(--color-gray-100)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '20px',
                gap: '2px',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setIsEditing(false); setMessage(''); setError(''); }}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            color: activeTab === tab.id ? 'var(--color-primary-600)' : 'var(--color-gray-600)',
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
                    padding: '12px 16px', background: 'var(--color-success-50)', color: 'var(--color-success-700)',
                    borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--color-success-200)',
                }}>
                    <CheckCircle size={18} /> {message}
                </div>
            )}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', background: 'var(--color-error-50)', color: 'var(--color-error-700)',
                    borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--color-error-200)',
                }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                TAB 1: PROFILE INFO & EDIT
            ════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
                <div>
                    {!isEditing ? (
                        /* --- VIEW MODE --- */
                        <div>
                            {/* Minimal Hero Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-400) 100%)',
                                borderRadius: '20px', padding: '24px', marginBottom: '20px',
                                color: 'white', position: 'relative', overflow: 'hidden',
                                textAlign: 'center',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                {/* Decor */}
                                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                                <div style={{ position: 'absolute', bottom: -40, left: -20, width: 90, height: 90, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

                                {/* Avatar */}
                                <div style={{ display: 'inline-flex', position: 'relative', marginBottom: '16px' }}>
                                    {profileData.avatar_url ? (
                                        <img
                                            src={profileData.avatar_url}
                                            alt="avatar"
                                            style={{
                                                width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover',
                                                border: '3px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                                            }}
                                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                    ) : null}
                                    <div style={{
                                        width: '84px', height: '84px', borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                                        display: profileData.avatar_url ? 'none' : 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.8rem', fontWeight: 700,
                                        border: '3px solid rgba(255,255,255,0.4)', color: 'white',
                                    }}>
                                        {nameInitials}
                                    </div>
                                </div>

                                {/* Name & Contacts */}
                                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, marginBottom: '4px' }}>
                                    {profileData.name || user?.name}
                                </h1>
                                <p style={{ opacity: 0.8, margin: 0, marginBottom: '12px', fontSize: '0.85rem' }}>
                                    {user?.email}
                                </p>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                                    {profileData.city && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9, fontSize: '0.8rem', background: 'rgba(0,0,0,0.15)', padding: '4px 10px', borderRadius: '20px' }}>
                                            <MapPin size={12} /> {profileData.city}
                                        </span>
                                    )}
                                    {profileData.school && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9, fontSize: '0.8rem', background: 'rgba(0,0,0,0.15)', padding: '4px 10px', borderRadius: '20px' }}>
                                            <School size={12} /> {profileData.school}
                                        </span>
                                    )}
                                </div>

                                {/* Subtle Stats */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.following}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{language === 'kk' ? 'Байланыстар' : 'Связи'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.followers}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{language === 'kk' ? 'Оқырмандар' : 'Подписчики'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional View Details */}
                            {hasFilledInfo ? (
                                <div className="card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                                    {profileData.bio && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                                {language === 'kk' ? 'Өзім туралы' : 'О себе'}
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-800)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {profileData.bio}
                                            </p>
                                        </div>
                                    )}

                                    {profileData.subjects.length > 0 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                                {language === 'kk' ? 'Пәндер' : 'Предметы'}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {profileData.subjects.map(sub => (
                                                    <span key={sub} style={{ padding: '4px 10px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 500 }}>
                                                        {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Links as Icon Row */}
                                    {(links.instagram_url || links.youtube_url || links.telegram_url || links.website_url) && (
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                                {language === 'kk' ? 'Сілтемелер' : 'Контакты'}
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                {links.instagram_url && <a href={links.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', padding: '10px', background: 'var(--color-gray-50)', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}><Instagram size={20} /></a>}
                                                {links.youtube_url && <a href={links.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#FF0000', padding: '10px', background: 'var(--color-gray-50)', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}><Youtube size={20} /></a>}
                                                {links.telegram_url && <a href={links.telegram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#229ED9', padding: '10px', background: 'var(--color-gray-50)', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}><Send size={20} /></a>}
                                                {links.website_url && <a href={links.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', padding: '10px', background: 'var(--color-gray-50)', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}><Globe size={20} /></a>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--color-primary-50)', borderRadius: '16px', marginBottom: '20px' }}>
                                    <p style={{ color: 'var(--color-primary-800)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                        {language === 'kk' ? 'Сіздің профиліңіз әлі бос. Басқа ұстаздар сізді табуы үшін толтырыңыз!' : 'Ваш профиль пока пуст. Заполните его, чтобы другие учителя могли найти вас!'}
                                    </p>
                                </div>
                            )}

                            {/* Full width Edit Button */}
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit3 size={18} /> {hasFilledInfo ? (language === 'kk' ? 'Профильді өңдеу' : 'Редактировать') : (language === 'kk' ? 'Толық толтыру' : 'Заполнить полностью')}
                            </button>
                        </div>
                    ) : (
                        /* --- EDIT MODE --- */
                        <form className="card" onSubmit={handleSaveFullProfile} style={{ padding: '20px', borderRadius: '16px', animation: 'fadeIn 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                    {language === 'kk' ? 'Профильді өңдеу' : 'Редактирование'}
                                </h2>
                                <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-500)', cursor: 'pointer', padding: '4px' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Avatar */}
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Camera size={14} style={{ color: 'var(--color-primary-500)' }} /> {language === 'kk' ? 'Профиль суреті' : 'Фото профиля'}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-gray-100)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                        {profileData.avatar_url ? (
                                            <img src={profileData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }}>
                                                <User size={24} />
                                            </div>
                                        )}
                                        {isUploading && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Loader2 size={20} className="spin" color="white" />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="avatar-upload" disabled={isUploading} />
                                        <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                            <Camera size={14} /> {language === 'kk' ? 'Суретті жүктеу' : 'Загрузить фото'}
                                        </label>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', margin: '0 0 4px' }}>
                                            {language === 'kk' ? 'Немесе URL сілтемені қойыңыз:' : 'Или вставьте URL ссылку:'}
                                        </p>
                                        <input className="input" style={{ padding: '6px 10px', fontSize: '0.85rem' }} type="url" value={profileData.avatar_url} onChange={e => setProfileData(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">{language === 'kk' ? 'Аты-жөні' : 'Имя'}</label>
                                <input className="input" value={profileData.name} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} required minLength={2} />
                            </div>

                            {/* Bio */}
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">{t('profile.bio') || 'О себе'}</label>
                                <textarea className="input" rows={3} value={profileData.bio} onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))} style={{ resize: 'vertical' }} />
                            </div>

                            {/* School + City */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <School size={13} style={{ color: 'var(--color-primary-500)' }} /> {t('profile.school') || 'Мектеп / Школа'}
                                    </label>
                                    <input className="input" value={profileData.school} onChange={e => setProfileData(p => ({ ...p, school: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={13} style={{ color: 'var(--color-primary-500)' }} /> {t('profile.city') || 'Қала / Город'}
                                    </label>
                                    <input className="input" value={profileData.city} onChange={e => setProfileData(p => ({ ...p, city: e.target.value }))} />
                                </div>
                            </div>

                            {/* Subjects */}
                            <div style={{ marginBottom: '24px' }}>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <BookOpen size={13} style={{ color: 'var(--color-primary-500)' }} /> {t('profile.subjects') || 'Предметы'}
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {subjectOptions.map(sub => (
                                        <button
                                            key={sub} type="button" onClick={() => handleSubjectToggle(sub)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px',
                                                border: `1px solid ${profileData.subjects.includes(sub) ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                                                background: profileData.subjects.includes(sub) ? 'var(--color-primary-50)' : 'var(--color-gray-50)',
                                                color: profileData.subjects.includes(sub) ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                                                fontSize: '0.75rem', fontWeight: profileData.subjects.includes(sub) ? 600 : 400, cursor: 'pointer',
                                            }}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Social Links merged into Edit Mode */}
                            <div style={{ padding: '16px', background: 'var(--color-gray-50)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--color-gray-100)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: '12px' }}>
                                    {language === 'kk' ? 'Әлеуметтік желілер (міндетті емес)' : 'Соц. сети (необязательно)'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Instagram size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#E1306C' }} />
                                        <input className="input" type="url" value={links.instagram_url} onChange={e => setLinks(p => ({ ...p, instagram_url: e.target.value }))} placeholder="Instagram URL" style={{ paddingLeft: '36px', fontSize: '0.85rem' }} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Youtube size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#FF0000' }} />
                                        <input className="input" type="url" value={links.youtube_url} onChange={e => setLinks(p => ({ ...p, youtube_url: e.target.value }))} placeholder="YouTube URL" style={{ paddingLeft: '36px', fontSize: '0.85rem' }} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Send size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#229ED9' }} />
                                        <input className="input" type="url" value={links.telegram_url} onChange={e => setLinks(p => ({ ...p, telegram_url: e.target.value }))} placeholder="Telegram URL" style={{ paddingLeft: '36px', fontSize: '0.85rem' }} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                                        <input className="input" type="url" value={links.website_url} onChange={e => setLinks(p => ({ ...p, website_url: e.target.value }))} placeholder="Сайт URL / Website URL" style={{ paddingLeft: '36px', fontSize: '0.85rem' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Security Link inside edit mode */}
                            <Link to="/settings" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: '10px',
                                marginBottom: '24px', textDecoration: 'none', border: '1px dashed var(--color-primary-300)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                                        {language === 'kk' ? 'Құпия сөзді өзгерту' : 'Изменить пароль'}
                                    </span>
                                </div>
                                <ChevronRight size={16} style={{ color: 'var(--color-primary-500)' }} />
                            </Link>

                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700 }}>
                                {saving ? <Loader2 size={18} className="spin" /> : (language === 'kk' ? 'Сақтау' : 'Сохранить')}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                TAB 2: COLLEAGUES
            ════════════════════════════════════════════════════ */}
            {activeTab === 'colleagues' && (
                <div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                        <input className="input" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder={t('profile.searchColleagues') || 'Іздеу...'} style={{ paddingLeft: '44px', borderRadius: '12px' }} />
                    </div>

                    {/* Filter chips */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[{ label: language === 'kk' ? 'Барлығы' : 'Все', filter: '' }, { label: language === 'kk' ? 'Байланыстарым' : 'Мои связи', filter: 'following' }].map(f => (
                            <button
                                key={f.filter} type="button"
                                onClick={() => {
                                    if (f.filter === 'following') setColleagues(prev => prev.slice().sort((a, b) => b.is_following - a.is_following));
                                    else fetchColleagues(searchQuery);
                                }}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--color-gray-200)',
                                    background: 'var(--color-gray-50)', color: 'var(--color-gray-700)',
                                    fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    {colleaguesLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontSize: '0.9rem' }}>{language === 'kk' ? 'Жүктелуде...' : 'Загрузка...'}</p>
                        </div>
                    ) : colleagues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--color-gray-50)', borderRadius: '16px', border: '1px dashed var(--color-gray-200)' }}>
                            <Users size={36} style={{ color: 'var(--color-gray-300)', margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--color-gray-500)', fontWeight: 500, fontSize: '0.9rem' }}>{t('profile.noColleagues') || 'Табылмады'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {colleagues.map(colleague => (
                                <ColleagueCard key={colleague.id} colleague={colleague} onToggle={handleToggleColleague} toggling={togglingId === colleague.id} t={t} language={language} navigate={navigate} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Colleague Card Component ─────────────────────────────────────────────────
function ColleagueCard({ colleague, onToggle, toggling, t, language, navigate }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    const [msgLoading, setMsgLoading] = useState(false)

    const initials = (colleague.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']
    const avatarColor = colors[(colleague.name?.charCodeAt(0) || 0) % colors.length]
    const [imgError, setImgError] = useState(false)

    const linkIcons = [
        colleague.instagram_url && { href: colleague.instagram_url, icon: <Instagram size={13} />, color: '#E1306C' },
        colleague.youtube_url && { href: colleague.youtube_url, icon: <Youtube size={13} />, color: '#FF0000' },
        colleague.telegram_url && { href: colleague.telegram_url, icon: <Send size={13} />, color: '#229ED9' },
        colleague.website_url && { href: colleague.website_url, icon: <Globe size={13} />, color: '#10b981' },
    ].filter(Boolean)

    const handleMessage = async (e) => {
        e.stopPropagation()
        setMsgLoading(true)
        try {
            await chatAPI.openConversation(colleague.id)
        } catch { /* open anyway */ }
        navigate(`/chat?with=${colleague.id}`)
        setMsgLoading(false)
    }

    return (
        <div
            onClick={() => navigate(`/teachers/${colleague.id}`)}
            style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '16px',
                border: colleague.is_following ? '1.5px solid var(--color-primary-200)' : '1px solid var(--color-gray-100)',
                background: colleague.is_following
                    ? 'linear-gradient(to right, var(--color-primary-50), white)'
                    : 'var(--color-white, white)',
                cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s',
                position: 'relative'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
            {/* Avatar */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
                {colleague.avatar_url && !imgError ? (
                    <img src={colleague.avatar_url} alt={colleague.name} onError={() => setImgError(true)}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                        {initials}
                    </div>
                )}
                {colleague.is_following && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: '16px', height: '16px', borderRadius: '50%', background: '#6366f1', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={9} color="white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-gray-900)' }}>
                    {colleague.name}
                </div>
                {(colleague.school || colleague.city) && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-gray-500)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {colleague.school && <><School size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {colleague.school}</>}
                        {colleague.school && colleague.city && <span> · </span>}
                        {colleague.city && <><MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {colleague.city}</>}
                    </div>
                )}
                {/* Subjects pills */}
                {colleague.subjects?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {colleague.subjects.slice(0, 2).map(s => (
                            <span key={s} style={{ background: 'var(--color-primary-100, #e0e7ff)', color: 'var(--color-primary-700, #4338ca)', padding: '1px 7px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 600 }}>
                                {s}
                            </span>
                        ))}
                        {colleague.subjects.length > 2 && (
                            <span style={{ color: 'var(--color-gray-400)', fontSize: '0.68rem' }}>+{colleague.subjects.length - 2}</span>
                        )}
                    </div>
                )}
                {linkIcons.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                        {linkIcons.map((l, i) => (
                            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
                                style={{ color: l.color, display: 'flex', alignItems: 'center' }}
                                onClick={e => e.stopPropagation()}
                            >{l.icon}</a>
                        ))}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {/* Message button */}
                <button
                    onClick={handleMessage}
                    disabled={msgLoading}
                    title={L('Написать', 'Жазу')}
                    style={{
                        width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                        background: 'var(--color-primary-100, #e0e7ff)',
                        color: 'var(--color-primary-600, #4f46e5)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-200, #c7d2fe)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary-100, #e0e7ff)'}
                >
                    {msgLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={14} />}
                </button>

                {/* Follow/Unfollow button */}
                <button
                    onClick={() => onToggle(colleague.id)}
                    disabled={toggling}
                    title={colleague.is_following ? L('Отписаться', 'Жазылымнан шығу') : L('Подписаться', 'Жазылу')}
                    style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        border: colleague.is_following ? 'none' : '1.5px solid var(--color-gray-200)',
                        background: colleague.is_following ? 'var(--color-primary-600, #4f46e5)' : 'transparent',
                        color: colleague.is_following ? 'white' : 'var(--color-gray-500)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s'
                    }}
                >
                    {toggling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : colleague.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                </button>
            </div>
        </div>
    )
}

