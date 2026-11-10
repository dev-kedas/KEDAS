// Halaman pratinjau untuk link bagikan (/s/<bagian>/<kode>).
// Crawler WhatsApp/Telegram/dll tidak menjalankan JavaScript, jadi meta tag OG harus
// sudah ada di HTML. Pengguna biasa langsung diarahkan ke aplikasi (/?share=...&code=...),
// lalu aplikasi meminta mereka masuk sebagai siswa organisasi tersebut.
//
// Gambar pratinjau (og:image) dibuat aplikasi admin: ringkasan saldo, pemasukan, pengeluaran — tanpa riwayat
// dan nama anggota. Isi lengkap dashboard tetap hanya terlihat setelah login.

export const SECTIONS = {
  dashboard:   { title: 'Dashboard kas',  desc: 'Ringkasan saldo, pemasukan, dan pengeluaran kas.' },
  saldo:       { title: 'Saldo kas',      desc: 'Lihat saldo kas organisasi saat ini.' },
  pemasukan:   { title: 'Pemasukan kas',  desc: 'Lihat total iuran yang sudah terkumpul.' },
  pengeluaran: { title: 'Pengeluaran kas', desc: 'Lihat ke mana saja uang kas dipakai.' },
  tunggakan:   { title: 'Tunggakan kas',  desc: 'Lihat siapa saja yang belum membayar iuran.' },
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function classInfo(supabaseUrl, key, code) {
  if (!supabaseUrl || !key) return {};
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/preview_class`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
    });
    if (!r.ok) return {};
    const d = await r.json();
    return d ? { name: d.name || '', id: d.id || '' } : {};
  } catch { return {}; } finally { clearTimeout(t); }
}

export async function buildShare({ origin, type, code, photo, supabaseUrl, key }) {
  const sec = SECTIONS[type] ? type : 'dashboard';
  const clean = /^[A-Za-z0-9-]{4,20}$/.test(code || '') ? code.toUpperCase() : '';
  const cls = clean ? await classInfo(supabaseUrl, key, clean) : {}, org = cls.name || '';
  const info = SECTIONS[sec];
  const title = org ? `${info.title} · ${org}` : `${info.title} · KEDAS`;
  const desc = `${info.desc} Masuk sebagai siswa organisasi ini untuk membuka.`;
  // Foto pilihan admin (bucket publik share-photos/<id organisasi>/<token>.jpg); tanpa foto -> gambar bawaan.
  const tok = /^[A-Za-z0-9_-]{6,32}$/.test(photo || '') ? photo : '';
  const custom = tok && cls.id && /^[0-9a-f-]{36}$/i.test(cls.id) && supabaseUrl
    ? `${String(supabaseUrl).replace(/\/+$/, '')}/storage/v1/object/public/share-photos/${cls.id}/${tok}.jpg` : '';
  const image = custom || `${origin}/og/${sec}.png`;
  const imgType = custom ? 'image/jpeg' : 'image/png';
  const self = `${origin}/s/${sec}/${clean}${custom ? '/' + tok : ''}`;
  const dest = `${origin}/?share=${sec}${clean ? '&code=' + encodeURIComponent(clean) : ''}`;
  const html = `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0e4d3a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="KEDAS">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(self)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:type" content="${imgType}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(custom ? title : info.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(dest)}">
<script>location.replace(${JSON.stringify(dest).replace(/</g, '\\u003c')});</script>
<style>body{font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#eef3f0;color:#10231c}a{color:#0e4d3a;font-weight:700}</style>
</head><body><p>Membuka KEDAS… <a href="${esc(dest)}">Klik di sini kalau tidak berpindah</a></p></body></html>`;
  return { html };
}

export const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';
