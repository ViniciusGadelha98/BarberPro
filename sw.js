// sw.js - Service Worker do Cliente (VERSÃO CORRIGIDA)
const CACHE_NAME = 'barberpro-cliente-v3';
const urlsToCache = [
  '/agendar.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js'
];

// INSTALL
self.addEventListener('install', event => {
  console.log('[SW Cliente] Instalando...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW Cliente] Cache aberto');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW Cliente] Erro ao adicionar ao cache:', err);
        });
      })
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  console.log('[SW Cliente] Ativando...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW Cliente] Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log('[SW Cliente] Ativado e tomando controle...');
      return self.clients.claim();
    })
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  
  // NÃO intercepta requisições da pasta /admin/
  if (url.pathname.startsWith('/admin/')) {
    return;
  }

  // Estratégia: Cache First, depois rede
  event.respondWith(
    caches.match(req)
      .then(cachedResponse => {
        // Se encontrou no cache, retorna
        if (cachedResponse) {
          console.log('[SW Cliente] Cache hit:', url.pathname);
          return cachedResponse;
        }
        
        // Se não, busca na rede
        console.log('[SW Cliente] Buscando na rede:', url.pathname);
        return fetch(req)
          .then(response => {
            // Verifica se é uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona e guarda no cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(req, responseToCache);
              })
              .catch(err => console.warn('[SW Cliente] Erro ao guardar no cache:', err));
            
            return response;
          })
          .catch(() => {
            // Se falhou tudo, retorna a página inicial (se estiver em cache)
            return caches.match('/agendar.html');
          });
      })
  );
});