// REALITY//DECISION 2.0 — First-Responder Offline PWA Service Worker (v2.1 Safe)

const CACHE_NAME = 'reality-decision-pwa-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NEVER intercept non-GET or extension requests
  if (event.request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // NEVER return HTML for JS/CSS/asset requests
  const isAsset = url.pathname.includes('/assets/') || 
                  url.pathname.endsWith('.js') || 
                  url.pathname.endsWith('.css') || 
                  url.pathname.endsWith('.json') || 
                  url.pathname.endsWith('.svg') || 
                  url.pathname.endsWith('.png');

  if (isAsset) {
    // Assets: Network fetch first, fallback to cached asset (NEVER index.html)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation requests: Network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
