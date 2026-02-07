const CACHE_VERSION = 'v2';
const CACHE_NAME = 'ribbit-cache-' + CACHE_VERSION;
const urlsToCache = [
  './',
  './index.html',
  './ribbit.webmanifest',
  './styles/ribbit.css',
  './styles/settings.css',
  './styles/titlebar.css',
  './styles/chat.css',
  './scripts/gps.js',
  './scripts/index.js',
  './scripts/messages.js',
  './scripts/ribbit.js',
  './scripts/ribbit-wasm.js',
  './scripts/ribbit.wasm',
  './scripts/settings.js',
  './favicon.ico',
  './assets/ribbiticon-32.png',
  './assets/ribbiticon-64.png',
  './assets/ribbiticon-128.png',
  './assets/ribbiticon-256.png',
  './assets/ribbiticon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k.startsWith('ribbit-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
}); 