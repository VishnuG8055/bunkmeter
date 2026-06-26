// sw.js — Place this in your ROOT folder (same level as BunkMeter.html)
// This handles push events and shows notifications

const CACHE_NAME = 'bunkmeter-v2';
const ASSETS = [
  '/',
  '/BunkMeter.html',
  '/manifest.json',
];

// ── Install & cache ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (serve from cache when offline) ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Push received ──
self.addEventListener('push', e => {
  let data = { title: '📝 Log Today\'s Attendance', body: 'Tap to open BunkMeter', url: '/' };
  try { data = e.data ? e.data.json() : data; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: data.tag || 'bunkmeter',
      renotify: false,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [
        { action: 'log', title: '✅ Log now' },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  );
});

// ── Notification click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const target = e.action === 'dismiss'
    ? null
    : (e.notification.data?.url || '/');

  if (!target) return;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app already open, focus it and navigate
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', tab: 'log' });
          return;
        }
      }
      // Otherwise open fresh
      return self.clients.openWindow(target);
    })
  );
});