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
    getById: (id) => fetchAPI(`/lessons/${id}`),
    create: (lesson) => fetchAPI('/lessons', {
        method: 'POST',
        body: JSON.stringify(lesson)
    }),
    update: (id, lesson) => fetchAPI(`/lessons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(lesson)
    }),
    delete: (id) => fetchAPI(`/lessons/${id}`, { method: 'DELETE' })
};

// Assignments API
export const assignmentsAPI = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/assignments${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => fetchAPI(`/assignments/${id}`),
    create: (assignment) => fetchAPI('/assignments', {
        method: 'POST',
        body: JSON.stringify(assignment)
    }),
    update: (id, assignment) => fetchAPI(`/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(assignment)
    }),
    delete: (id) => fetchAPI(`/assignments/${id}`, { method: 'DELETE' })
};

// Classes API
export const classesAPI = {
    getAll: () => fetchAPI('/classes'),
    getById: (id) => fetchAPI(`/classes/${id}`),
    getStudents: (id) => fetchAPI(`/classes/${id}/students`),
    create: (classData) => fetchAPI('/classes', {
        method: 'POST',
        body: JSON.stringify(classData)
    }),
    addStudent: (classId, student) => fetchAPI(`/classes/${classId}/students`, {
        method: 'POST',
        body: JSON.stringify(student)
    }),
    update: (id, classData) => fetchAPI(`/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(classData)
    }),
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
    getStatus: () => fetchAPI('/ai/status')
};

// Open Lessons API
export const openLessonsAPI = {
    getAll: () => fetchAPI('/open-lessons'),
    getById: (id) => fetchAPI(`/open-lessons/${id}`),
    generate: (data) => fetchAPI('/open-lessons/generate', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    create: (lesson) => fetchAPI('/open-lessons', {
        method: 'POST',
        body: JSON.stringify(lesson)
    }),
    update: (id, lesson) => fetchAPI(`/open-lessons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(lesson)
    }),
    saveTeams: (id, teams) => fetchAPI(`/open-lessons/${id}/teams`, {
        method: 'POST',
        body: JSON.stringify({ teams })
    }),
    delete: (id) => fetchAPI(`/open-lessons/${id}`, { method: 'DELETE' })
};

export default {
    lessons: lessonsAPI,
    assignments: assignmentsAPI,
    classes: classesAPI,
    dashboard: dashboardAPI,
    ai: aiAPI,
    openLessons: openLessonsAPI
};

