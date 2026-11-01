import { sb } from './supabase.js';
import { S, replace, normalize, emptyState } from './store.js';
import { getSession, setSession, clearSession } from './session.js';
import { genCode } from './utils.js';
import { unlinkPush } from './push.js';

export function errMsg(e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  const c = e && (e.code || e.status);
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Tidak bisa terhubung ke server. Cek koneksi internet.';
  if (/invalid login credentials/i.test(m)) return 'Email atau password salah.';
  if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk emailmu.';
  if (/already registered|already been registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk sebagai admin.';
  if (/password should be at least|weak.password/i.test(m)) return 'Password minimal 6 karakter.';
  if (/anonymous sign-ins are disabled/i.test(m)) return 'Login anggota belum aktif di server (Supabase: Allow anonymous sign-ins).';
  if (/classes_owner_unique/i.test(m)) return 'Akun ini sudah punya organisasi. Silakan masuk sebagai admin.';
  if (/rate limit|too many|429/i.test(m + c)) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (/row-level security|permission denied|42501/i.test(m + c)) return 'Kamu tidak punya izin untuk aksi ini.';
  if (/captcha/i.test(m)) return 'Verifikasi CAPTCHA gagal. Muat ulang halaman lalu coba lagi.';
  return m || 'Terjadi kesalahan. Coba lagi.';
}
export const isNetErr = e => /failed to fetch|networkerror|load failed/i.test(String((e && e.message) || ''));

const must = ({ data, error }) => { if (error) throw error; return data; };

const affected = ({ data, error }) => {
  if (error) throw error;
  if (!data || !data.length) throw new Error('Kamu tidak punya izin untuk aksi ini, atau datanya sudah tidak ada.');
  return data;
};
const put = (list, item) => { const i = list.findIndex(x => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); };
const cid = () => { const s = getSession(); if (!s || !s.classId) throw new Error('Belum masuk ke organisasi.'); return s.classId; };

const PAY_COLS = 'id, student_id, amount, paid_on, note, created_at';
const EXP_COLS = 'id, name, spent_on, amount, category, note, created_at, has_photo';
const toPay = r => ({ id: r.id, studentId: r.student_id, amount: Number(r.amount), date: r.paid_on, note: r.note || '', ts: Date.parse(r.created_at) });
const toExp = r => ({ id: r.id, name: r.name, date: r.spent_on, amount: Number(r.amount), category: r.category || '', note: r.note || '', ts: Date.parse(r.created_at), hasPhoto: !!r.has_photo });

async function fetchAll(table, cols, classId) {
  const out = [], step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await sb.from(table).select(cols).eq('class_id', classId).order('created_at').order('id').range(from, from + step - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < step) break;
  }
  return out;
}

export async function loadAll(classId) {
  const [cls, students, payments, expenses, reads, bcs] = await Promise.all([
    sb.from('classes').select('id, code, settings').eq('id', classId).maybeSingle(),
    fetchAll('students', 'id, name', classId),
    fetchAll('payments', PAY_COLS, classId),
    fetchAll('expenses', EXP_COLS, classId),
    sb.from('notif_reads').select('notif_id'),
    sb.from('broadcasts').select('id, title, body, created_at').eq('class_id', classId).order('created_at', { ascending: false }).limit(30),
  ]);
  if (cls.error) throw cls.error;
  if (!cls.data) return false;
  if (reads.error) throw reads.error;
  replace(normalize({
    settings: { ...emptyState().settings, ...cls.data.settings, classCode: cls.data.code },
    students,
    payments: payments.map(toPay),
    expenses: expenses.map(toExp),
    readNotifs: reads.data.map(r => r.notif_id),
    // kalau tabel broadcasts belum dibuat (schema_update2.sql belum dijalankan), aplikasi tetap jalan
    broadcasts: bcs.error ? [] : bcs.data.map(r => ({ id: r.id, title: r.title, body: r.body || '', ts: Date.parse(r.created_at) })),
  }));
  return true;
}

export async function bootSession() {
  const { data: { session }, error } = await sb.auth.getSession();
  if (error) throw error;
  if (!session) { clearSession(); return 'none'; }
  const user = session.user;
  if (user.is_anonymous) {
    const m = must(await sb.from('class_members').select('class_id, student_id').eq('user_id', user.id).maybeSingle());
    if (!m) { clearSession(); return 'none'; }
    setSession({ role: 'anggota', classId: m.class_id, studentId: m.student_id });
  } else {
    const c = must(await sb.from('classes').select('id').eq('owner_id', user.id).order('created_at').limit(1).maybeSingle());
    setSession({ role: 'admin', classId: c ? c.id : null, email: user.email });
    if (!c) return 'setup';
  }
  if (!(await loadAll(getSession().classId))) { clearSession(); return 'none'; }
  return 'app';
}

export async function signOutAll() {
  stopRealtime();
  await unlinkPush();
  try { await sb.auth.signOut({ scope: 'local' }); } catch { }
  clearSession(); replace(emptyState()); photoCache.clear();
}

export async function previewClass(code) {
  const { data, error } = await sb.rpc('preview_class', { p_code: code });
  if (error) throw error;
  return data;
}

export async function joinClass(code, studentId) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { const { error } = await sb.auth.signInAnonymously(); if (error) throw error; }
  else if (!session.user.is_anonymous) throw new Error('Kamu sedang masuk sebagai admin. Keluar dulu untuk masuk sebagai anggota.');
  const { error } = await sb.rpc('join_class', { p_code: code, p_student: studentId });
  if (error) throw error;
  return bootSession();
}

export async function signInAdmin(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return bootSession();
}

export async function sendReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) throw error;
}

export async function changePassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function createClass({ email, password, settings }) {
  const { data: { session } } = await sb.auth.getSession();
  let user = session && !session.user.is_anonymous ? session.user : null;
  if (!user) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) return { needsConfirm: true };
    user = data.user;
  }
  for (let i = 0; i < 4; i++) {
    const code = genCode();
    const { data, error } = await sb.from('classes').insert({ code, settings }).select('id, code').single();
    if (!error) {
      setSession({ role: 'admin', classId: data.id, email: user.email });
      await loadAll(data.id);
      return { code: data.code, className: settings.className };
    }
    if (error.code === '23505' && /classes_code/.test(error.message)) continue; 
    throw error;
  }
  throw new Error('Gagal membuat kode organisasi. Coba lagi.');
}

export async function addPayment({ studentId, amount, date, note }) {
  const r = must(await sb.from('payments').insert({ class_id: cid(), student_id: studentId, amount, paid_on: date, note }).select(PAY_COLS).single());
  put(S.payments, toPay(r));
}
export async function deletePayment(id) {
  affected(await sb.from('payments').delete().eq('id', id).select('id'));
  S.payments = S.payments.filter(p => p.id !== id);
}

const photoCache = new Map();
export async function getPhoto(expenseId) {
  if (photoCache.has(expenseId)) return photoCache.get(expenseId);
  const r = must(await sb.from('expense_photos').select('photo').eq('expense_id', expenseId).maybeSingle());
  const p = r ? r.photo : '';
  photoCache.set(expenseId, p);
  return p;
}
async function applyPhoto(id, op) {
  if (!op) return;
  if (op.data) {
    must(await sb.from('expense_photos').upsert({ expense_id: id, class_id: cid(), photo: op.data }));
    photoCache.set(id, op.data);
  } else {
    must(await sb.from('expense_photos').delete().eq('expense_id', id));
    photoCache.delete(id);
  }
}
const expRow = d => ({ name: d.name, spent_on: d.date, amount: d.amount, category: d.category, note: d.note });
const hasPhotoAfter = (op, before) => (op ? !!op.data : before);

export async function addExpense(d, op = null) {
  const id = crypto.randomUUID();
  must(await sb.from('expenses').insert({ id, class_id: cid(), ...expRow(d), has_photo: hasPhotoAfter(op, false) }));
  try { await applyPhoto(id, op); }
  catch (e) { await sb.from('expenses').delete().eq('id', id); throw e; }
  const r = must(await sb.from('expenses').select(EXP_COLS).eq('id', id).single());
  put(S.expenses, toExp(r));
}
export async function updateExpense(id, d, op = null) {
  const cur = S.expenses.find(x => x.id === id);
  const r = affected(await sb.from('expenses').update({ ...expRow(d), has_photo: hasPhotoAfter(op, !!(cur && cur.hasPhoto)) }).eq('id', id).select(EXP_COLS));
  await applyPhoto(id, op);
  put(S.expenses, toExp(r[0]));
}
export async function deleteExpense(id) {
  affected(await sb.from('expenses').delete().eq('id', id).select('id'));
  S.expenses = S.expenses.filter(x => x.id !== id);
  photoCache.delete(id);
}

export async function addStudent(name) {
  const r = must(await sb.from('students').insert({ class_id: cid(), name }).select('id, name').single());
  put(S.students, r);
}
export async function renameStudent(id, name) {
  affected(await sb.from('students').update({ name }).eq('id', id).select('id'));
  const s = S.students.find(x => x.id === id); if (s) s.name = name;
}
export async function deleteStudent(id) {
  affected(await sb.from('students').delete().eq('id', id).select('id'));
  S.students = S.students.filter(x => x.id !== id);
  S.payments = S.payments.filter(p => p.studentId !== id);
}

export async function saveSettings(patch, { optimistic = false } = {}) {
  const before = S.settings, next = { ...S.settings, ...patch };
  const { classCode, ...rest } = next;
  if (optimistic) S.settings = next;
  try {
    affected(await sb.from('classes').update({ settings: rest }).eq('id', cid()).select('id'));
    S.settings = next;
  } catch (e) { S.settings = before; throw e; }
}

export async function regenerateCode() {
  for (let i = 0; i < 4; i++) {
    const code = genCode();
    const { data, error } = await sb.from('classes').update({ code }).eq('id', cid()).select('id');
    if (!error && data && data.length) { S.settings.classCode = code; return code; }
    if (error && !(error.code === '23505' && /classes_code/.test(error.message))) throw error;
    if (!error) throw new Error('Kamu tidak punya izin untuk aksi ini.');
  }
  throw new Error('Gagal membuat kode baru. Coba lagi.');
}

export function markRead(ids) {
  const fresh = ids.filter(id => !S.readNotifs.includes(id));
  if (!fresh.length) return;
  S.readNotifs = [...S.readNotifs, ...fresh];
  sb.from('notif_reads').upsert(fresh.map(notif_id => ({ notif_id })), { onConflict: 'user_id,notif_id', ignoreDuplicates: true })
    .then(() => { }, () => { });
}

// Kirim pengumuman: disimpan (muncul di lonceng siswa) + dikirim sebagai notifikasi HP.
export async function sendBroadcast({ title, body, studentIds }) {
  const { data, error } = await sb.functions.invoke('send-push', { body: { title, body, studentIds } });
  if (error) {
    let m = '';
    try { m = (await error.context.json()).error; } catch { }
    if (!m && /failed to send|not found|404|relay/i.test(String(error.message))) m = 'Fungsi send-push belum dipasang di Supabase.';
    throw new Error(m || error.message || 'Gagal mengirim notifikasi.');
  }
  if (data && data.error) throw new Error(data.error);
  await loadAll(cid());
  return data;
}

// id siswa yang sudah mengaktifkan notifikasi HP (untuk info jangkauan di dialog kirim).
export async function pushReach() {
  const id = cid();
  const [subs, mem] = await Promise.all([
    sb.from('push_subscriptions').select('user_id').eq('class_id', id),
    sb.from('class_members').select('user_id, student_id').eq('class_id', id),
  ]);
  if (subs.error) throw subs.error;
  if (mem.error) throw mem.error;
  const users = new Set(subs.data.map(s => s.user_id));
  return new Set(mem.data.filter(m => users.has(m.user_id)).map(m => m.student_id));
}

// Ganti seluruh isi (Muat Excel, Mulai dari kosong, Data contoh) dalam satu transaksi di server.
export async function replaceAll({ students, payments, expenses }) {
  const map = new Map(students.map(s => [s.id, crypto.randomUUID()]));
  must(await sb.rpc('replace_class_data', {
    p_class: cid(),
    p_students: students.map(s => ({ id: map.get(s.id), name: s.name })),
    p_payments: payments.filter(p => map.has(p.studentId)).map(p => ({ student_id: map.get(p.studentId), amount: p.amount, date: p.date, note: p.note || '', ts: p.ts })),
    p_expenses: expenses.map(e => ({ name: e.name, date: e.date, amount: e.amount, category: e.category, note: e.note || '', ts: e.ts })),
  }));
  photoCache.clear();
  await loadAll(cid());
}

let channel = null, timer = 0, onRemote = () => { };
async function refresh() {
  try { const ok = await loadAll(cid()); onRemote(ok); }
  catch (e) { console.warn('refresh gagal', e); }
}
const ping = () => { clearTimeout(timer); timer = setTimeout(refresh, 400); };
const onVis = () => { if (document.visibilityState === 'visible') ping(); };

export function startRealtime(cb) {
  stopRealtime();
  onRemote = cb;
  channel = sb.channel('kedas-' + cid());
  ['classes', 'students', 'payments', 'expenses', 'broadcasts'].forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table }, ping));
  channel.subscribe();
  document.addEventListener('visibilitychange', onVis);
}
export function stopRealtime() {
  clearTimeout(timer);
  document.removeEventListener('visibilitychange', onVis);
  if (channel) { sb.removeChannel(channel); channel = null; }
}
