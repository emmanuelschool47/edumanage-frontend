/* EduManage Pro — Service Worker v1.0 */
const CACHE = 'edumanage-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/student.html',
  '/teacher.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

/* INSTALL — cache all files */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* ACTIVATE — delete old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* FETCH — network first, cache fallback */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Skip non-GET and API calls — always go to network */
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('edumanage-backend')) return;
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('fonts')) {
    /* Cache fonts */
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  /* HTML pages — network first, fallback to cache */
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  /* Everything else — cache first */
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

/* PUSH NOTIFICATIONS */
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.message || data.body || 'New notification from EduManage',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/student.html' },
    actions: [{ action: 'open', title: 'Open App' }]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'EduManage', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/student.html';
  event.waitUntil(clients.openWindow(url));
});
