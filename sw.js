// Golf HCP Service Worker v19 — cache forzado limpio
const CACHE = 'golf-hcp-v19';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  // skipWaiting inmediato para reemplazar SW viejo
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network first para index.html — siempre descarga versión más reciente
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = url.pathname === '/' ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, {cache: 'no-cache'})
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          return res;
        });
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
