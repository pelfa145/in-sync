const CACHE_NAME = 'in-sync-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/auth.html',
  '/home.html',
  '/pairing.html',
  '/chat.html',
  '/settings.html',
  '/new-memory.html',
  '/paywall.html',
  '/css/style.css',
  '/js/supabase.js',
  '/js/router.js',
  '/js/app.js',
  '/js/home.js',
  '/js/pairing.js',
  '/js/chat.js',
  '/js/settings.js',
  '/js/new-memory.js',
  '/js/paywall.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
