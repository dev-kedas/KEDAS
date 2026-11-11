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

const OFFLINE = '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tidak ada koneksi</title><body style="font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#eef3f0;color:#10231c;text-align:center;padding:24px"><div><h2>Tidak ada koneksi</h2><p>KEDAS butuh internet untuk memuat data kas. Coba lagi kalau sudah online.</p><button onclick="location.reload()" style="font:inherit;font-weight:700;padding:10px 18px;border:0;border-radius:12px;background:#0e4d3a;color:#fff">Muat ulang</button></div></body></html>';
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
