// API utility functions for Urpaq.ai

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
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

export default {
    lessons: lessonsAPI,
    assignments: assignmentsAPI,
    classes: classesAPI,
    dashboard: dashboardAPI,
    ai: aiAPI
};
