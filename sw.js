// sw.js — Place this in your ROOT folder (same level as BunkMeter.html)
// This handles push events and shows notifications
// Auto-update system: Checks for version changes and updates cache silently

const CACHE_NAME = 'bunkmeter-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/BunkMeter.html',
  '/manifest.json',
];

// ── Helper: Fetch remote version ──
async function getRemoteVersion() {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    const html = await res.text();
    const match = html.match(/meta name="version" content="([^"]+)"/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

// ── Helper: Store/get stored version ──
function getStoredVersion() {
  try {
    return clients.matchAll().then(clients => {
      if (clients.length > 0) {
        return new Promise(resolve => {
          const bc = new BroadcastChannel('bunkmeter-version');
          bc.postMessage({ type: 'GET_VERSION' });
          bc.onmessage = e => {
            bc.close();
            resolve(e.data.version);
          };
          setTimeout(() => { bc.close(); resolve(null); }, 1000);
        });
      }
      return null;
    });
  } catch (e) {
    return Promise.resolve(null);
  }
}

// ── Install & cache ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: Check for updates & clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      // Clean old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      
      // Check for version update
      const remoteVer = await getRemoteVersion();
      if (remoteVer) {
        // Broadcast to all clients to update stored version
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'UPDATE_VERSION', version: remoteVer });
          });
        });
        
        // Update cache with fresh assets
        try {
          const cache = await caches.open(CACHE_NAME);
          await Promise.all(ASSETS.map(url => 
            fetch(url, { cache: 'no-store' })
              .then(res => cache.put(url, res))
              .catch(() => {})
          ));
        } catch (e) {
          console.error('Cache update failed:', e);
        }
      }
      
      self.clients.claim();
    })()
  );
});

// ── Fetch (serve from cache, update in background) ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached version immediately
      const fetchPromise = fetch(e.request, { cache: 'no-store' })
        .then(res => {
          // Update cache silently for GET requests
          if (res && res.status === 200 && !res.headers.get('content-type')?.includes('image')) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached); // Fallback to cache if network fails
      
      // For critical files (HTML), prioritize fresh version
      if (e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
        return fetchPromise.catch(() => cached);
      }
      
      return cached || fetchPromise;
    })
  );
});

// ── Push received ──
self.addEventListener('push', e => {
  let data = { title: 'Log Today\'s Attendance', body: 'Tap to open BunkMeter', url: '/' };
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
        { action: 'log', title: 'Log now' },
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