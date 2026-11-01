// Edge Function: admin kirim pengumuman -> disimpan (muncul di lonceng) + dikirim sebagai
// notifikasi HP (Web Push) ke siswa yang sudah mengaktifkan notifikasi.
//
// Deploy:  supabase functions deploy send-push --no-verify-jwt
// Secrets: supabase secrets set --env-file push-secrets.env
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!pub || !priv) return json({ error: 'Kunci VAPID belum dipasang di server (supabase secrets set).' }, 500);
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com', pub, priv);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    // 1. Pastikan pemanggil adalah admin (pemilik organisasi).
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await db.auth.getUser(token);
    if (ue || !u?.user || u.user.is_anonymous) return json({ error: 'Hanya admin yang bisa mengirim notifikasi.' }, 403);
    const { data: cls } = await db.from('classes').select('id, settings').eq('owner_id', u.user.id).maybeSingle();
    if (!cls) return json({ error: 'Kamu belum punya organisasi.' }, 403);

    // 2. Validasi isi.
    const b = await req.json().catch(() => ({}));
    const title = String(b.title ?? '').trim().slice(0, 80);
    const body = String(b.body ?? '').trim().slice(0, 300);
    if (!title) return json({ error: 'Judul wajib diisi.' }, 400);
    let ids: string[] | null = null;
    if (Array.isArray(b.studentIds)) {
      ids = b.studentIds.filter((x: unknown) => typeof x === 'string' && UUID.test(x));
      if (!ids!.length) return json({ error: 'Tidak ada siswa yang dituju.' }, 400);
    }

    // 3. Anti-spam: maksimal 1 pengumuman per 5 detik.
    const { data: last } = await db.from('broadcasts').select('created_at').eq('class_id', cls.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - Date.parse(last.created_at) < 5000) return json({ error: 'Tunggu sebentar sebelum mengirim lagi.' }, 429);

    // 4. Siswa tujuan (hanya yang memang ada di organisasi ini).
    const { data: studs } = await db.from('students').select('id').eq('class_id', cls.id);
    const valid = new Set((studs ?? []).map((s: { id: string }) => s.id));
    if (ids) ids = ids.filter((x) => valid.has(x));
    if (ids && !ids.length) return json({ error: 'Tidak ada siswa yang dituju.' }, 400);

    // 5. Simpan (muncul di lonceng siswa).
    const { data: bc, error: be } = await db.from('broadcasts')
      .insert({ class_id: cls.id, title, body, student_ids: ids }).select('id').single();
    if (be) throw be;

    // 6. Cari perangkat tujuan.
    const { data: members } = await db.from('class_members').select('user_id, student_id').eq('class_id', cls.id);
    const want = new Set((members ?? []).filter((m: { student_id: string }) => !ids || ids.includes(m.student_id)).map((m: { user_id: string }) => m.user_id));
    const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth, user_id').eq('class_id', cls.id);
    const targets = (subs ?? []).filter((s: { user_id: string }) => want.has(s.user_id));

    const payload = JSON.stringify({
      title, body, url: '/', tag: 'kedas-' + bc.id,
      org: (cls.settings as { className?: string } | null)?.className || '',
    });

    let sent = 0, failed = 0;
    const dead: string[] = [];
    for (let i = 0; i < targets.length; i += 25) {
      const res = await Promise.allSettled(targets.slice(i, i + 25).map((t: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 60 * 60 * 24 * 2, urgency: 'high' })));
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

    const reached = new Set(targets.map((t: { user_id: string }) => t.user_id)).size;
    return json({ ok: true, id: bc.id, recipients: want.size, devices: targets.length, reached, sent, failed });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Gagal mengirim notifikasi.' }, 500);
  }
});
