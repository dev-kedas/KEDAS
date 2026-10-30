import { uid, iso, addDays, todayD } from './utils.js';

export const classDefaults = () => ({ theme: { mode: 'light', accent: 'green', forced: false } });
export function normalize(d) {
  const df = classDefaults();
  d.readNotifs = d.readNotifs || [];
  d.settings = { ...df, ...d.settings, theme: { ...df.theme, ...(d.settings && d.settings.theme) } };
  return d;
}
export const emptyState = () => normalize({
  settings: { className: '', mode: 'weekly', nominal: 5000, startDate: iso(todayD()), openingBalance: 0, reminderDays: 2, targetName: '', targetAmount: 0, classCode: '' },
  students: [], payments: [], expenses: [], readNotifs: [],
});
export function seed() {
  const t = todayD();
  const students = ['Aditya Pratama', 'Bunga Lestari', 'Citra Dewi', 'Dimas Saputra', 'Eka Putri', 'Fajar Nugroho', 'Gita Maharani', 'Hendra Wijaya']
    .map(name => ({ id: uid(), name }));
  const mk = (i, amount, back, note = '') => ({ id: uid(), studentId: students[i].id, amount, date: iso(addDays(t, -back)), note, ts: Date.now() - back * 1e5 });
  return {
    settings: { className: 'organisasi XI IPA 2', mode: 'weekly', nominal: 5000, startDate: iso(addDays(t, -21)), openingBalance: 100000, reminderDays: 2, ...classDefaults(), targetName: 'Study tour', targetAmount: 1500000 },
    students,
    payments: [mk(0, 20000, 20), mk(1, 20000, 19), mk(2, 10000, 18), mk(3, 5000, 12), mk(4, 20000, 14), mk(5, 15000, 6), mk(6, 25000, 5, 'Bayar di muka')],
    expenses: [
      { id: uid(), name: 'Sapu & pel organisasi', date: iso(addDays(t, -15)), amount: 35000, category: 'Kebersihan', note: 'Beli di koperasi', ts: Date.now() - 15e5 },
      { id: uid(), name: 'Fotokopi soal latihan', date: iso(addDays(t, -4)), amount: 12000, category: 'Fotokopi', note: '', ts: Date.now() - 4e5 },
    ],
    readNotifs: [],
  };
}

export const S = emptyState();
export function replace(d) { Object.keys(S).forEach(k => delete S[k]); Object.assign(S, d); }
