
const CACHE_NAME = 'lingobridge-v1';
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './lang.ts',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache external CDN resources as they are requested
        if (event.request.url.includes('esm.sh') || event.request.url.includes('cdnjs') || event.request.url.includes('google')) {
           const clone = fetchResponse.clone();
           caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchResponse;
      });
    })
  );
});
