import '../styles/pages/settings.css';
import { $, ic, esc, initials, iso, todayD, moneyField, parseMoney } from '../core/utils.js';
import { S, seed } from '../core/store.js';
import * as db from '../core/db.js';
import { isAdmin, getSession, userName } from '../core/session.js';
import { ACCENTS, MODES, classTheme, getPref, setPref, setCustomAccent, resolveTheme, applyTheme } from '../core/theme.js';
import { openDlg, closeDlg, toast, confirmBox, registerActions, registerForms } from '../core/ui.js';
import { render as rerender } from '../core/router.js';
import { logout } from './auth.js';
import { fillQr, shareQr, downloadQr } from '../core/qr.js';
import { toXlsx, fromXlsx } from '../core/backup.js';
import { compute } from '../core/calc.js';

let tab = 'user';
let shownTab = 'user';
const paneAnim = () => { const c = shownTab === tab ? '' : tab === 'admin' ? 'from-r' : 'from-l'; shownTab = tab; return c; };

const pos = {}, sw = {};
export function placeIndicators() {
  document.querySelectorAll('#view [data-k]').forEach(g => {
    const ind = g.querySelector(':scope > .seg-ind, :scope > .sw-ind'), on = g.querySelector(':scope > button.on, :scope > label.on'); if (!ind || !on) return;
    const sw = ind.classList.contains('sw-ind'), k = g.dataset.k;
    const to = sw ? { x: on.offsetLeft - 4, y: on.offsetTop - 4, w: 50, c: on.style.getPropertyValue('--c2') } : { x: on.offsetLeft, y: 0, w: on.offsetWidth, c: '' };
    const from = pos[k] || to;
    ind.style.transition = 'none'; ind.style.width = from.w + 'px'; ind.style.transform = `translate(${from.x}px,${from.y}px)`; if (sw) ind.style.borderColor = from.c;
    void ind.offsetWidth; ind.style.transition = '';
    ind.style.width = to.w + 'px'; ind.style.transform = `translate(${to.x}px,${to.y}px)`; if (sw) ind.style.borderColor = to.c;
    pos[k] = to;
  });
  document.querySelectorAll('#view .switch[data-k]').forEach(b => {
    const k = b.dataset.k, to = b.classList.contains('on'), from = k in sw ? sw[k] : to;
    sw[k] = to;
    if (from !== to) { b.classList.toggle('on', from); void b.offsetWidth; b.classList.toggle('on', to); }
  });
}

export const seg = (act, items, cur, dis = false) => `<div class="seg ${dis ? 'dis' : ''}" data-k="${act}" role="group"><span class="seg-ind" aria-hidden="true"></span>${items.map(([v, l, i]) => `<button type="button" class="${cur === v ? 'on' : ''}" data-act="${act}" data-id="${v}" ${dis ? 'disabled' : ''}>${i ? ic(i) : ''}${l}</button>`).join('')}</div>`;
const accentHex = t => (t.accent === 'custom' && t.customHex ? t.customHex : ACCENTS[t.accent].c);
const swatches = (act, cur, dis = false, hex = ACCENTS.custom.c) => {
  const presets = Object.entries(ACCENTS).filter(([k]) => k !== 'custom').map(([k, a]) => `<button type="button" class="sw ${cur === k ? 'on' : ''}" style="--c:${a.c};--c2:${a.c2}" data-act="${act}" data-id="${k}" aria-label="${a.name}" title="${a.name}" ${dis ? 'disabled' : ''}>${ic('check')}</button>`).join('');
  const custom = `<label class="sw sw-custom ${cur === 'custom' ? 'on' : ''} ${dis ? 'dis' : ''}" style="--c:${hex};--c2:${hex}" title="Warna kustom" aria-label="Pilih warna kustom">${ic('check')}${ic('plus')}<input type="color" value="${hex}" data-cc="${act}" ${dis ? 'disabled' : ''}></label>`;
  const name = cur === 'custom' ? `Kustom <code>${hex.toUpperCase()}</code>` : (ACCENTS[cur] || ACCENTS.green).name;
  return `<div class="swatches ${dis ? 'dis' : ''}" data-k="${act}"><span class="sw-ind" aria-hidden="true"></span>${presets}${custom}</div><p class="sw-cap">Warna dipilih: <b>${name}</b></p>`;
};
const themeName = t => `${MODES.find(m => m[0] === t.mode)[1]} · ${ACCENTS[t.accent].name}`;

function userSection() {
  const p = getPref(), ct = classTheme(), r = resolveTheme(), forced = ct.forced, useClass = forced || p.source === 'class';
  return `<div class="grid g-2">
  <div class="grid set-side">
    <div class="card"><h2>Akun</h2>
      <div class="who"><span class="avatar">${esc(initials(userName() || '?'))}</span><div><b>${esc(userName())}</b><small>${isAdmin() ? 'Admin organisasi' : 'anggota'} · ${esc(S.settings.className)}</small></div></div>
      <button class="btn" data-act="logout">${ic('logout')}Keluar</button></div>
  </div>
  <div class="card"><h2>Tampilan</h2>
    <div class="field"><label>Tema yang dipakai</label>
      ${seg('psrc', [['own', 'Tema saya', 'user'], ['class', 'Tema organisasi', 'users']], useClass ? 'class' : 'own', forced)}
      ${forced ? `<p class="hint lock">${ic('lock')}Admin mewajibkan semua anggota memakai tema organisasi.</p>` : ''}
    </div>
    ${useClass ? `<div class="theme-note"><span class="sw-mini" style="--c:${accentHex(ct)}"></span><div><b>Mengikuti tema organisasi</b><small>${themeName(ct)}${forced ? '' : ' · pilih “Tema saya” untuk mengatur sendiri'}</small></div></div>` : ''}
    <div class="field ${useClass ? 'faded' : ''}"><label>Mode</label>${seg('pmode', MODES, p.mode, useClass)}</div>
    <div class="field ${useClass ? 'faded' : ''}"><label>Warna aksen</label>${swatches('pacc', p.accent, useClass)}</div>
    <p class="hint">Pilihan tema pribadi hanya berlaku di perangkat ini. Sekarang tampil: <b>${themeName(r)}</b>.</p>
  </div></div>`;
}

function adminSection() {
  const s = S.settings, ct = classTheme();
  return `<div class="grid g-2">
  <div class="grid set-side">
  <div class="card"><h2>Sistem kas</h2><form id="setForm" novalidate>
    <div class="field"><label for="s-c">Nama organisasi</label><input class="input" id="s-c" name="className" value="${esc(s.className)}" maxlength="40" required></div>
    <div class="row2"><div class="field"><label for="s-m">Sistem iuran</label><select class="input" id="s-m" name="mode"><option value="weekly" ${s.mode === 'weekly' ? 'selected' : ''}>Mingguan</option><option value="monthly" ${s.mode === 'monthly' ? 'selected' : ''}>Bulanan</option></select></div>
    <div class="field"><label for="s-n">Nominal per periode</label>${moneyField('s-n', 'nominal', s.nominal)}</div></div>
    <div class="row2"><div class="field"><label for="s-d">Tanggal mulai kas</label><input class="input" id="s-d" name="startDate" type="date" value="${s.startDate}" required></div>
    <div class="field"><label for="s-o">Saldo awal</label>${moneyField('s-o', 'openingBalance', s.openingBalance, { signed: true, required: false })}</div></div>
    <div class="field"><label for="s-r">Ingatkan berapa hari sebelum jatuh tempo</label><input class="input" id="s-r" name="reminderDays" type="number" min="0" max="30" value="${s.reminderDays}"></div>
    <p class="hint">Jatuh tempo setiap periode adalah hari terakhir periode tersebut. Mengubah pengaturan ini menghitung ulang semua status.</p><p class="err" id="s-err"></p>
    <div class="dlg-foot start"><button class="btn primary" type="submit">Simpan pengaturan</button></div></form></div>

  <div class="card"><h2>Tujuan kas</h2><form id="tujForm" novalidate>
    <div class="field"><label for="t-n">Nama tujuan</label><input class="input" id="t-n" name="targetName" maxlength="40" value="${esc(s.targetName || '')}" placeholder="mis. Study tour"></div>
    <div class="field"><label for="t-a">Target dana</label>${moneyField('t-a', 'targetAmount', s.targetAmount || '', { required: false })}</div>
    <p class="hint">Progres tujuan tampil di beranda untuk semua anggota. Kosongkan target dana untuk menyembunyikannya.</p><p class="err" id="t-err"></p>
    <div class="dlg-foot start"><button class="btn primary" type="submit">Simpan tujuan</button></div></form></div>

  <div class="card"><h2>Tema organisasi</h2>
    <div class="field"><label>Mode</label>${seg('cmode', MODES.slice(0, 2), ct.mode)}</div>
    <div class="field"><label>Warna aksen</label>${swatches('cacc', ct.accent, false, ct.customHex || ACCENTS.custom.c)}</div>
    <div class="switch-row" data-act="cforce"><div><b>Wajibkan semua pakai tema organisasi</b><small>anggota tidak bisa memilih tema sendiri. Kalau mati, tiap anggota bebas memilih tema pribadi atau tema organisasi di bagian Pengguna.</small></div>
      <button type="button" class="switch ${ct.forced ? 'on' : ''}" role="switch" aria-checked="${ct.forced}" data-k="cforce" aria-label="Wajibkan tema organisasi"><i></i></button></div>
  </div>

  <div class="card"><h2>Data</h2><p class="hint data-hint">Data tersimpan di server dan bisa dibuka dari perangkat mana pun. Ekspor Excel membuat satu file dengan 4 sheet: Pengaturan, anggota, Pembayaran, dan Pengeluaran. Muat Excel akan menggantikan semua data yang ada.</p>
    <div class="data-actions"><button class="btn" data-act="expxlsx">Ekspor Excel</button><button class="btn" data-act="impxlsx">Muat Excel</button><button class="btn" data-act="blank">Mulai dari kosong</button><button class="btn" data-act="demo">Muat data contoh</button></div>
    <input type="file" id="xlsFile" accept=".xlsx" hidden></div>
  </div>

  <div class="grid set-side fill">
    <div class="card"><h2>Akses organisasi</h2>
      <div class="field"><label>Kode organisasi (dibagikan ke anggota)</label><div class="code-row"><b>${esc(s.classCode)}</b><button class="btn sm" data-act="copycode">${ic('copy')}Salin</button><button class="btn sm ghost" data-act="newcode">Ganti</button></div>
      <div class="qr-row"><div class="qr-thumb"><img id="setQr" alt="QR kode organisasi" width="96" height="96"></div><div class="qr-actions"><small>anggota bisa scan QR ini di halaman masuk.</small><button class="btn sm" data-act="shareqr">${ic('share')}Bagikan QR</button><button class="btn sm" data-act="dlqr">${ic('down')}Unduh QR</button></div></div></div>
      <div class="field" style="margin-bottom:0"><label>Akun admin</label><div class="code-row"><b class="acc-email">${esc((getSession() && getSession().email) || '')}</b><button class="btn sm" data-act="editpass">${ic('key')}Ubah password</button></div></div></div>
      <div class="card"><div class="card-head"><h2>Daftar anggota (${S.students.length})</h2><div class="actions">${S.students.length ? `<button class="btn sm ghost owe" data-act="delall">${ic('trash')}Hapus semua</button>` : ''}<button class="btn sm primary" data-act="addstu">${ic('plus')}Tambah</button></div></div>
      ${S.students.length ? S.students.map(st => `<div class="plist"><div class="name-cell"><span class="avatar">${esc(initials(st.name))}</span>${esc(st.name)}</div><div class="actions"><button class="btn sm ghost" data-act="editstu" data-id="${st.id}" aria-label="Edit ${esc(st.name)}">${ic('edit')}</button><button class="btn sm ghost owe" data-act="delstu" data-id="${st.id}" aria-label="Hapus ${esc(st.name)}">${ic('trash')}</button></div></div>`).join('') : '<div class="empty">Belum ada anggota.</div>'}</div>
  </div></div>`;
}

function render() {
  if (!isAdmin()) tab = 'user';
  $('#view').innerHTML = (isAdmin() ? `<div class="seg tabs" data-k="stab" role="tablist"><span class="seg-ind" aria-hidden="true"></span>${[['user', 'Pengguna', 'user'], ['admin', 'Admin', 'shield']].map(([v, l, i]) => `<button role="tab" aria-selected="${tab === v}" class="${tab === v ? 'on' : ''}" data-act="stab" data-id="${v}">${ic(i)}${l}</button>`).join('')}</div>` : '') +
    `<div class="set-pane ${paneAnim()}">${tab === 'admin' && isAdmin() ? adminSection() : userSection()}</div>`;
  placeIndicators();
  fillQr($('#setQr'), S.settings.classCode, 240);
  const f = $('#xlsFile'); if (!f) return;
  f.onchange = async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    let d;
    try { d = await fromXlsx(await file.arrayBuffer()); }
    catch { return toast('File bukan Excel kas. Pakai file hasil Ekspor Excel.'); }
    if (!await confirmBox(`Muat ${d.students.length} anggota, ${d.payments.length} pembayaran, dan ${d.expenses.length} pengeluaran dari file ini? Data saat ini akan diganti.`, 'Muat Excel')) return;
    try {
      await db.replaceAll({ students: d.students, payments: d.payments, expenses: d.expenses });
      await db.saveSettings({ ...d.settings, theme: { ...S.settings.theme, ...d.theme } });
    } catch (er) { return toast(db.errMsg(er)); }
    applyTheme(true); rerender();
    toast(`Excel dimuat: ${d.students.length} anggota, ${d.payments.length} pembayaran, ${d.expenses.length} pengeluaran` + (d.skipped ? ` · ${d.skipped} baris dilewati` : ''));
  };
}

function stuForm(id) {
  const st = id ? S.students.find(x => x.id === id) : null;
  const nameField = st
    ? `<div class="field"><label for="st-n">Nama anggota</label><input class="input" id="st-n" name="name" maxlength="60" value="${esc(st.name)}" required></div>`
    : `<div class="field"><label for="st-n">Nama anggota</label><textarea class="input bulk-names" id="st-n" name="name" rows="7" placeholder="Satu nama per baris&#10;Rina&#10;Dimas&#10;Sari" required></textarea><small class="hint">Satu nama per baris. Bisa tempel banyak nama sekaligus dari daftar absen.</small></div>`;
  openDlg(st ? 'Edit anggota' : 'Tambah anggota', `<form id="stuForm" data-id="${st ? st.id : ''}" novalidate>
    ${nameField}<p class="err" id="st-err"></p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">Simpan</button></div></form>`);
}
export function passForm() {
  openDlg('Ubah password admin', `<form id="passForm" novalidate autocomplete="off">
    <div class="field"><label for="pn-n">Password baru (min. 6 karakter)</label><input class="input" id="pn-n" name="pass" type="password" maxlength="72" autocomplete="new-password" required></div>
    <div class="field"><label for="pn-c">Ulangi password baru</label><input class="input" id="pn-c" name="pass2" type="password" maxlength="72" autocomplete="new-password" required></div><p class="err" id="pn-err"></p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">Simpan password</button></div></form>`);
}
const setTheme = async patch => {
  const p = db.saveSettings({ theme: { ...classTheme(), ...patch } }, { optimistic: true });
  applyTheme(true); rerender();
  try { await p; } catch (e) { applyTheme(true); rerender(); toast(db.errMsg(e)); }
};
const adminOnly = fn => (...a) => { if (isAdmin()) return fn(...a); };

const livePreview = hex => { const s = document.documentElement.style; s.setProperty('--brand', hex); s.setProperty('--brand-2', hex); };
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('input[data-cc]')) livePreview(e.target.value); });
document.addEventListener('change', e => {
  const el = e.target; if (!el.matches || !el.matches('input[data-cc]')) return;
  if (el.dataset.cc === 'cacc') { if (isAdmin()) setTheme({ accent: 'custom', customHex: el.value }); }
  else { setCustomAccent(el.value); rerender(); }
});

registerActions({
  stab(id) { tab = id; rerender(); },
  psrc: id => { if (!classTheme().forced) { setPref({ source: id }); rerender(); } },
  pmode: id => { setPref({ mode: id }); rerender(); },
  pacc: id => { setPref({ accent: id }); rerender(); },
  cmode: adminOnly(id => setTheme({ mode: id })),
  cacc: adminOnly(id => setTheme({ accent: id })),
  cforce: adminOnly(() => {
    const before = JSON.stringify(resolveTheme()), on = !classTheme().forced;
    db.saveSettings({ theme: { ...classTheme(), forced: on } }, { optimistic: true }).catch(e => { toast(db.errMsg(e)); applyTheme(true); rerender(); });
    applyTheme(before !== JSON.stringify(resolveTheme()));
    const b = document.querySelector('#view .switch[data-k="cforce"]');
    if (!b) return rerender();
    sw.cforce = on; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
  }),
  async copycode() { try { await navigator.clipboard.writeText(S.settings.classCode); } catch { } toast('Kode organisasi disalin'); },
  async shareqr() {
    if (!isAdmin()) return;
    try { if (await shareQr(S.settings.classCode, S.settings.className) === 'downloaded') toast('Perangkat ini tak punya menu bagikan, QR diunduh'); }
    catch { toast('Gagal membagikan QR'); }
  },
  async dlqr() {
    if (!isAdmin()) return;
    try { await downloadQr(S.settings.classCode, S.settings.className); toast('QR organisasi diunduh'); } catch { toast('Gagal membuat QR'); }
  },
  async newcode() {
    if (!isAdmin()) return;
    if (await confirmBox('Kode lama tidak berlaku lagi. anggota harus memakai kode baru untuk masuk.', 'Ganti kode')) {
      try { await db.regenerateCode(); rerender(); toast('Kode organisasi diganti'); } catch (e) { toast(db.errMsg(e)); }
    }
  },
  editpass: adminOnly(passForm),
  addstu: adminOnly(() => stuForm()),
  editstu: adminOnly(id => stuForm(id)),
  delstu: adminOnly(async id => {
    const st = S.students.find(v => v.id === id); if (!st) return;
    const n = S.payments.filter(p => p.studentId === id).length;
    if (await confirmBox(`Hapus ${esc(st.name)}${n ? ` beserta ${n} catatan pembayarannya (pemasukan ikut berkurang)` : ''}?`)) {
      try { await db.deleteStudent(id); rerender(); toast('anggota dihapus'); } catch (e) { toast(db.errMsg(e)); }
    }
  }),
    delall: adminOnly(async () => {
    const total = S.students.length; if (!total) return;
    const n = S.payments.length;
    if (!await confirmBox(`Hapus semua ${total} anggota${n ? ` beserta ${n} catatan pembayarannya (pemasukan ikut berkurang)` : ''}? Pengeluaran tidak ikut terhapus.`, 'Hapus semua')) return;
    let ok = 0;
    try {
      for (const st of S.students.slice()) { await db.deleteStudent(st.id); ok++; }
    } catch (e) { rerender(); return toast(`${ok} anggota terhapus, lalu gagal. ${db.errMsg(e)}`); }
    rerender(); toast(`${ok} anggota dihapus`);
  }),
  expxlsx: adminOnly(() => {
    const url = URL.createObjectURL(new Blob([toXlsx(S, compute().rows)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const l = document.createElement('a'); l.href = url; l.download = `kas-organisasi-${iso(todayD())}.xlsx`; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }),
  impxlsx: adminOnly(() => $('#xlsFile').click()),
  blank: adminOnly(async () => {
    if (await confirmBox('Semua data anggota, pembayaran, dan pengeluaran akan dihapus. Lanjutkan?', 'Hapus semua')) {
      try { await db.replaceAll({ students: [], payments: [], expenses: [] }); rerender(); toast('Data dikosongkan'); } catch (e) { toast(db.errMsg(e)); }
    }
  }),
  demo: adminOnly(async () => {
    if (await confirmBox('Data saat ini akan diganti dengan data contoh. Lanjutkan?', 'Ganti data')) {
      const d = seed();
      try { await db.replaceAll(d); await db.saveSettings(d.settings); applyTheme(true); rerender(); toast('Data contoh dimuat'); } catch (e) { toast(db.errMsg(e)); }
    }
  }),
});

registerForms({
  async stuForm({ f, v, btn, fail }) {
    const id = f.dataset.id;
    if (id) {
      const name = v.name.trim();
      if (!name) return fail('st-err', 'Nama anggota wajib diisi.');
      if (S.students.some(s => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) return fail('st-err', 'Nama anggota sudah ada.');
      btn.disabled = true;
      try { await db.renameStudent(id, name); closeDlg(); rerender(); toast('anggota diperbarui'); }
      catch (e) { btn.disabled = false; fail('st-err', db.errMsg(e)); }
      return;
    }
    const seen = new Set(S.students.map(s => s.name.toLowerCase()));
    const names = [];
    let dup = 0;
    for (const raw of String(v.name).split(/\r?\n/)) {
      const n = raw.trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!n) continue;
      if (seen.has(n.toLowerCase())) { dup++; continue; }
      seen.add(n.toLowerCase()); names.push(n);
    }
    if (!names.length) return fail('st-err', dup ? 'Semua nama sudah ada di daftar.' : 'Isi minimal satu nama.');
    btn.disabled = true;
    let ok = 0;
    try {
      for (const n of names) { await db.addStudent(n); ok++; }
    } catch (e) {
      btn.disabled = false;
      if (ok) rerender();
      return fail('st-err', `${ok} nama berhasil ditambahkan, lalu gagal di "${names[ok]}". ${db.errMsg(e)}`);
    }
    closeDlg(); rerender();
    toast(`${ok} anggota ditambahkan` + (dup ? ` · ${dup} nama dilewati (sudah ada)` : ''));
  },
  async passForm({ v, btn, fail }) {
    if (String(v.pass).length < 6) return fail('pn-err', 'Password minimal 6 karakter.');
    if (v.pass !== v.pass2) return fail('pn-err', 'Konfirmasi password tidak sama.');
    btn.disabled = true;
    try { await db.changePassword(v.pass); closeDlg(); toast('Password diubah'); }
    catch (e) { btn.disabled = false; fail('pn-err', db.errMsg(e)); }
  },
  async tujForm({ v, btn, fail }) {
    if (!isAdmin()) return;
    const name = v.targetName.trim(), amount = parseMoney(v.targetAmount);
    if (amount > 0 && !name) return fail('t-err', 'Isi nama tujuan kalau target dana diisi.');
    btn.disabled = true;
    try { await db.saveSettings({ targetName: name, targetAmount: amount }); rerender(); toast(amount > 0 ? 'Tujuan kas disimpan' : 'Tujuan kas dikosongkan'); }
    catch (e) { btn.disabled = false; fail('t-err', db.errMsg(e)); }
  },
  async setForm({ v, btn, fail }) {
    if (!isAdmin()) return;
    const nominal = parseMoney(v.nominal);
    if (!v.className.trim()) return fail('s-err', 'Nama organisasi wajib diisi.');
    if (!(nominal > 0)) return fail('s-err', 'Nominal iuran harus lebih dari 0.');
    if (!v.startDate) return fail('s-err', 'Tanggal mulai wajib diisi.');
    btn.disabled = true;
    try {
      await db.saveSettings({ className: v.className.trim(), mode: v.mode, nominal, startDate: v.startDate, openingBalance: parseMoney(v.openingBalance), reminderDays: Math.max(0, Math.round(+v.reminderDays) || 0) });
      rerender(); toast('Pengaturan disimpan');
    } catch (e) { btn.disabled = false; fail('s-err', db.errMsg(e)); }
  },
});

export default { id: 'settings', title: 'Pengaturan', nav: 'Pengaturan', tab: 'Pengaturan', icon: 'gear', render };