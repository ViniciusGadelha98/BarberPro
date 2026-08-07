// sw.js - Service Worker do Cliente (BarberPro)
const CACHE_NAME = 'barberpro-cliente-v3';
const urlsToCache = [
  '/agendar.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js'
];

// Lista de origens CDN para cache separado
const CDN_ORIGINS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

// ========== INSTALL ==========
self.addEventListener('install', event => {
  // Força o service worker a ativar imediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('SW: Alguns recursos não foram cacheados:', err);
        });
      })
      .catch(err => {
        console.error('SW: Falha ao abrir cache:', err);
      })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('SW: Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      // Toma o controle imediatamente
      return self.clients.claim();
    })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', event => {
  const req = event.request;
  
  // Ignora requisições que não são GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  
  // ===== NÃO INTERCEPTA REQUISIÇÕES DA PASTA /admin/ =====
  // Isso é crucial para não conflitar com o PWA do barbeiro
  if (url.pathname.startsWith('/admin/')) {
    return; // Deixa o navegador lidar com a requisição
  }

  // ===== REQUISIÇÕES PARA CDN =====
  const isCdn = CDN_ORIGINS.some(origin => url.hostname === origin);
  
  if (isCdn) {
    event.respondWith(
      caches.match(req).then(cached => {
        // Se tiver em cache, retorna; senão, busca na rede e cacheia
        const fetchPromise = fetch(req).then(networkResp => {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, respClone))
            .catch(() => {});
          return networkResp;
        }).catch(() => cached);
        
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ===== REQUISIÇÕES PARA O PRÓPRIO SITE =====
  event.respondWith(
    caches.match(req).then(cached => {
      // Se tiver em cache, retorna
      if (cached) {
        return cached;
      }
      
      // Senão, busca na rede e cacheia (se for bem-sucedido)
      return fetch(req).then(networkResp => {
        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, respClone))
            .catch(() => {});
        }
        return networkResp;
      }).catch(() => {
        // Fallback: retorna a página principal se offline
        return caches.match('/agendar.html');
      });
    })
  );
});