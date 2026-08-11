export let API_BASE = import.meta.env.VITE_API_URL || '';
if (!API_BASE) {
    if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            API_BASE = 'http://localhost:3001/api';
        } else {
            // Fallback for production if VITE_API_URL is missing
            API_BASE = '/api'; 
        }
    } else {
        API_BASE = '/api';
    }
}

// ─── Token helpers ────────────────────────────────────────
const getToken = () => localStorage.getItem('auth_token');
const getRefreshToken = () => localStorage.getItem('auth_refresh_token');
const setTokens = (access, refresh) => {
    localStorage.setItem('auth_token', access);
    if (refresh) localStorage.setItem('auth_refresh_token', refresh);
};
const clearTokens = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
};

let _isRefreshing = false;
let _refreshQueue = [];

async function _doRefresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    setTokens(data.token, data.refreshToken);
    return data.token;
}

// Generic fetch wrapper with auto token refresh
async function fetchAPI(endpoint, options = {}) {
    const makeRequest = (token) => fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    let res = await makeRequest(getToken());

    // Auto-refresh if token expired
    if (res.status === 401) {
        const body = await res.clone().json().catch(() => ({}));
        if (body.code === 'TOKEN_EXPIRED') {
            if (!_isRefreshing) {
                _isRefreshing = true;
                try {
                    const newToken = await _doRefresh();
                    _isRefreshing = false;
                    _refreshQueue.forEach(cb => cb(newToken));
                    _refreshQueue = [];
                    res = await makeRequest(newToken);
                } catch {
                    _isRefreshing = false;
                    _refreshQueue.forEach(cb => cb(null));
                    _refreshQueue = [];
                    clearTokens();
                    window.location.href = '/login';
                    throw new Error('Сессия истекла. Войдите снова.');
                }
            } else {
                await new Promise(resolve => _refreshQueue.push(resolve));
                res = await makeRequest(getToken());
            }
        } else {
            // Not TOKEN_EXPIRED — likely NO_TOKEN or INVALID_TOKEN
            clearTokens();
            window.location.href = '/login';
            throw new Error(body.error || 'Ошибка авторизации');
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'API request failed');
    }
    return res.json();
}

// Lessons API
export const lessonsAPI = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/lessons${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id, shareToken) => {
        const q = shareToken ? `?share_token=${shareToken}` : '';
        return fetchAPI(`/lessons/${id}${q}`);
    },
    getSlides: (id) => fetchAPI(`/lessons/${id}/slides`),
    getPublic: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return fetchAPI(`/lessons/public${q ? `?${q}` : ''}`);
    },
    getSaved: () => fetchAPI('/lessons/saved'),
    like: (id) => fetchAPI(`/lessons/${id}/like`, { method: 'POST' }),
    save: (id) => fetchAPI(`/lessons/${id}/save`, { method: 'POST' }),
    create: (lesson) => fetchAPI('/lessons', { method: 'POST', body: JSON.stringify(lesson) }),
    update: (id, lesson) => fetchAPI(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(lesson) }),
    delete: (id) => fetchAPI(`/lessons/${id}`, { method: 'DELETE' }),
    archive: (id) => fetchAPI(`/lessons/${id}/archive`, { method: 'PATCH' }),
    duplicate: (id) => fetchAPI(`/lessons/${id}/duplicate`, { method: 'POST' }),
    share: (id) => fetchAPI(`/lessons/${id}/share`, { method: 'POST' }),
    getStatsSummary: () => fetchAPI('/lessons/stats/summary'),
};

// Lesson Files API
export const lessonFilesAPI = {
    getByLesson: (lessonId) => fetchAPI(`/lesson-files/${lessonId}`),
    create: (fileData) => fetchAPI('/lesson-files', { method: 'POST', body: JSON.stringify(fileData) }),
    delete: (id) => fetchAPI(`/lesson-files/${id}`, { method: 'DELETE' }),
};

// Assignments API
export const assignmentsAPI = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/assignments${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => fetchAPI(`/assignments/${id}`),
    getSubmissions: (id) => fetchAPI(`/assignments/${id}/submissions`),
    create: (assignment) => fetchAPI('/assignments', { method: 'POST', body: JSON.stringify(assignment) }),
    update: (id, assignment) => fetchAPI(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(assignment) }),
    delete: (id) => fetchAPI(`/assignments/${id}`, { method: 'DELETE' })
};

// Classes API
export const classesAPI = {
    getAll: () => fetchAPI('/classes'),
    getById: (id) => fetchAPI(`/classes/${id}`),
    getStudents: (id) => fetchAPI(`/classes/${id}/students`),
    create: (classData) => fetchAPI('/classes', { method: 'POST', body: JSON.stringify(classData) }),
    addStudent: (classId, student) => fetchAPI(`/classes/${classId}/students`, { method: 'POST', body: JSON.stringify(student) }),
    update: (id, classData) => fetchAPI(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(classData) }),
    delete: (id) => fetchAPI(`/classes/${id}`, { method: 'DELETE' }),
    deleteStudent: (classId, studentId) => fetchAPI(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' })
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => fetchAPI('/dashboard/stats'),
    getUpcomingLessons: () => fetchAPI('/dashboard/upcoming-lessons'),
    getNotifications: () => fetchAPI('/notifications'),
    getUnreadCount: () => fetchAPI('/notifications/unread-count'),
    markAllRead: () => fetchAPI('/notifications/read-all', { method: 'PUT' }),
    markOneRead: (id) => fetchAPI(`/notifications/${id}/read`, { method: 'PUT' }),
};

// AI API
export const aiAPI = {
    chat: (message, conversationHistory = [], language = 'ru') => fetchAPI('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, conversationHistory, language })
    }),
    lessonPlan: (data) => fetchAPI('/ai/lesson-plan', { method: 'POST', body: JSON.stringify(data) }),
    generateLesson: (data) => fetchAPI('/ai/generate-lesson', { method: 'POST', body: JSON.stringify(data) }),
    quiz: (data) => fetchAPI('/ai/quiz', { method: 'POST', body: JSON.stringify(data) }),
    summarize: (content, language = 'ru') => fetchAPI('/ai/summarize', { method: 'POST', body: JSON.stringify({ content, language }) }),
    translate: (content, from = 'ru', to = 'kk') => fetchAPI('/ai/translate', { method: 'POST', body: JSON.stringify({ content, from, to }) }),
    getStatus: () => fetchAPI('/ai/status')
};

// Open Lessons API
export const openLessonsAPI = {
    getAll: () => fetchAPI('/open-lessons'),
    getById: (id) => fetchAPI(`/open-lessons/${id}`),
    generate: (data) => fetchAPI('/open-lessons/generate', { method: 'POST', body: JSON.stringify(data) }),
    create: (lesson) => fetchAPI('/open-lessons', { method: 'POST', body: JSON.stringify(lesson) }),
    update: (id, lesson) => fetchAPI(`/open-lessons/${id}`, { method: 'PUT', body: JSON.stringify(lesson) }),
    saveTeams: (id, teams) => fetchAPI(`/open-lessons/${id}/teams`, { method: 'POST', body: JSON.stringify({ teams }) }),
    delete: (id) => fetchAPI(`/open-lessons/${id}`, { method: 'DELETE' })
};

// Integrations API
export const integrationsAPI = {
    getAll: () => fetchAPI('/integrations'),
    connectTelegram: (data) => fetchAPI('/integrations/telegram', { method: 'POST', body: JSON.stringify(data) }),
    connectAI: (data) => fetchAPI('/integrations/ai', { method: 'POST', body: JSON.stringify(data) }),
    disconnect: (type) => fetchAPI(`/integrations/${type}`, { method: 'DELETE' }),
};

// Quizzes API
export const quizzesAPI = {
    getAll: () => fetchAPI('/quizzes'),
    getById: (id) => fetchAPI(`/quizzes/${id}`),
    create: (quiz) => fetchAPI('/quizzes', { method: 'POST', body: JSON.stringify(quiz) }),
    update: (id, quiz) => fetchAPI(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(quiz) }),
    delete: (id) => fetchAPI(`/quizzes/${id}`, { method: 'DELETE' }),
    submitAttempt: (quizId, attempt) => fetchAPI(`/quizzes/${quizId}/attempts`, { method: 'POST', body: JSON.stringify(attempt) }),
    getAttempts: (quizId) => fetchAPI(`/quizzes/${quizId}/attempts`),
    getReport: (quizId) => fetchAPI(`/quizzes/${quizId}/report`),
    aiGenerate: (data) => fetchAPI('/quizzes/ai-generate', { method: 'POST', body: JSON.stringify(data) }),
    assign: (quizId, data) => fetchAPI(`/quizzes/${quizId}/assign`, { method: 'POST', body: JSON.stringify(data) }),
};

// Reports API
export const reportsAPI = {
    getDashboard: (period = 'week') => fetchAPI(`/reports?period=${period}`),
};

// Telegram API
export const telegramAPI = {
    getStatus: () => fetchAPI('/telegram/status'),
    generateInviteCode: (classId) => fetchAPI(`/telegram/class/${classId}/invite-code`, { method: 'POST' }),
    sendToClass: (class_id, message) => fetchAPI('/telegram/send-to-class', { method: 'POST', body: JSON.stringify({ class_id, message }) }),
    sendToStudent: (student_id, message) => fetchAPI('/telegram/send-to-student', { method: 'POST', body: JSON.stringify({ student_id, message }) }),
    getClassStudents: (classId) => fetchAPI(`/telegram/class/${classId}/students`),
};

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
    });
}

export async function createInlineImageAsset(file, options = {}) {
    const {
        maxWidth = 1400,
        maxHeight = 1400,
        quality = 0.82
    } = options;

    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImageFromDataUrl(dataUrl);

    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    const width = Math.max(1, Math.round(img.width * ratio));
    const height = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');

    ctx.drawImage(img, 0, 0, width, height);
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
        secure_url: compressedDataUrl,
        public_id: null,
        storage: 'inline'
    };
}

// Cloudinary authenticated upload (supports raw files, bypasses unsigned limit)
export async function uploadToCloudinary(file, onProgress) {
    // 1. Get secure signature from our backend
    const sigRes = await fetch(`${API_BASE}/cloudinary/signature`);
    if (!sigRes.ok) {
        const error = await sigRes.json().catch(() => ({}));
        throw new Error(error.error || 'Signature failed');
    }
    const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

    // 2. Upload file securely
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                let errMsg = xhr.responseText;
                try {
                    const json = JSON.parse(xhr.responseText);
                    errMsg = json.error ? json.error.message : errMsg;
                } catch(e) {}
                reject(new Error('Cloudinary: ' + errMsg));
            }
        };
        xhr.onerror = () => {
            console.error('Cloudinary Network Error');
            reject(new Error('Network error during upload (check CORS or Internet connection)'));
        };
        xhr.send(formData);
    });
}

// Live Sessions API
export const liveAPI = {
    start: (lessonId) => fetchAPI('/live/start', { method: 'POST', body: JSON.stringify({ lesson_id: lessonId }) }),
    getSession: (code) => fetchAPI(`/live/${code}`),
    changeSlide: (code, slideIndex, activePoll) => fetchAPI(`/live/${code}/slide`, {
        method: 'PATCH',
        body: JSON.stringify({ slide_index: slideIndex, active_poll: activePoll || null })
    }),
    submitAnswer: (code, studentName, answer) => fetch(`${API_BASE}/live/${code}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: studentName, answer })
    }).then(r => r.json()),
    joinSession: (code, studentName) => fetch(`${API_BASE}/live/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: studentName })
    }).then(r => r.json()),
    getStats: (code) => fetchAPI(`/live/${code}/stats`),
    endSession: (code) => fetchAPI(`/live/${code}`, { method: 'DELETE' }),
};

// Chat API (teacher-to-teacher)
export const chatAPI = {
    openConversation: (userId) => fetchAPI(`/chat/conversations/${userId}`, { method: 'POST' }),
    getConversations: () => fetchAPI('/chat/conversations'),
    getMessages: (convId, before) => fetchAPI(`/chat/conversations/${convId}/messages${before ? `?before=${before}` : ''}`),
    sendMessage: (convId, text) => fetchAPI(`/chat/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text })
    }),
    markRead: (convId) => fetchAPI(`/chat/conversations/${convId}/read`, { method: 'PUT' }),
    getUnreadCount: () => fetchAPI('/chat/unread'),
};

// Public teacher profiles
export const teachersAPI = {
    getProfile: (id) => fetchAPI(`/auth/teachers/${id}`),
};

export default {
    lessons: lessonsAPI,
    lessonFiles: lessonFilesAPI,
    assignments: assignmentsAPI,
    classes: classesAPI,
    dashboard: dashboardAPI,
    ai: aiAPI,
    openLessons: openLessonsAPI,
    integrations: integrationsAPI,
    quizzes: quizzesAPI,
    reports: reportsAPI,
};
