const CACHE_VERSION = 'golf-hcp-v15';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Install: cachear todo incluido CDN
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      await cache.addAll(LOCAL_ASSETS);
      // CDN con no-cors para poder cachear
      await Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, {mode:'cors',credentials:'omit'})
            .then(r => { if(r.ok) cache.put(url, r); })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache first — funciona sin red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone)).catch(()=>{});
        }
        return response;
      }).catch(() => cached || new Response('offline', {status:503}));
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
