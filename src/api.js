const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Generic fetch wrapper with error handling
function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    const response = fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        },
        ...options
    });
    return response.then(async res => {
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'API request failed');
        }
        return res.json();
    });
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
    getNotifications: () => fetchAPI('/notifications')
};

// AI API
export const aiAPI = {
    chat: (message, conversationHistory = [], language = 'ru') => fetchAPI('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, conversationHistory, language })
    }),
    lessonPlan: (data) => fetchAPI('/ai/lesson-plan', { method: 'POST', body: JSON.stringify(data) }),
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

// Cloudinary direct upload (unsigned upload preset)
export async function uploadToCloudinary(file, onProgress) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'urpaq_uploads';

    if (!cloudName) {
        throw new Error('VITE_CLOUDINARY_CLOUD_NAME not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'urpaq-lessons');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

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
                reject(new Error('Upload failed: ' + xhr.responseText));
            }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
    });
}

export default {
    lessons: lessonsAPI,
    lessonFiles: lessonFilesAPI,
    assignments: assignmentsAPI,
    classes: classesAPI,
    dashboard: dashboardAPI,
    ai: aiAPI,
    openLessons: openLessonsAPI,
    integrations: integrationsAPI,
};
