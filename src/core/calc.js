import { S } from './store.js';
import { parse, addDays, todayD, fmt } from './utils.js';

export function periodStart(i) {
  const s = parse(S.settings.startDate);
  if (S.settings.mode === 'weekly') return addDays(s, 7 * i);
  const y = s.getFullYear(), m = s.getMonth() + i;
  const dim = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(s.getDate(), dim));
}
export const periodDue = i => addDays(periodStart(i + 1), -1);
export function periodLabel(i) {
  const a = periodStart(i);
  if (S.settings.mode === 'weekly') return `Minggu ke-${i + 1} (${fmt(a, { day: 'numeric', month: 'short' })} – ${fmt(periodDue(i), { day: 'numeric', month: 'short' })})`;
  return fmt(a, { month: 'long', year: 'numeric' });
}
export function billedCount() {
  const t = todayD(); let n = 0;
  while (n < 600 && periodStart(n) <= t) n++;
  return n;
}

export function compute() {
  const t = todayD(), n = billedCount(), nom = +S.settings.nominal || 0;
  const rows = S.students.map(st => {
    const pays = S.payments.filter(p => p.studentId === st.id).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    const paid = pays.reduce((a, p) => a + p.amount, 0);
    let rem = paid; const periods = [];
    for (let i = 0; i < n; i++) {
      const pd = Math.min(nom, rem); rem -= pd;
      const due = periodDue(i), left = nom - pd;
      periods.push({ i, due, paid: pd, left, status: left === 0 ? 'lunas' : due < t ? 'tunggak' : 'belum' });
    }
    const wajib = nom * n, sisa = Math.max(0, wajib - paid);
    const overdue = periods.filter(p => p.status === 'tunggak');
    const status = overdue.length ? 'tunggak' : sisa > 0 ? 'belum' : 'lunas';
    return { st, pays, paid, wajib, sisa, extra: Math.max(0, paid - wajib), periods, overdue, status };
  });
  const income = S.payments.reduce((a, p) => a + p.amount, 0);
  const expense = S.expenses.reduce((a, e) => a + e.amount, 0);
  const wajibAll = rows.reduce((a, r) => a + r.wajib, 0);
  const sisaAll = rows.reduce((a, r) => a + r.sisa, 0);
  const paidAll = rows.reduce((a, r) => a + Math.min(r.paid, r.wajib), 0);
  return { rows, n, income, expense, balance: (+S.settings.openingBalance || 0) + income - expense, wajibAll, sisaAll, rate: wajibAll ? Math.round(paidAll / wajibAll * 100) : 100 };
}

export function notifications(c) {
  const t = todayD(), list = [];
  c.rows.forEach(r => {
    if (r.sisa <= 0) return;
    const first = r.periods.find(p => p.left > 0);
    const days = Math.round((first.due - t) / 864e5);
    let type, title, text;
    if (r.overdue.length) { type = 'tunggak'; title = `${r.st.name} menunggak`; text = `${r.overdue.length} periode terlambat · sejak ${fmt(r.overdue[0].due)}`; }
    else if (days <= (+S.settings.reminderDays || 0)) { type = 'tempo'; title = `${r.st.name}: jatuh tempo ${days === 0 ? 'hari ini' : days + ' hari lagi'}`; text = periodLabel(first.i); }
    else { type = 'belum'; title = `${r.st.name} belum bayar`; text = periodLabel(first.i); }
    list.push({ id: `${r.st.id}|${type}|${first.i}`, type, title, text, sid: r.st.id, sisa: r.sisa, due: first.due, rank: { tunggak: 0, tempo: 1, belum: 2 }[type] });
  });
  return list.sort((a, b) => a.rank - b.rank || a.due - b.due);
}

export function transactions() {
  const nm = id => (S.students.find(s => s.id === id) || { name: 'anggota dihapus' }).name;
  return [
    ...S.payments.map(p => ({ type: 'in', id: p.id, sid: p.studentId, title: `Pembayaran · ${nm(p.studentId)}`, sub: p.note || 'Kas masuk', date: p.date, amount: p.amount, ts: p.ts })),
    ...S.expenses.map(e => ({ type: 'out', id: e.id, title: e.name, sub: e.category, date: e.date, amount: e.amount, ts: e.ts })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
}
