// admin/sw-admin.js - Service Worker do Barbeiro
const CACHE_NAME = 'barberpro-admin-v1';
const urlsToCache = [
  '/admin/index.html',
  '/admin/manifest-admin.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // Toma o controle imediatamente
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Só intercepta requisições dentro da pasta /admin/
  if (event.request.url.includes('/admin/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});