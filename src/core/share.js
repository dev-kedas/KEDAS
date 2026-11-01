// Link bagikan: /s/<bagian>/<kode organisasi>
// Penerima membuka link -> diminta masuk sebagai siswa organisasi itu -> langsung ke dashboard.

export const SECTIONS = [
  { id: 'dashboard',   title: 'Dashboard lengkap', desc: 'Saldo, pemasukan, pengeluaran, dan riwayat terbaru',  icon: 'home',    tone: 'in' },
  { id: 'saldo',       title: 'Saldo kas',         desc: 'Saldo kas organisasi saat ini',                        icon: 'wallet',  tone: 'in' },
  { id: 'pemasukan',   title: 'Pemasukan',         desc: 'Total iuran yang sudah terkumpul',                     icon: 'down',    tone: 'in' },
  { id: 'pengeluaran', title: 'Pengeluaran',       desc: 'Ke mana saja uang kas dipakai',                        icon: 'up',      tone: 'out' },
  { id: 'tunggakan',   title: 'Tunggakan siswa',   desc: 'Siapa saja yang belum membayar',                       icon: 'alert',   tone: 'warn' },
];
const IDS = SECTIONS.map(s => s.id);
const KEY = 'kedas.share';

export const norm = s => String(s || '').toUpperCase().replace(/[\s-]/g, '');
export const shareUrl = (type, code) => `${location.origin}/s/${type}/${encodeURIComponent(code)}`;

let cur = null;
// Dipanggil sekali saat aplikasi dibuka. Mengambil tujuan dari URL lalu membersihkan URL-nya.
export function captureShare() {
  try {
    const q = new URLSearchParams(location.search);
    let type = q.get('share'), code = q.get('code');
    const m = location.pathname.match(/^\/s\/([a-z]+)\/?([^/]*)/i);   // kalau fungsi pratinjau tidak aktif
    if (m) { type = m[1]; code = decodeURIComponent(m[2] || ''); }
    if (type) {
      cur = { type: IDS.includes(type) ? type : 'dashboard', code: String(code || '').toUpperCase() };
      sessionStorage.setItem(KEY, JSON.stringify(cur));
      history.replaceState(null, '', '/' + location.hash);
    } else cur = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch { cur = null; }
  return cur;
}
export const getShare = () => cur;
export function clearShare() { cur = null; try { sessionStorage.removeItem(KEY); } catch { } }

// Sorot bagian yang dibagikan setelah dashboard tampil.
export function flashSection(type) {
  if (!type || type === 'dashboard') return;
  const el = document.querySelector(`[data-sec="${type}"]`); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('sec-flash'); void el.offsetWidth; el.classList.add('sec-flash');
  setTimeout(() => el.classList.remove('sec-flash'), 3200);
}
