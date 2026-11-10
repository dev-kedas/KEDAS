import '../styles/pages/expenses.css';
import { $, ic, esc, rp, fmt, iso, todayD, uid, moneyField, parseMoney, CATS } from '../core/utils.js';
import { isAdmin } from '../core/session.js';
import { S } from '../core/store.js';
import * as db from '../core/db.js';
import { openDlg, closeDlg, toast, confirmBox, registerActions, registerForms, runAction } from '../core/ui.js';
import { render as rerender, takePreset } from '../core/router.js';

const F = { from: '', to: '', cat: 'all' };
let photo = '', photoOp = null, formToken = 0;

function shrink(file, max = 1024, q = 0.7) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bukan gambar')); };
    img.src = url;
  });
}
// Kamera selalu ditawarkan. HP/tablet: kamera bawaan lewat <input capture>. Komputer: webcam lewat
// getUserMedia, pratinjaunya tampil langsung di dalam form (isi form lain tidak hilang).
const touch = () => matchMedia('(pointer: coarse)').matches;
let stream = null;
function stopCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; }
$('#dlg').addEventListener('close', stopCam);

const proofHtml = () => {
  const t = touch();
  const cam = `<button type="button" class="proof-opt" data-act="pickcamera">${ic('camera')}<span><b>Kamera</b><small>Foto langsung</small></span></button>`;
  const gal = `<button type="button" class="proof-opt" data-act="pickgallery">${ic('image')}<span><b>${t ? 'Galeri' : 'Pilih file'}</b><small>${t ? 'Pilih dari HP' : 'Dari perangkat ini'}</small></span></button>`;
  return photo
    ? `<div class="proof-prev"><img src="${photo}" alt="Pratinjau foto bukti"><div class="proof-btns"><div class="proof-row"><button type="button" class="btn sm" data-act="pickcamera">${ic('camera')}Kamera</button><button type="button" class="btn sm" data-act="pickgallery">${ic('image')}${t ? 'Galeri' : 'Pilih file'}</button></div><button type="button" class="btn sm ghost owe" data-act="rmphoto">${ic('trash')}Hapus</button></div></div>`
    : `<div class="proof-opts">${cam}${gal}</div><small class="hint proof-hint">Foto nota/struk, otomatis dikecilkan.</small>`;
};
async function openWebcam() {
  const box = $('#proofBox'); if (!box) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Browser ini belum bisa membuka kamera. Pakai tombol Pilih file.');
  stopCam();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  } catch (e) {
    return toast(e && e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Izinkan kamera di pengaturan situs browser.'
      : e && e.name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini.' : 'Kamera tidak bisa dibuka (dipakai aplikasi lain?).');
  }
  if (!$('#proofBox')) return stopCam();   // dialog sudah ditutup selagi menunggu izin
  $('#proofBox').innerHTML = `<div class="cam"><video id="camV" autoplay playsinline muted></video><div class="cam-bar"><button type="button" class="btn" data-act="camstop">Batal</button><button type="button" class="btn primary" data-act="camshot">${ic('camera')}Ambil foto</button></div></div>`;
  $('#camV').srcObject = stream;
}
function snap() {
  const v = $('#camV'); if (!v || !v.videoWidth) return toast('Kamera belum siap, tunggu sebentar.');
  const k = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
  c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  photo = c.toDataURL('image/jpeg', 0.7); photoOp = { data: photo };
  stopCam(); $('#proofBox').innerHTML = proofHtml();
}

function render() {
  const p = takePreset(); if (p) Object.assign(F, p);
  $('#view').innerHTML = `
  <div class="toolbar exp-toolbar">
    <div class="exp-filters">
      <div class="date-range">
        <input class="input" id="ef" type="date" value="${F.from}" aria-label="Dari tanggal">
        <span class="dr-sep" aria-hidden="true">–</span>
        <input class="input" id="et" type="date" value="${F.to}" aria-label="Sampai tanggal">
      </div>
      <select class="input" id="ec" aria-label="Kategori"><option value="all">Semua kategori</option>${CATS.map(k => `<option ${F.cat === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
    </div>
    ${isAdmin() ? `<button class="btn primary exp-add" data-act="addexp">${ic('plus')}Tambah pengeluaran</button>` : ''}
  </div>
  <div class="card"><div id="expTable"></div></div>`;
  ['ef', 'et', 'ec'].forEach(id => $('#' + id).onchange = () => { F.from = $('#ef').value; F.to = $('#et').value; F.cat = $('#ec').value; table(); });
  table();
}

function table() {
  const el = $('#expTable'); if (!el) return;
  const list = S.expenses.filter(e => (!F.from || e.date >= F.from) && (!F.to || e.date <= F.to) && (F.cat === 'all' || e.category === F.cat))
    .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  const total = list.reduce((a, e) => a + e.amount, 0);
  el.innerHTML = `<div class="sum-chips"><span class="chip">${list.length} transaksi</span><span class="chip">Total tampil: ${rp(total)}</span></div>` + (list.length ?
    `<div class="table-wrap"><table class="resp"><thead><tr><th>Pengeluaran</th><th>Tanggal</th><th>Kategori</th><th class="num">Nominal</th><th></th></tr></thead><tbody>` +
    list.map(e => `<tr><td class="first"><b>${esc(e.name)}</b>${e.hasPhoto ? `<span class="has-photo" title="Ada foto bukti">${ic('image')}</span>` : ''}${e.note ? `<br><small class="muted">${esc(e.note)}</small>` : ''}</td><td data-label="Tanggal">${fmt(e.date)}</td><td data-label="Kategori">${esc(e.category)}</td><td class="num" data-label="Nominal"><b class="owe">${rp(e.amount)}</b></td>
      <td><div class="actions"><button class="btn sm ghost" data-act="viewexp" data-id="${e.id}" aria-label="Lihat">${ic('eye')}</button>${isAdmin() ? `<button class="btn sm ghost" data-act="editexp" data-id="${e.id}" aria-label="Edit">${ic('edit')}</button><button class="btn sm ghost owe" data-act="delexp" data-id="${e.id}" aria-label="Hapus">${ic('trash')}</button>` : ''}</div></td></tr>`).join('') + '</tbody></table></div>'
    : `<div class="empty">${S.expenses.length ? 'Tidak ada pengeluaran pada filter ini.' : 'Belum ada pengeluaran. Catat pengeluaran pertama organisasi.'}</div>`);
}

function expForm(id) {
  const e = id ? S.expenses.find(x => x.id === id) : null;
  stopCam(); photo = ''; photoOp = null; const ft = ++formToken;
  openDlg(e ? 'Edit pengeluaran' : 'Tambah pengeluaran', `<form id="expForm" data-id="${e ? e.id : ''}" novalidate>
    <div class="field"><label for="x-n">Nama pengeluaran</label><input class="input" id="x-n" name="name" maxlength="80" value="${e ? esc(e.name) : ''}" required></div>
    <div class="row2"><div class="field"><label for="x-a">Nominal</label>${moneyField('x-a', 'amount', e ? e.amount : '')}</div>
    <div class="field"><label for="x-d">Tanggal</label><input class="input" id="x-d" name="date" type="date" value="${e ? e.date : iso(todayD())}" required></div></div>
    <div class="field"><label for="x-c">Kategori</label><select class="input" id="x-c" name="category">${CATS.map(k => `<option ${e && e.category === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="field"><label for="x-k">Keterangan</label><textarea class="input" id="x-k" name="note" rows="2" maxlength="200">${e ? esc(e.note) : ''}</textarea></div>
    <div class="field"><label>Foto bukti (opsional)</label><div id="proofBox">${proofHtml()}</div><input type="file" id="x-f" accept="image/*" hidden><input type="file" id="x-c" accept="image/*" capture="environment" hidden></div>
    <p class="err" id="x-err"></p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">Simpan</button></div></form>`);
  const onPick = async ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    try { photo = await shrink(f); photoOp = { data: photo }; $('#proofBox').innerHTML = proofHtml(); } catch { toast('File itu bukan gambar yang valid'); }
  };
  $('#x-f').onchange = onPick; $('#x-c').onchange = onPick;
  if (e && e.hasPhoto) db.getPhoto(e.id).then(p => { if (ft === formToken && !photoOp && p) { photo = p; const b = $('#proofBox'); if (b) b.innerHTML = proofHtml(); } }).catch(() => { });
}

registerActions({
  pickgallery: () => $('#x-f') && $('#x-f').click(),
  pickcamera() { if (touch()) { const c = $('#x-c'); if (c) c.click(); } else openWebcam(); },
  camshot: () => snap(),
  camstop() { stopCam(); const b = $('#proofBox'); if (b) b.innerHTML = proofHtml(); },
  rmphoto() { stopCam(); photo = ''; photoOp = { remove: true }; $('#proofBox').innerHTML = proofHtml(); },
  async zoomproof(id) {
    const x = S.expenses.find(v => v.id === id); if (!x || !x.hasPhoto) return;
    let src = ''; try { src = await db.getPhoto(id); } catch (er) { return toast(db.errMsg(er)); }
    if (!src) return;
    openDlg('Foto bukti', `<img class="proof-full" src="${src}" alt="Foto bukti ${esc(x.name)}"><div class="dlg-foot"><button class="btn" data-close>Kembali</button></div>`, () => runAction('viewexp', id));
  },
  addexp: () => { if (isAdmin()) expForm(); },
  editexp: id => { if (isAdmin()) expForm(id); },
  viewexp(id) {
    const x = S.expenses.find(v => v.id === id); if (!x) return;
    openDlg(x.name, `<div class="kv"><div><small>Nominal</small><b>${rp(x.amount)}</b></div><div><small>Tanggal</small><b>${fmt(x.date)}</b></div><div><small>Kategori</small><b>${esc(x.category)}</b></div></div><p>${x.note ? esc(x.note) : '<span class="muted">Tanpa keterangan.</span>'}</p>${x.hasPhoto ? '<div id="proofSlot" class="muted">Memuat foto bukti…</div>' : ''}<div class="dlg-foot"><button class="btn" data-close>Tutup</button>${isAdmin() ? `<button class="btn primary" data-act="editexp" data-id="${x.id}">${ic('edit')}Edit</button>` : ''}</div>`);
    if (x.hasPhoto) db.getPhoto(x.id).then(src => {
      const slot = $('#proofSlot'); if (!slot) return;
      slot.outerHTML = src ? `<img class="proof-img" src="${src}" alt="Foto bukti ${esc(x.name)}" data-act="zoomproof" data-id="${x.id}">` : '';
    }).catch(() => { const slot = $('#proofSlot'); if (slot) slot.textContent = 'Foto bukti tidak bisa dimuat.'; });
  },
  async delexp(id) {
    const x = S.expenses.find(v => v.id === id); if (!x || !isAdmin()) return;
    if (await confirmBox(`Hapus pengeluaran “${esc(x.name)}” sebesar ${rp(x.amount)}? Saldo akan dihitung ulang.`)) {
      try { await db.deleteExpense(id); rerender(); toast('Pengeluaran dihapus'); } catch (er) { toast(db.errMsg(er)); }
    }
  },
});

registerForms({
  async expForm({ f, v, btn, fail }) {
    const amount = parseMoney(v.amount);
    if (!v.name.trim()) return fail('x-err', 'Nama pengeluaran wajib diisi.');
    if (!(amount > 0)) return fail('x-err', 'Nominal harus lebih dari 0.');
    if (!v.date) return fail('x-err', 'Tanggal wajib diisi.');
    btn.disabled = true;
    const data = { name: v.name.trim(), amount, date: v.date, category: v.category, note: v.note.trim() }, id = f.dataset.id;
    try {
      if (id) await db.updateExpense(id, data, photoOp); else await db.addExpense(data, photoOp);
      closeDlg(); rerender(); toast(id ? 'Pengeluaran diperbarui' : 'Pengeluaran ditambahkan');
    } catch (er) { btn.disabled = false; fail('x-err', db.errMsg(er)); }
  },
});

export default { id: 'expenses', title: 'Pengeluaran Kas', nav: 'Pengeluaran', tab: 'Pengeluaran', icon: 'receipt', render };
