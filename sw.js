// Service worker: the app shell works offline.
// Bump VERSION on every release so installed copies pick up the update.
const VERSION = 'sc-v14';
// Without these the app cannot start, so a failed download aborts the install and the old copy keeps working.
const REQUIRED = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'js/sync.js', 'manifest.webmanifest'];
// Nice to have offline; a missing one must not break the install.
const OPTIONAL = ['js/firebase-config.js', 'js/vendor/xlsx.full.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
// Fetch around the browser's own HTTP cache (GitHub Pages keeps files for 10 minutes), so a release is never half old, half new.
const fresh = u => new Request(u, { cache: 'reload' });

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await Promise.all(REQUIRED.map(u => c.add(fresh(u))));
    await Promise.all(OPTIONAL.map(u => c.add(fresh(u)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const clean = res => res && res.ok && res.type !== 'opaque' && !res.redirected;

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const own = u.origin === location.origin;
  const sdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  if (!own && !sdk) return;

  // Opening the app: ask the network first (so a new release shows up straight away) and fall back to the
  // saved copy when offline or slow. The page can therefore never be stuck on a broken saved copy.
  if (r.mode === 'navigate') {
    e.respondWith(
      withTimeout(fetch(r), 4000)
        .then(res => { if (clean(res)) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); } return res; })
        .catch(() => caches.match('index.html').then(h => h || caches.match('./')))
    );
    return;
  }

  // Everything else: show the saved copy instantly and refresh it in the background.
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (clean(res)) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

// Tapping a reminder brings the app to the front (or opens it).
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
