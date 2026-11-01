import '../styles/auth.css';
import { $, ic, esc, todayD, iso, moneyField, parseMoney } from '../core/utils.js';
import { classDefaults } from '../core/store.js';
import { getSession } from '../core/session.js';
import * as db from '../core/db.js';
import { applyTheme } from '../core/theme.js';
import { toast, closeDlg } from '../core/ui.js';
import { closeNotif } from '../components/shell.js';
import { initLanding, renderLanding } from './landing.js';
import { fillQr, downloadQr, shareQr } from '../core/qr.js';

const norm = s => String(s || '').toUpperCase().replace(/[\s-]/g, '');
let onEnter = () => {}, step = 'choose', token = 0, created = null, originVal = 'create', pending = null, shareNotice = false;
const setupUser = () => { const s = getSession(); return s && s.role === 'admin' && !s.classId ? s : null; };

export const initAuth = o => { onEnter = o.onEnter; bind(); initLanding({ onOpen: openAuth }); };
export function showAuth() { stopScan(); document.body.classList.add('is-auth', 'show-landing'); applyTheme(); renderLanding(); }
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const radiusOf = el => (el ? getComputedStyle(el).borderTopLeftRadius : '12px');
function morphRadius(t, get) {
  t.ready.then(() => document.documentElement.animate({ borderRadius: get() }, { duration: 500, easing: 'cubic-bezier(.65,0,.25,1)', pseudoElement: '::view-transition-group(vt-card)' })).catch(() => {});
}
function backHome() {
  const root = document.documentElement, card = $('#authCard');
  if (!document.startViewTransition || reducedMotion()) return showAuth();
  card.style.viewTransitionName = 'vt-card'; root.classList.add('vt-auth');
  let dest = null, rDest = '12px';
  const t = document.startViewTransition(() => {
    card.style.viewTransitionName = ''; showAuth();
    document.querySelectorAll('#landing .lp-hero .lp-rv').forEach(el => { el.style.transition = 'none'; el.classList.add('in'); void el.offsetWidth; el.style.transition = ''; });
    dest = document.querySelector(`#landing .lp-hero [data-open="${originVal}"]`) || document.querySelector('#landing .lp-hero [data-open]');
    if (dest) dest.style.viewTransitionName = 'vt-card';
    rDest = radiusOf(dest);
  });
  morphRadius(t, () => ['24px', rDest]);
  t.finished.finally(() => { if (dest) dest.style.viewTransitionName = ''; root.classList.remove('vt-auth'); });
}
function openAuth(to = 'choose', ev) {
  const root = document.documentElement, card = $('#authCard');
  const src = ev && ev.target && ev.target.closest ? ev.target.closest('[data-open]') : null;
  originVal = (src && src.dataset.open) || to;
  const rSrc = radiusOf(src);
  const swap = () => { document.body.classList.remove('show-landing'); go(to, false); window.scrollTo(0, 0); };
  if (!src || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return swap();
  src.style.viewTransitionName = 'vt-card'; root.classList.add('vt-auth');
  const t = document.startViewTransition(() => { src.style.viewTransitionName = ''; card.style.viewTransitionName = 'vt-card'; swap(); });
  morphRadius(t, () => [rSrc, '24px']);
  t.finished.finally(() => { card.style.viewTransitionName = ''; root.classList.remove('vt-auth'); });
}
export async function logout() { closeDlg(); closeNotif(); await db.signOutAll(); pending = null; showAuth(); }
// Dibuka dari link bagikan: kode sudah ada di link, jadi langsung minta pilih nama siswa.
export async function showShareLogin(code) {
  stopScan(); document.body.classList.add('is-auth'); document.body.classList.remove('show-landing', 'booting'); applyTheme();
  try {
    const info = await db.previewClass(code);
    if (!info) { toast('Link tidak valid, atau kode organisasi sudah diganti.'); return showAuth(); }
    pending = { ...info, code }; shareNotice = true; go('pick', false);
  } catch (e) { toast(db.errMsg(e)); showAuth(); }
}
export function showSetup() { document.body.classList.add('is-auth'); document.body.classList.remove('show-landing'); applyTheme(); go('create', false); }

const back = to => to === 'home'
  ? `<button type="button" class="auth-back" data-home aria-label="Kembali ke beranda">${ic('back')}<span>Beranda</span></button>`
  : `<button type="button" class="auth-back" data-go="${to}" aria-label="Kembali">${ic('back')}<span>Kembali</span></button>`;
const spin = '<i class="spin" aria-hidden="true"></i>';
const submitBtn = (label, extra = '') => `<button class="btn primary auth-btn" type="submit" ${extra}><span class="lbl">${label}</span>${spin}</button>`;
const mark = '<div class="brand-mark is-img auth-mark"><img src="/logo.svg" alt="" width="56" height="56"></div>';

const STEPS = {
  choose: () => `<button type="button" class="auth-back" data-home aria-label="Kembali ke beranda">${ic('back')}<span>Beranda</span></button>${mark}<h1>Kas Organisasi</h1><p class="auth-sub">Catat iuran dan pengeluaran organisasi, transparan untuk semua.</p>
    <div class="auth-opts">
      <button class="auth-opt" data-go="code"><span class="ico in">${ic('user')}</span><span><b>Masuk sebagai anggota</b><small>Pakai kode organisasi dari bendahara</small></span>${ic('arrow')}</button>
      <button class="auth-opt" data-go="create"><span class="ico warn">${ic('plus')}</span><span><b>Buat organisasi baru</b><small>Kamu jadi admin / bendahara organisasi</small></span>${ic('arrow')}</button>
    </div>
    <button class="auth-link" data-go="admin">Sudah punya organisasi? Masuk sebagai admin</button>
    `,

  code: () => `${back('home')}<h2>Masuk ke organisasi</h2><p class="auth-sub">Scan atau lampirkan QR organisasi, atau ketik kode dari bendahara (contoh <b>KAS-K7M2-9QXP</b>).</p>
    <div class="qr-opts">
      <button type="button" class="qr-opt" data-scan>${ic('camera')}<span>Scan QR</span></button>
      <button type="button" class="qr-opt" data-attach>${ic('image')}<span>Lampirkan QR</span></button>
    </div>
    <input type="file" id="qrFile" accept="image/*" hidden>
    <div class="or"><span>atau ketik kode</span></div>
    <form id="codeForm" novalidate autocomplete="off"><div class="field"><label for="a-code">Kode organisasi</label><input class="input code-input" id="a-code" maxlength="14" placeholder="KAS-XXXX-XXXX" autocapitalize="characters" spellcheck="false" value="${esc(created ? '' : '')}"></div>
    <p class="err" id="a-err" role="alert"></p>${submitBtn('Verifikasi kode')}</form>
    <button type="button" class="auth-link" data-go="admin">Masuk sebagai admin</button>`,

  scan: () => `${back('code')}<h2>Scan QR organisasi</h2><p class="auth-sub">Arahkan kamera ke QR yang dibagikan bendahara.</p>
    <div class="scan-box"><video id="qrVideo" playsinline muted></video><div class="scan-frame"><i></i></div></div>
    <p class="err" id="a-err" role="alert"></p>`,

  pick: () => `${back('code')}<div class="verified">${ic('check')}<span>organisasi terverifikasi · <b>${esc(pending ? pending.name || '' : '')}</b></span></div>
    ${shareNotice ? `<div class="share-note">${ic('lock')}<span>Kamu membuka link kas. Masuk dulu sebagai siswa organisasi ini, lalu kamu langsung dibawa ke dashboard.</span></div>` : ''}
    <h2>Kamu siswa yang mana?</h2><p class="auth-sub">Pilih namamu dari daftar organisasi.</p>
    <form id="pickForm"><div id="pickBox"><div class="skel" aria-label="Memuat daftar siswa"></div><p class="skel-txt">Memuat daftar siswa…</p></div><p class="err" id="a-err" role="alert"></p>${submitBtn('Masuk', 'disabled id="pickGo"')}</form>`,

  create: () => { const su = setupUser(); return `${su ? '' : back('home')}<h2>Buat organisasi baru</h2><p class="auth-sub">${su ? `Kamu masuk sebagai <b>${esc(su.email || '')}</b>. Tinggal buat organisasinya.` : 'Kamu akan jadi admin. anggota ditambahkan setelah organisasi dibuat.'}</p>
    <form id="createForm" novalidate autocomplete="off">
      <div class="field"><label for="c-n">Nama organisasi</label><input class="input" id="c-n" name="className" maxlength="40" placeholder="Contoh: organisasi XI IPA 2" required></div>
      <div class="row2"><div class="field"><label for="c-m">Sistem iuran</label><select class="input" id="c-m" name="mode"><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option></select></div>
      <div class="field"><label for="c-a">Nominal per periode</label>${moneyField('c-a', 'nominal', 5000)}</div></div>
      ${su ? '' : `<div class="field"><label for="c-e">Email admin</label><input class="input" id="c-e" name="email" type="email" autocomplete="email" maxlength="120" placeholder="kamu@email.com" required></div>
      <div class="field"><label for="c-p">Password (min. 6 karakter)</label><input class="input" id="c-p" name="password" type="password" maxlength="72" autocomplete="new-password" required><small class="hint">Dipakai untuk masuk lagi sebagai admin.</small></div>`}
      <p class="err" id="a-err" role="alert"></p>${submitBtn('Buat organisasi')}</form>${su ? '<button type="button" class="auth-link" data-logout>Bukan kamu? Keluar</button>' : ''}`; },

  confirm: () => `<div class="done-ico">${ic('check')}</div><h2>Cek emailmu</h2><p class="auth-sub">Kami kirim link konfirmasi ke emailmu. Klik link itu, lalu masuk sebagai admin. Organisasinya dibuat setelah kamu masuk.</p>
    <button class="btn primary auth-btn" data-go="admin"><span class="lbl">Ke halaman masuk admin</span></button>`,

  created: () => `<div class="done-ico">${ic('check')}</div><h2>organisasi berhasil dibuat</h2><p class="auth-sub"><b>${esc(created.className)}</b> siap dipakai. Bagikan kode ini ke teman seorganisasi:</p>
    <div class="code-box"><b id="newCode">${esc(created.code)}</b><button class="icon-btn" data-copy aria-label="Salin kode">${ic('copy')}</button></div>
    <div class="qr-share"><div class="qr-thumb big"><img id="newQr" alt="QR kode organisasi" width="168" height="168"></div><div class="qr-btns"><button type="button" class="btn" data-qr-share>${ic('share')}Bagikan QR</button><button type="button" class="btn" data-qr-dl>${ic('down')}Unduh QR</button></div></div>
    <p class="hint auth-hint">Tambahkan nama anggota beserta password-nya di Pengaturan › Admin supaya mereka bisa masuk.</p>
    <button class="btn primary auth-btn" data-enter-admin><span class="lbl">Mulai kelola kas</span></button>`,

  admin: () => `${back('code')}<h2>Masuk sebagai admin</h2><p class="auth-sub">Masukkan email dan password admin organisasi.</p>
    <form id="adminForm" novalidate autocomplete="on">
      <div class="field"><label for="ad-e">Email</label><input class="input" id="ad-e" type="email" autocomplete="email" maxlength="120"></div>
      <div class="field"><label for="ad-p">Password</label><input class="input" id="ad-p" type="password" maxlength="72" autocomplete="current-password"></div>
      <p class="err" id="a-err" role="alert"></p>${submitBtn('Masuk')}</form>
    <button type="button" class="auth-link" data-go="forgot">Lupa password?</button>`,

  forgot: () => `${back('admin')}<h2>Lupa password</h2><p class="auth-sub">Masukkan email adminmu. Kami kirim link untuk membuat password baru.</p>
    <form id="forgotForm" novalidate>
      <div class="field"><label for="fg-e">Email</label><input class="input" id="fg-e" type="email" autocomplete="email" maxlength="120"></div>
      <p class="err" id="a-err" role="alert"></p><p class="hint" id="fg-ok" role="status"></p>${submitBtn('Kirim link reset')}</form>`,
};

const DEPTH = { choose: 0, code: 0, create: 0, admin: 1, scan: 1, pick: 1, created: 1, confirm: 1, forgot: 2 };
function go(to, anim = true) {
  const card = $('#authCard'), old = card.firstElementChild, h0 = card.offsetHeight;
  const dir = (DEPTH[to] || 0) >= (DEPTH[step] || 0) ? 1 : -1;
  step = to; token++; stopScan(); if (to !== 'pick') shareNotice = false;
  card.innerHTML = `<div class="auth-step">${STEPS[to]()}</div>`;
  const cur = card.firstElementChild;
  if (anim && old && h0 && !reducedMotion()) {
    const ease = 'cubic-bezier(.2,.8,.2,1)', out = document.createElement('div');
    out.className = 'auth-out'; out.append(old); card.append(out);
    out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 26}px)` }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).onfinish = () => out.remove();
    cur.animate([{ opacity: 0, transform: `translateX(${dir * 26}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 120, easing: ease, fill: 'backwards' });
    const h1 = card.offsetHeight;
    if (h1 !== h0) card.animate({ height: [h0 + 'px', h1 + 'px'] }, { duration: 420, easing: ease });
  }
  const f = card.querySelector('input:not([type=file])'); if (f && window.innerWidth > 820) f.focus({ preventScroll: true });
  if (to === 'pick') loadStudents(token);
  if (to === 'scan') startScan(token);
  if (to === 'created') fillQr($('#newQr'), created.code, 336);
}

async function loadStudents(t) {
  if (t !== token) return;
  const box = $('#pickBox'); if (!box) return;
  const list = (pending ? pending.students || [] : []).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) { box.innerHTML = '<div class="empty-note">Belum ada anggota terdaftar. Minta admin menambahkan nama kamu dulu.</div>'; return; }
  box.innerHTML = `<div class="field fade-in"><label for="a-stu">Nama anggota</label><select class="input" id="a-stu" name="sid"><option value="" disabled selected>Pilih namamu…</option>${list.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
  <div class="field fade-in"><label for="a-spw">Password</label><input class="input" id="a-spw" name="studentPw" type="password" maxlength="72" autocomplete="current-password" placeholder="Password dari bendahara"></div>`;
  const chk = () => { $('#pickGo').disabled = !($('#a-stu').value && $('#a-spw').value); };
  $('#a-stu').onchange = chk;
  $('#a-spw').oninput = chk;
}

let stream = null, raf = 0;
const stopScan = () => { cancelAnimationFrame(raf); if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
const codeFrom = txt => { const m = String(txt || '').toUpperCase().match(/KAS-[A-Z0-9]{3,5}(?:-[A-Z0-9]{4})?/); return m ? m[0] : ''; };
async function makeDecoder() {
  if ('BarcodeDetector' in window) {
    const d = new BarcodeDetector({ formats: ['qr_code'] });
    return async src => { const r = await d.detect(src); return r[0] ? r[0].rawValue : ''; };
  }
  const { default: jsQR } = await import('jsqr');
  return async src => {
    let w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    const k = Math.min(1, 900 / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
    const r = jsQR(x.getImageData(0, 0, w, h).data, w, h); return r ? r.data : '';
  };
}
async function qrFound(code) {
  stopScan();
  try {
    const info = await db.previewClass(code);
    if (!info) { go('code'); const i = $('#a-code'); if (i) i.value = code; return setErr('Kode di QR tidak ditemukan. Minta QR terbaru ke bendahara.'); }
    pending = { ...info, code }; toast('QR terbaca · organisasi terverifikasi'); go('pick');
  } catch (e) { go('code'); setErr(db.errMsg(e)); }
}
async function startScan(t) {
  try {
    const detect = await makeDecoder();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (t !== token) return stopScan();
    const v = $('#qrVideo'); v.srcObject = stream; await v.play();
    const tick = async () => {
      if (t !== token) return;
      try { const code = codeFrom(await detect(v)); if (code) return qrFound(code); } catch { }
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch (e) {
    if (t !== token) return;
    setErr(e && e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan kamera, atau pakai \"Lampirkan QR\".' : 'Kamera tidak bisa dibuka. Coba \"Lampirkan QR\".');
  }
}
async function readQrFile(file) {
  setErr('');
  try {
    const detect = await makeDecoder(), img = await createImageBitmap(file), code = codeFrom(await detect(img));
    if (!code) return setErr('QR tidak terbaca atau bukan QR Kas Organisasi.');
    qrFound(code);
  } catch { setErr('Gambar tidak bisa dibaca. Coba foto QR yang lebih jelas.'); }
}

const setErr = m => { const e = $('#a-err'); if (e) { e.textContent = m; const c = $('#authCard'); c.classList.remove('shake'); void c.offsetWidth; if (m) c.classList.add('shake'); } };
const busy = (btn, on) => { btn.classList.toggle('loading', on); btn.disabled = on; };

async function verifyCode(btn, code) {
  setErr(''); if (!norm(code)) return setErr('Kode organisasi wajib diisi.');
  busy(btn, true);
  try {
    const info = await db.previewClass(code);
    if (!info) { busy(btn, false); return setErr('Kode organisasi tidak ditemukan. Cek lagi ke bendahara.'); }
    pending = { ...info, code }; go('pick');
  } catch (e) { busy(btn, false); setErr(db.errMsg(e)); }
}

function bind() {
  const root = $('#auth');
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-home]')) return backHome();
    if (e.target.closest('[data-scan]')) return go('scan');
    if (e.target.closest('[data-attach]')) return $('#qrFile').click();
    if (e.target.closest('[data-qr-share]')) { try { if (await shareQr(created.code, created.className) === 'downloaded') toast('Perangkat ini tak punya menu bagikan, QR diunduh'); } catch { toast('Gagal membagikan QR'); } return; }
    if (e.target.closest('[data-qr-dl]')) {try { await downloadQr(created.code, created.className); toast('QR organisasi diunduh'); } catch { toast('Gagal membuat QR'); } return; }
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    if (e.target.closest('[data-logout]')) { await db.signOutAll(); return showAuth(); }
    if (e.target.closest('[data-copy]')) { try { await navigator.clipboard.writeText(created.code); } catch { } return toast('Kode organisasi disalin'); }
    if (e.target.closest('[data-enter-admin]')) { created = null; onEnter(); }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'qrFile') return;
    const f = e.target.files[0]; e.target.value = ''; if (f) readQrFile(f);
  });
  root.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]');
    if (f.id === 'codeForm') return verifyCode(btn, $('#a-code').value);
    if (f.id === 'pickForm') {
      const sid = f.elements.sid && f.elements.sid.value, pw = f.elements.studentPw && f.elements.studentPw.value;
      if (!sid || !pending) return;
      if (!pw) return setErr('Password wajib diisi.');
      setErr(''); busy(btn, true);
      try {
        if ((await db.joinClass(pending.code, sid, pw)) !== 'app') throw new Error('Gagal masuk. Coba lagi.');
        pending = null; onEnter();
      } catch (er) { setErr(db.errMsg(er)); }
      busy(btn, false);
    }
    if (f.id === 'adminForm') {
      setErr(''); const email = $('#ad-e').value.trim(), pw = $('#ad-p').value;
      if (!email || !pw) return setErr('Email dan password wajib diisi.');
      busy(btn, true);
      try {
        const st = await db.signInAdmin(email, pw);
        if (st === 'app') onEnter();
        else if (st === 'setup') { toast('Akun ini belum punya organisasi. Buat dulu.'); go('create'); return; }
        else throw new Error('Akun ini bukan admin organisasi.');
      } catch (er) { setErr(db.errMsg(er)); }
      busy(btn, false);
    }
    if (f.id === 'forgotForm') {
      setErr(''); const email = $('#fg-e').value.trim();
      if (!email) return setErr('Email wajib diisi.');
      busy(btn, true);
      try { await db.sendReset(email); $('#fg-ok').textContent = 'Kalau email terdaftar, link reset sudah dikirim. Cek kotak masuk dan folder spam.'; }
      catch (er) { setErr(db.errMsg(er)); }
      busy(btn, false);
    }
    if (f.id === 'createForm') {
      setErr(''); const v = Object.fromEntries(new FormData(f)), nominal = parseMoney(v.nominal), su = setupUser();
      if (!v.className.trim()) return setErr('Nama organisasi wajib diisi.');
      if (!(nominal > 0)) return setErr('Nominal iuran harus lebih dari 0.');
      if (!su) {
        if (!/^\S+@\S+\.\S+$/.test(String(v.email || '').trim())) return setErr('Email tidak valid.');
        if (String(v.password || '').length < 6) return setErr('Password minimal 6 karakter.');
      }
      busy(btn, true);
      try {
        const res = await db.createClass({
          email: String(v.email || '').trim(), password: v.password,
          settings: { className: v.className.trim(), mode: v.mode, nominal, startDate: iso(todayD()), openingBalance: 0, reminderDays: 2, ...classDefaults(), targetName: '', targetAmount: 0 },
        });
        if (res.needsConfirm) return go('confirm');
        created = res; go('created');
      } catch (er) { busy(btn, false); setErr(db.errMsg(er)); }
    }
  });
}
