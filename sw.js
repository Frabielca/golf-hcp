// ── Golf HCP · Service Worker ─────────────────────────────────────
const CACHE_VERSION = 'golf-hcp-v12';
const ASSETS = ['./', './index.html', './manifest.json'];

// ── INSTALL ───────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────
// Estrategia: Cache first para HTML (app funciona sin red al reabrir)
// Network update en segundo plano para mantenerlo actualizado
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar requests externos (Supabase API, Google Fonts, CDN)
  if (url.origin !== self.location.origin) return;

  // Para index.html: Cache first, actualizar en background (Stale-While-Revalidate)
  if (url.pathname === '/' || url.pathname.endsWith('index.html') || url.pathname === '/golf-hcp/') {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async cache => {
        const cached = await cache.match(event.request);
        // Actualizar en background
        const networkPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
            // Notificar a la página que hay actualización disponible
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
            });
          }
          return response;
        }).catch(() => null);

        // Devolver caché inmediatamente si existe, sino esperar red
        return cached || networkPromise;
      })
    );
    return;
  }

  // Para el resto: Cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_VERSION).then(c => c.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});

// ── MENSAJE ───────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
