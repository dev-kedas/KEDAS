import { pad, parseMoney, uid, CATS, STATUS_LABEL } from './utils.js';
import { buildXlsx, readXlsx } from './xlsx.js';

const MODE_LABEL = { light: 'Terang', dark: 'Gelap', system: 'Sistem' };
const ACCENT_LABEL = { green: 'Hijau', blue: 'Biru', purple: 'Ungu', rose: 'Mawar', amber: 'Oranye', slate: 'Abu', custom: 'Kustom' };
const NUMERIC_SETTINGS = new Set(['nominal', 'openingBalance', 'reminderDays', 'targetAmount']);

const FIELDS = [
  ['Sistem kas', 'Nama organisasi', 'className'],
  ['Sistem kas', 'Sistem iuran', 'mode'],
  ['Sistem kas', 'Nominal per periode', 'nominal'],
  ['Sistem kas', 'Tanggal mulai kas', 'startDate'],
  ['Sistem kas', 'Saldo awal', 'openingBalance'],
  ['Sistem kas', 'Pengingat (hari sebelum jatuh tempo)', 'reminderDays'],
  ['Tujuan kas', 'Nama tujuan', 'targetName'],
  ['Tujuan kas', 'Target dana', 'targetAmount'],
  ['Tema organisasi', 'Mode', 'theme.mode'],
  ['Tema organisasi', 'Warna aksen', 'theme.accent'],
  ['Tema organisasi', 'Warna kustom', 'theme.customHex'],
  ['Tema organisasi', 'Wajibkan semua pakai tema organisasi', 'theme.forced'],
];


const LEGACY = new Set(['kode organisasi', 'pin admin']);

const YMD = /^(\d{4})-(\d{1,2})-(\d{1,2})$/, DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/, SERIAL = /^\d{5}$/;

export function normDate(s) {
  const t = String(s ?? '').trim();
  if (SERIAL.test(t)) return new Date(Date.UTC(1899, 11, 30) + +t * 864e5).toISOString().slice(0, 10);
  const a = YMD.exec(t), b = DMY.exec(t);
  const [y, m, d] = a ? [+a[1], +a[2], +a[3]] : b ? [+b[3], +b[2], +b[1]] : [];
  if (!y) return '';
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : '';
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function displayValue(S, path) {
  const st = S.settings, th = st.theme || {};
  switch (path) {
    case 'mode': return st.mode === 'monthly' ? 'Bulanan' : 'Mingguan';
    case 'theme.mode': return MODE_LABEL[th.mode] || 'Terang';
    case 'theme.accent': return ACCENT_LABEL[th.accent] || th.accent || '';
    case 'theme.forced': return th.forced ? 'Ya' : 'Tidak';
    case 'targetName': return st.targetName || '';
    case 'targetAmount': return st.targetAmount || 0;
    default: {
      const v = get(st, path) ?? '';
      return NUMERIC_SETTINGS.has(path) && v !== '' ? Number(v) : v;
    }
  }
}

export function toSheets(S, rows) {
  const names = new Map(S.students.map(s => [s.id, s.name]));
  return [
    { name: 'Pengaturan', head: ['Bagian', 'Pengaturan', 'Nilai'], rows: FIELDS.map(([sec, label, path]) => [sec, label, displayValue(S, path)]) },
    { name: 'anggota', head: ['Nama anggota', 'Tanggal terakhir bayar', 'Sudah dibayar', 'Wajib dibayar', 'Tunggakan', 'Status'], money: [2, 3, 4],
      rows: rows.map(r => [r.st.name, r.pays[0] ? r.pays[0].date : '', r.paid, r.wajib, r.sisa, STATUS_LABEL[r.status]]) },
    { name: 'Pembayaran', head: ['Nama anggota', 'Tanggal', 'Jumlah', 'Catatan'], money: [2],
      rows: S.payments.filter(p => names.has(p.studentId)).map(p => [names.get(p.studentId), p.date, p.amount, p.note]) },
    { name: 'Pengeluaran', head: ['Nama', 'Tanggal', 'Jumlah', 'Kategori', 'Catatan'], money: [2],
      rows: S.expenses.map(e => [e.name, e.date, e.amount, e.category, e.note]) },
  ];
}

export const toXlsx = (S, rows) => buildXlsx(toSheets(S, rows));

const catOf = v => CATS.find(c => c.toLowerCase() === v.toLowerCase()) || v || 'Lainnya';
const LABEL_PATH = Object.fromEntries(FIELDS.map(([, label, path]) => [label.toLowerCase(), path]));
const lookup = (map, v) => Object.keys(map).find(k => k === v.toLowerCase() || map[k].toLowerCase() === v.toLowerCase());

function applySetting(out, path, v) {
  const s = out.settings, th = out.theme;
  if (path === 'className') { if (v) s.className = v.slice(0, 40); }
  else if (path === 'mode') { if (v) s.mode = /bulan/i.test(v) ? 'monthly' : 'weekly'; }
  else if (path === 'nominal') { if (parseMoney(v) > 0) s.nominal = parseMoney(v); }
  else if (path === 'startDate') { if (normDate(v)) s.startDate = normDate(v); }
  else if (path === 'openingBalance') { if (v !== '') s.openingBalance = parseMoney(v); }
  else if (path === 'reminderDays') { if (v !== '') s.reminderDays = Math.min(30, Math.max(0, Math.round(+v) || 0)); }
  else if (path === 'targetName') s.targetName = v.slice(0, 40);
  else if (path === 'targetAmount') { if (v !== '') s.targetAmount = Math.max(0, parseMoney(v)); }
  else if (path === 'theme.mode') { const k = lookup(MODE_LABEL, v); if (k) th.mode = k; }
  else if (path === 'theme.accent') { const k = lookup(ACCENT_LABEL, v); if (k) th.accent = k; }
  else if (path === 'theme.customHex') { if (/^#[0-9a-f]{6}$/i.test(v)) th.customHex = v; }
  else if (path === 'theme.forced') th.forced = /^(ya|true)$/i.test(v);
}

export function fromTables(tables) {
  const settings = {}, theme = {}, students = new Map(), payments = [], expenses = [];
  const found = new Set();
  let skipped = 0;
  const addStudent = name => {
    const k = name.toLowerCase();
    if (!students.has(k)) students.set(k, { id: uid(), name });
    return students.get(k);
  };

  Object.values(tables).forEach(all => {
    const rows = all.filter(r => r.some(c => String(c ?? '').trim() !== ''));
    if (!rows.length) return;
    const head = rows[0].map(h => String(h ?? '').trim().toLowerCase());
    const has = h => head.includes(h);
    const kind = has('pengaturan') ? 'pengaturan'
      : has('nama anggota') && has('jumlah') ? 'pembayaran'
      : has('nama anggota') ? 'anggota'
      : has('nama') && has('kategori') ? 'pengeluaran' : '';
    if (!kind) return;
    found.add(kind);
    const field = (r, h) => { const j = head.indexOf(h); return j < 0 ? '' : String(r[j] ?? '').trim(); };

    rows.slice(1).forEach((r, i) => {
      if (kind === 'pengaturan') {
        const path = LABEL_PATH[field(r, 'pengaturan').toLowerCase()];
        if (path) applySetting({ settings, theme }, path, field(r, 'nilai')); else if (!LEGACY.has(field(r, 'pengaturan').toLowerCase())) skipped++;
        return;
      }
      if (kind === 'anggota') { if (field(r, 'nama anggota')) addStudent(field(r, 'nama anggota')); else skipped++; return; }
      const amount = parseMoney(field(r, 'jumlah')), date = normDate(field(r, 'tanggal'));
      const ts = Date.now() - i;
      if (kind === 'pembayaran') {
        if (!field(r, 'nama anggota') || !date || !(amount > 0)) skipped++;
        else payments.push({ id: uid(), studentId: addStudent(field(r, 'nama anggota')).id, amount, date, note: field(r, 'catatan'), ts });
      } else if (kind === 'pengeluaran') {
        if (!field(r, 'nama') || !date || !(amount > 0)) skipped++;
        else expenses.push({ id: uid(), name: field(r, 'nama'), date, amount, category: catOf(field(r, 'kategori')), note: field(r, 'catatan'), ts });
      }
    });
  });
  if (!found.size) throw new Error('bukan format kas');
  return { settings, theme, students: [...students.values()], payments, expenses, skipped, found };
}

export async function fromXlsx(buffer) {
  return fromTables(await readXlsx(buffer));
}