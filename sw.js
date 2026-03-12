const CACHE_NAME = 'in-sync-v3';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'home.html',
  'pairing.html',
  'css/style.css',
  'js/supabase.js',
  'js/router.js',
  'js/app.js',
  'js/home.js',
  'js/pairing.js',
  'js/chat.js',
  'js/settings.js',
  'js/new-memory.js',
  'icon-500.png'
];

// Force update on install
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Skip waiting to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network First, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful response, clone it and save to cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, return from cache
        return caches.match(event.request);
      })
  );
});
