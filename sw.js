const CACHE_NAME = 'barberpro-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js'
];
const CDN_ORIGINS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache).catch(err => console.warn('SW cache addAll falhou (alguma CDN pode estar indisponível no registro):', err)))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isCdn = CDN_ORIGINS.some(o => url.hostname === o);

  if (isCdn) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req)
          .then(networkResp => {
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, respClone)).catch(()=>{});
            return networkResp;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req)
      .then(cached => {
        const fetchPromise = fetch(req)
          .then(networkResp => {
            if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
              const respClone = networkResp.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, respClone)).catch(()=>{});
            }
            return networkResp;
          })
          .catch(() => cached || caches.match('/index.html'));
        return cached || fetchPromise;
      })
  );
});