/* ==================================================================
   XQD716 NEXUS 6.0 — Service Worker Engine (PWA Performance & Cache)
   ================================================================== */

const CACHE_NAME = 'xqd716-nexus-v6.0.6';

const STATIC_ASSETS = [
    './',
    'index.html',
    'styles.css',
    '3d-space.js',
    'backend-config.js',
    'security.js',
    'app.js',
    'manifest.webmanifest'
];

// Install Event: Pre-cache Static App Shell Assets
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching static app shell assets');
            return cache.addAll(STATIC_ASSETS);
        }).catch(err => {
            console.warn('[SW] Cache addAll warning (handled silently):', err);
        })
    );
});

// Activate Event: Purge Deprecated Cache Storage and Claim Control
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Purging deprecated cache storage:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Bypass Cloud APIs, Stale-while-revalidate for local static assets
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Bypass caching completely for Firebase Cloud Firestore, Auth, Analytics, and external APIs
    if (
        requestUrl.hostname.includes('firebase') ||
        requestUrl.hostname.includes('firestore') ||
        requestUrl.hostname.includes('googleapis') ||
        requestUrl.hostname.includes('gstatic') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(err => {
                    console.warn('[SW] Network request offline, fallback to cache:', err);
                    return cachedResponse;
                });

            // Return cached response immediately if present, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});

// Background Message Listener for Instant Update
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
