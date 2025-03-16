const CACHE_NAME = 'ribbit-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './ribbit.js',
  './ribbit.wasm',
  './ribbit.css',
  './ribbit.webmanifest',
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