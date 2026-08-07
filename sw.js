// sw.js - Service Worker do Cliente
const CACHE_NAME = 'barberpro-cliente-v2';
const urlsToCache = [
  '/agendar.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js'
];
const CDN_ORIGINS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

// INSTALL
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache).catch(err => console.warn('SW cache addAll falhou:', err)))
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH - IGNORA REQUISIÇÕES DA PASTA /admin/
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  
  // NÃO intercepta requisições da pasta /admin/
  if (url.pathname.startsWith('/admin/')) {
    return; // Deixa o navegador lidar com a requisição
  }

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
          .catch(() => cached || caches.match('/agendar.html'));
        return cached || fetchPromise;
      })
  );
});