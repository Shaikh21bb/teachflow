export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const authStorage = {
    getToken: () => localStorage.getItem('auth_token'),
    getRefreshToken: () => localStorage.getItem('auth_refresh_token'),
    setTokens: (access, refresh) => {
        localStorage.setItem('auth_token', access);
        if (refresh) localStorage.setItem('auth_refresh_token', refresh);
    },
    clearTokens: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
    },
};

export async function readResponse(response) {
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const message = typeof body?.error === 'string' ? body.error : body?.message;
        const error = new Error(message || `Не удалось выполнить запрос (${response.status})`);
        Object.assign(error, { status: response.status, code: body?.code, details: body });
        throw error;
    }
    if (body === null) throw new Error('Сервер вернул некорректный ответ. Обновите страницу.');
    return body;
}

let refreshPromise;
async function refreshSession() {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: authStorage.getRefreshToken() }),
    });
    if (response.status === 401 || response.status === 403) {
        authStorage.clearTokens();
        window.dispatchEvent(new Event('auth:expired'));
    }
    const data = await readResponse(response);
    authStorage.setTokens(data.token, data.refreshToken);
    return data.token;
}

export async function authFetch(url, options = {}) {
    const request = token => fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    const token = authStorage.getToken();
    const response = await request(token);
    if (response.status !== 401 || !token) return response;
    if (authStorage.getToken() && authStorage.getToken() !== token) return request(authStorage.getToken());
    if (!authStorage.getRefreshToken()) {
        authStorage.clearTokens();
        window.dispatchEvent(new Event('auth:expired'));
        return response;
    }
    // One refresh request is shared by all API calls, including /auth/me.
    if (!refreshPromise) refreshPromise = refreshSession().finally(() => { refreshPromise = null; });
    return request(await refreshPromise);
}

export async function requestAPI(endpoint, options = {}) {
    const data = await readResponse(await authFetch(`${API_BASE}${endpoint}`, options));
    if (Number.isFinite(data?.creditsRemaining)) window.dispatchEvent(new CustomEvent('credits:changed', { detail: data.creditsRemaining }));
    return data;
}
