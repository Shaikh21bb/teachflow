/**
 * Urpaq.ai Service Worker v3
 * Strategy:
 *   - App shell (HTML, JS, CSS): Cache-first, background update
 *   - API calls: Network-first, no cache (always fresh data)
 *   - Static assets (images, fonts): Cache-first, long TTL
 *   - Offline fallback: /offline.html
 */

const CACHE_NAME = 'urpaq-v3';
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/logo.jpg',
    '/manifest.json',
];

// ── Install: precache critical assets ─────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Precache failed for some assets:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean old caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch handler ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin (except fonts)
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return;

    // API calls → Network first, fallback to offline JSON
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(JSON.stringify({ error: 'Offline. Check your connection.' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // Google Fonts → Cache first
    if (url.hostname.includes('fonts.g')) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(request, clone));
                return res;
            }))
        );
        return;
    }

    // HTML navigation → Network first, fallback to cached / offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    return res;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    const root = await caches.match('/');
                    if (root) return root;
                    return caches.match('/offline.html');
                })
        );
        return;
    }

    // JS/CSS/Images → Cache first, update in background (stale-while-revalidate)
    if (/\.(js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then(cached => {
                const fetchPromise = fetch(request).then(res => {
                    caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
                    return res;
                }).catch(() => null);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Default → Network with cache fallback
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// ── Push notifications ─────────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let data = {};
    try { data = event.data.json(); } catch { data = { title: 'Urpaq.ai', body: event.data.text() }; }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Urpaq.ai', {
            body: data.body || '',
            icon: '/logo.jpg',
            badge: '/logo.jpg',
            data: { url: data.url || '/dashboard' },
            vibrate: [200, 100, 200],
        })
    );
});

// ── Notification click ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/dashboard';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
