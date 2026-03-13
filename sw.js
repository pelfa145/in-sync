const CACHE_NAME = 'in-sync-v4';
const STATIC_CACHE = 'in-sync-static-v4';
const DYNAMIC_CACHE = 'in-sync-dynamic-v4';

// Core assets that should always be cached
const STATIC_ASSETS = [
  './',
  'index.html',
  'home.html',
  'pairing.html',
  'css/style.css',
  'js/supabase.js',
  'js/router.js',
  'js/app.js',
  'js/cache.js',
  'js/module-loader.js',
  'icon-500.png'
];

// Dynamic assets that can be cached on demand
const DYNAMIC_ASSETS = [
  'js/home.js',
  'js/pairing.js',
  'js/chat.js',
  'js/settings.js',
  'js/new-memory.js',
  'js/relationship.js',
  'js/notifications.js'
];

// Force update on install
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Skip waiting to activate immediately
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(DYNAMIC_CACHE)
    ])
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
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

// Optimized fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // Strategy based on request type
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    // Cache First for static assets
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (DYNAMIC_ASSETS.some(asset => request.url.includes(asset))) {
    // Stale While Revalidate for dynamic assets
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else if (request.url.includes('supabase')) {
    // Network First for API calls
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    // Network First with cache fallback for everything else
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always try to fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}
