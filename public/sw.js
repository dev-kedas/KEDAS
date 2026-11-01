/* KEDAS service worker: menerima push dari server dan menampilkannya sebagai notifikasi
   sistem (muncul di bar notifikasi HP walau aplikasi/browser tidak sedang dibuka). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'KEDAS';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: d.tag || 'kedas',
    renotify: true,
    vibrate: [140, 60, 140],
    timestamp: Date.now(),
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        try { if ('navigate' in c) await c.navigate(url); } catch { }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
