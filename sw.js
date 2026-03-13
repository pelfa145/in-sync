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
  'js/cache.js',
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

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-500.png',
    badge: '/icon-500.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  // Customize notification based on type
  if (data.type === 'new_memory') {
    options.title = 'New Memory Shared! 💕';
    options.body = `${data.authorName} shared a new memory: "${data.memoryTitle}"`;
  } else if (data.type === 'new_comment') {
    options.title = 'New Comment 💬';
    options.body = `${data.authorName} commented on your memory`;
  } else if (data.type === 'new_message') {
    options.title = 'New Message 💭';
    options.body = `${data.authorName}: ${data.message}`;
  } else {
    options.title = data.title || 'In-Sync Notification';
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url && client.url.includes('home.html')) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/home.html');
      }
    })
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
