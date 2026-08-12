import { useState, useEffect } from 'react'
import { scheduleAPI, lessonsAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { Plus, Trash2, Edit3, Clock, X, CheckCircle, AlertCircle, Loader2, Calendar } from 'lucide-react'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

export default function Schedule() {
    const { language } = useLanguage()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const DAYS = [
        { dow: 1, short: L('Пн','Дс'), full: L('Понедельник','Дүйсенбі') },
        { dow: 2, short: L('Вт','Сс'), full: L('Вторник','Сейсенбі') },
        { dow: 3, short: L('Ср','Ср'), full: L('Среда','Сәрсенбі') },
        { dow: 4, short: L('Чт','Бс'), full: L('Четверг','Бейсенбі') },
        { dow: 5, short: L('Пт','Жм'), full: L('Пятница','Жұма') },
        { dow: 6, short: L('Сб','Сб'), full: L('Суббота','Сенбі') },
        { dow: 0, short: L('Вс','Жс'), full: L('Воскресенье','Жексенбі') },
    ]

    const todayDow = new Date().getDay()
    const [schedule, setSchedule] = useState([])
    const [loading, setLoading] = useState(true)
    const [lessons, setLessons] = useState([])
    const [modal, setModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const [activeDay, setActiveDay] = useState(todayDow)

    const [form, setForm] = useState({
        lesson_id: '', title: '', subject: '', class_name: '',
        day_of_week: todayDow, start_time: '08:00',
        duration: 45, color: '#6366f1'
    })

    useEffect(() => {
        scheduleAPI.getWeek().then(d => setSchedule(d.schedule || [])).catch(()=>{}).finally(() => setLoading(false))
        lessonsAPI.getAll().then(d => setLessons(Array.isArray(d) ? d : d.lessons || [])).catch(()=>{})
    }, [])

    const showToast = (msg, type='success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const openAdd = (dow) => {
        setEditing(null)
        setForm({ lesson_id:'', title:'', subject:'', class_name:'', day_of_week: dow !== undefined ? dow : activeDay, start_time:'08:00', duration:45, color:'#6366f1' })
        setModal(true)
    }

    const openEdit = (item) => {
        setEditing(item)
        setForm({ lesson_id: item.lesson_id||'', title: item.title, subject: item.subject||'', class_name: item.class_name||'', day_of_week: item.day_of_week, start_time: item.start_time, duration: item.duration||45, color: item.color||'#6366f1' })
        setModal(true)
    }

    const handleLessonSelect = (lessonId) => {
        const lesson = lessons.find(l => String(l.id) === String(lessonId))
        if (lesson) {
            setForm(f => ({ ...f, lesson_id: lessonId, title: lesson.title, subject: lesson.subject||f.subject, duration: lesson.duration||f.duration }))
        } else {
            setForm(f => ({ ...f, lesson_id: '' }))
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) return
        setSaving(true)
        try {
            let result
            if (editing) {
                result = await scheduleAPI.update(editing.id, form)
            } else {
                result = await scheduleAPI.add(form)
            }
            setSchedule(result.schedule || [])
            setModal(false)
            showToast(editing ? L('Обновлено', 'Жаңартылды') : L('Добавлено', 'Қосылды'))
        } catch (err) {
            showToast(err.message, 'error')
        }
        setSaving(false)
    }

    const handleDelete = async (id) => {
        await scheduleAPI.remove(id)
        setSchedule(prev => prev.filter(s => s.id !== id))
        showToast(L('Удалено', 'Жойылды'))
    }

    const forDay = (dow) => schedule.filter(s => s.day_of_week === dow).sort((a,b) => a.start_time.localeCompare(b.start_time))
    const todayItems = forDay(todayDow)

    return (
        <div style={{ maxWidth: 1100, margin:'0 auto', paddingBottom: 60 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

            {/* Toast */}
            {toast && (
                <div style={{ position:'fixed', top:80, right:24, zIndex:9999, background:'white', border:'1px solid #e5e7eb', borderLeft:`4px solid ${toast.type==='error'?'#ef4444':'#10b981'}`, borderRadius:12, padding:'12px 18px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', display:'flex', alignItems:'center', gap:10, animation:'slideIn 0.3s ease', fontWeight:600, color:'#111827', fontSize:'0.875rem' }}>
                    {toast.type==='error' ? <AlertCircle size={16} color="#ef4444"/> : <CheckCircle size={16} color="#10b981"/>} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ margin:'0 0 4px', fontSize:'1.7rem', fontWeight:900, color:'#111827', display:'flex', alignItems:'center', gap:10 }}>
                        <Calendar size={28} color="#6366f1" /> {L('Расписание','Кесте')}
                    </h1>
                    <p style={{ margin:0, color:'#6b7280', fontSize:'0.875rem' }}>
                        {L('Ваши уроки по дням недели','Апта күндеріндегі сабақтарыңыз')}
                    </p>
                </div>
                <button onClick={() => openAdd()} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', border:'none', borderRadius:12, fontWeight:700, fontSize:'0.875rem', cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Plus size={16} /> {L('Добавить урок','Сабақ қосу')}
                </button>
            </div>

            {/* Today highlight */}
            {todayItems.length > 0 && (
                <div style={{ background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'1px solid #c7d2fe', borderRadius:16, padding:'16px 20px', marginBottom:20 }}>
                    <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#4338ca', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', animation:'pulse 1.5s ease infinite' }} />
                        {L('Сегодня','Бүгін')} — {todayItems.length} {L('урок(ов)','сабақ')}
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        {todayItems.map(item => (
                            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, background:'white', borderRadius:12, padding:'10px 14px', border:`1px solid ${item.color}30`, boxShadow:'0 2px 6px rgba(0,0,0,0.05)' }}>
                                <div style={{ width:10, height:10, borderRadius:'50%', background:item.color, flexShrink:0 }} />
                                <div>
                                    <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#111827' }}>{item.title}</div>
                                    <div style={{ fontSize:'0.72rem', color:'#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                                        <Clock size={10}/> {item.start_time} · {item.duration} мин
                                        {item.class_name && ` · ${item.class_name}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Day tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:20, background:'#f4f4f5', borderRadius:12, padding:4, overflowX:'auto' }}>
                {DAYS.map(d => {
                    const count = forDay(d.dow).length
                    const isToday = d.dow === todayDow
                    const isActive = d.dow === activeDay
                    return (
                        <button key={d.dow} onClick={() => setActiveDay(d.dow)} style={{
                            flex:1, minWidth:60, padding:'8px 6px', border:'none', borderRadius:9, cursor:'pointer',
                            background: isActive ? 'white' : 'transparent',
                            color: isActive ? '#111827' : isToday ? '#6366f1' : '#9ca3af',
                            fontWeight: isActive ? 700 : isToday ? 700 : 500, fontSize:'0.82rem',
                            boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                            transition:'all 0.12s', position:'relative', textAlign:'center'
                        }}>
                            {d.short}
                            {count > 0 && <span style={{ display:'block', fontSize:'0.65rem', color: isActive ? '#6366f1' : '#9ca3af', fontWeight:700 }}>{count}</span>}
                            {isToday && <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'#6366f1' }} />}
                        </button>
                    )
                })}
            </div>

            {/* Day content */}
            {loading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
                    <Loader2 size={36} color="#6366f1" style={{ animation:'spin 1s linear infinite' }}/>
                </div>
            ) : (
                <div>
                    {(() => {
                        const items = forDay(activeDay)
                        const dayInfo = DAYS.find(d => d.dow === activeDay)
                        return items.length === 0 ? (
                            <div style={{ textAlign:'center', padding:'48px 20px', background:'white', borderRadius:16, border:'1px solid #e5e7eb' }}>
                                <Calendar size={44} color="#d1d5db" style={{ marginBottom:12 }}/>
                                <h3 style={{ margin:'0 0 6px', color:'#374151', fontWeight:700 }}>{L('Нет уроков','Сабақтар жоқ')} — {dayInfo?.full}</h3>
                                <p style={{ margin:'0 0 18px', fontSize:'0.875rem', color:'#9ca3af' }}>{L('Добавьте урок в расписание','Кестеге сабақ қосыңыз')}</p>
                                <button onClick={() => openAdd(activeDay)} style={{ padding:'9px 20px', background:'#6366f1', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.875rem' }}>
                                    <Plus size={15} /> {L('Добавить','Қосу')}
                                </button>
                            </div>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                {items.map(item => (
                                    <div key={item.id} style={{ background:'white', borderRadius:14, border:`1px solid #e5e7eb`, borderLeft:`4px solid ${item.color}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                                        <div style={{ textAlign:'center', minWidth:52, flexShrink:0 }}>
                                            <div style={{ fontWeight:800, fontSize:'1.1rem', color:item.color, lineHeight:1 }}>{item.start_time}</div>
                                            <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:2 }}>{item.duration} мин</div>
                                        </div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                                            <div style={{ fontSize:'0.75rem', color:'#9ca3af', display:'flex', gap:8, flexWrap:'wrap', marginTop:3 }}>
                                                {item.subject && <span>{item.subject}</span>}
                                                {item.class_name && <span>· {item.class_name}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                            <button onClick={() => openEdit(item)} style={{ width:32, height:32, borderRadius:9, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' }}>
                                                <Edit3 size={14}/>
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} style={{ width:32, height:32, borderRadius:9, border:'none', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => openAdd(activeDay)} style={{ padding:'11px', border:'1.5px dashed #d1d5db', borderRadius:12, background:'transparent', color:'#9ca3af', cursor:'pointer', fontWeight:600, fontSize:'0.875rem', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all 0.12s' }}
                                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366f1';e.currentTarget.style.color='#6366f1'}}
                                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.color='#9ca3af'}}>
                                    <Plus size={15}/> {L('Добавить урок на этот день','Бұл күнге сабақ қосу')}
                                </button>
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
                    onClick={() => setModal(false)}>
                    <div style={{ background:'white', borderRadius:20, maxWidth:480, width:'100%', padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                            <h3 style={{ margin:0, fontWeight:800, fontSize:'1.05rem' }}>
                                {editing ? L('Редактировать','Өзгерту') : L('Добавить урок','Сабақ қосу')}
                            </h3>
                            <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><X size={18}/></button>
                        </div>
                        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            {/* Link to existing lesson (optional) */}
                            <div>
                                <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Связать с уроком (необязательно)','Сабақпен байланыстыру')}</label>
                                <select value={form.lesson_id} onChange={e => handleLessonSelect(e.target.value)}
                                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', background:'white', color:'#374151' }}>
                                    <option value="">{L('— Без привязки —','— Байланыссыз —')}</option>
                                    {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                            </div>
                            {/* Title */}
                            <div>
                                <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Название *','Атауы *')}</label>
                                <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                                    placeholder={L('Математика 5А','Математика 5А')}
                                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }}
                                    onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='#e5e7eb'}/>
                            </div>
                            {/* Day + Time */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                <div>
                                    <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('День недели','Апта күні')}</label>
                                    <select value={form.day_of_week} onChange={e=>setForm(f=>({...f,day_of_week:parseInt(e.target.value)}))}
                                        style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', background:'white' }}>
                                        {DAYS.map(d=><option key={d.dow} value={d.dow}>{d.full}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Время начала','Басталу уақыты')}</label>
                                    <input type="time" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}
                                        style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }}/>
                                </div>
                            </div>
                            {/* Subject + Class + Duration */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:10 }}>
                                <div>
                                    <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Предмет','Пән')}</label>
                                    <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder={L('Математика','Математика')}
                                        style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }}/>
                                </div>
                                <div>
                                    <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Класс','Сынып')}</label>
                                    <input value={form.class_name} onChange={e=>setForm(f=>({...f,class_name:e.target.value}))} placeholder="5А"
                                        style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }}/>
                                </div>
                                <div>
                                    <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:5, color:'#374151' }}>{L('Мин','Мин')}</label>
                                    <input type="number" min={1} max={300} value={form.duration} onChange={e=>setForm(f=>({...f,duration:parseInt(e.target.value)||45}))}
                                        style={{ width:'100%', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:9, fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }}/>
                                </div>
                            </div>
                            {/* Color */}
                            <div>
                                <label style={{ display:'block', fontWeight:600, fontSize:'0.82rem', marginBottom:8, color:'#374151' }}>{L('Цвет','Түс')}</label>
                                <div style={{ display:'flex', gap:8 }}>
                                    {COLORS.map(c => (
                                        <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))}
                                            style={{ width:26, height:26, borderRadius:'50%', background:c, border:form.color===c?'3px solid #111827':'2px solid transparent', cursor:'pointer', transition:'all 0.12s' }}/>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:10, marginTop:6 }}>
                                <button type="button" onClick={()=>setModal(false)} style={{ flex:1, padding:'11px', border:'1px solid #e5e7eb', borderRadius:10, background:'white', cursor:'pointer', fontWeight:600, fontSize:'0.875rem' }}>{L('Отмена','Болдырмау')}</button>
                                <button type="submit" disabled={saving} style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', cursor:'pointer', fontWeight:700, fontSize:'0.875rem', display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:saving?0.7:1 }}>
                                    {saving ? <Loader2 size={15} style={{animation:'spin 0.7s linear infinite'}}/> : null}
                                    {editing ? L('Сохранить','Сақтау') : L('Добавить','Қосу')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
