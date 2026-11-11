import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const TAGS = ['baru', 'perbaikan', 'info'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const secret = Deno.env.get('KEDAS_ADMIN_SECRET') || '';
    const given = req.headers.get('x-admin-secret') || '';
    if (secret.length < 16) return json({ error: 'KEDAS_ADMIN_SECRET belum dipasang (min. 16 karakter).' }, 500);
    if (!same(secret, given)) return json({ error: 'Secret salah.' }, 403);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const b = await req.json().catch(() => ({}));

    if (b.action === 'delete') {
      const id = String(b.id ?? '');
      const { error } = await db.from('kedas_updates').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true, deleted: id });
    }

    const title = String(b.title ?? '').trim().slice(0, 80);
    if (!title) return json({ error: 'Judul wajib diisi.' }, 400);
    const items = (Array.isArray(b.items) ? b.items : []).map((x: unknown) => String(x ?? '').trim().slice(0, 200)).filter(Boolean).slice(0, 10);
    const tag = TAGS.includes(b.tag) ? b.tag : 'baru';
    const id = new Date().toISOString().slice(0, 10) + '-' + crypto.randomUUID().slice(0, 6);

    const { error: ie } = await db.from('kedas_updates').insert({ id, tag, title, items });
    if (ie) throw ie;

    if (b.push === false) return json({ ok: true, id, push: false });

    const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!pub || !priv) return json({ ok: true, id, push: false, warning: 'Kunci VAPID belum dipasang, pesan masuk tab KEDAS saja.' });
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com', pub, priv);

    const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth');
    const targets = subs ?? [];
    const payload = JSON.stringify({
      title: 'KEDAS · ' + title,
      body: (items.length ? items.join(' · ') : 'Ada kabar baru dari KEDAS.').slice(0, 300),
      url: '/?notif=kedas', tag: 'kedas-update-' + id,
    });

    let sent = 0, failed = 0;
    const dead: string[] = [];
    for (let i = 0; i < targets.length; i += 25) {
      const res = await Promise.allSettled(targets.slice(i, i + 25).map((t: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 60 * 60 * 24 * 2, urgency: 'normal' })));
      res.forEach((r, k) => {
        if (r.status === 'fulfilled') sent++;
        else {
          failed++;
          const code = (r.reason as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) dead.push(targets[i + k].endpoint);
        }
      });
    }
    if (dead.length) await db.from('push_subscriptions').delete().in('endpoint', dead);
    return json({ ok: true, id, push: true, devices: targets.length, sent, failed });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Gagal mengirim kabar.' }, 500);
  }
});
