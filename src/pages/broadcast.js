// Admin: bagikan link tiap bagian kas + kirim notifikasi. Semua: kartu notifikasi HP (aktif/matikan).
import '../styles/pages/broadcast.css';
import { $, ic, esc, rp } from '../core/utils.js';
import { S } from '../core/store.js';
import { compute } from '../core/calc.js';
import { isAdmin } from '../core/session.js';
import { openDlg, closeDlg, toast, registerActions, registerForms } from '../core/ui.js';
import { SECTIONS, shareUrl } from '../core/share.js';
import { render as rerender } from '../core/router.js';
import * as db from '../core/db.js';
import * as push from '../core/push.js';

/* ---------- Bagikan link ---------- */

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { }
  try {
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0';
    document.body.append(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
  } catch { return false; }
}

function shareDlg() {
  openDlg('Bagikan link kas', `<p class="hint share-hint">Penerima harus masuk sebagai siswa organisasi ini dulu, lalu langsung dibawa ke dashboard. Pratinjau link tidak menampilkan angka kas.</p>
    <div class="share-list">${SECTIONS.map(s => `<div class="share-row"><span class="ico ${s.tone}">${ic(s.icon)}</span><div class="share-t"><b>${s.title}</b><small>${s.desc}</small></div>
      <div class="share-btns"><button class="btn sm" data-act="copysec" data-id="${s.id}" aria-label="Salin link ${s.title}" title="Salin link">${ic('copy')}</button><button class="btn sm primary" data-act="sharesec" data-id="${s.id}" aria-label="Bagikan ${s.title}" title="Bagikan">${ic('share')}</button></div></div>`).join('')}</div>`);
}

async function shareSec(id) {
  const sec = SECTIONS.find(s => s.id === id); if (!sec || !S.settings.classCode) return;
  const url = shareUrl(id, S.settings.classCode), name = S.settings.className || 'organisasi';
  const data = { title: `${sec.title} · ${name}`, text: `${sec.title} ${name}. Masuk sebagai siswa untuk membuka:`, url };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  toast(await copyText(url) ? 'Link disalin' : 'Gagal menyalin link');
}

/* ---------- Kirim notifikasi ---------- */

function template(id) {
  const s = S.settings, per = s.mode === 'monthly' ? 'bulan ini' : 'minggu ini';
  return {
    iuran: { t: 'Pengingat iuran kas', b: `Jangan lupa bayar iuran kas ${per} (${rp(s.nominal)}) ya. Cek status pembayaranmu di KEDAS.` },
    saldo: { t: 'Update saldo kas', b: `Saldo kas ${s.className || ''} sekarang ${rp(compute().balance)}. Buka KEDAS untuk lihat rinciannya.`.replace('  ', ' ') },
    info: { t: 'Pengumuman', b: '' },
  }[id];
}

function notifDlg() {
  const nAll = S.students.length;
  if (!nAll) return toast('Tambahkan siswa dulu di Pengaturan › Admin.');
  const nTunggak = compute().rows.filter(r => r.status === 'tunggak').length;
  openDlg('Kirim notifikasi', `<form id="notifForm" novalidate autocomplete="off">
    <div class="field"><label>Template cepat</label><div class="chips">
      <button type="button" class="chip" data-act="ntpl" data-id="iuran">Pengingat iuran</button>
      <button type="button" class="chip" data-act="ntpl" data-id="saldo">Info saldo</button>
      <button type="button" class="chip" data-act="ntpl" data-id="info">Pengumuman</button></div></div>
    <div class="field"><label for="n-t">Judul</label><input class="input" id="n-t" name="title" maxlength="60" placeholder="mis. Pengingat iuran kas" required></div>
    <div class="field"><label for="n-b">Pesan</label><textarea class="input" id="n-b" name="body" maxlength="200" placeholder="Isi pesan singkat"></textarea></div>
    <div class="field"><label for="n-a">Dikirim ke</label><select class="input" id="n-a" name="aud"><option value="all">Semua siswa (${nAll})</option><option value="tunggak" ${nTunggak ? '' : 'disabled'}>Hanya yang menunggak (${nTunggak})</option></select></div>
    <p class="hint" id="n-reach">Mengecek siapa saja yang sudah mengaktifkan notifikasi…</p><p class="err" id="n-err"></p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">${ic('bell')}<span class="lbl">Kirim sekarang</span></button></div></form>`);
  db.pushReach().then(set => {
    const el = $('#n-reach'); if (!el) return;
    const n = S.students.filter(s => set.has(s.id)).length;
    el.innerHTML = `<b>${n} dari ${nAll}</b> siswa sudah mengaktifkan notifikasi HP. Yang belum tetap melihat pesan ini di lonceng aplikasi.`;
  }).catch(() => { const el = $('#n-reach'); if (el) el.textContent = 'Pesan masuk ke lonceng aplikasi, dan ke HP siswa yang sudah mengaktifkan notifikasi.'; });
}

/* ---------- Kartu notifikasi HP (Pengaturan) ---------- */

export function pushCard() {
  const st = push.pushState();
  const body = {
    on: `<div class="push-state on">${ic('check')}<span>Aktif di perangkat ini</span></div>
      <div class="push-actions"><button class="btn sm" data-act="pushtest">Kirim tes</button><button class="btn sm ghost" data-act="pushoff">Matikan</button></div>`,
    off: `<p class="hint">Dapatkan info kas langsung di bar notifikasi HP, walau aplikasi atau browser sedang ditutup.</p>
      <div class="push-actions"><button class="btn primary" data-act="pushon">${ic('bell')}Aktifkan notifikasi</button></div>`,
    denied: `<p class="hint lock">${ic('lock')}Notifikasi diblokir untuk situs ini. Buka pengaturan situs di browser (ikon gembok di address bar), izinkan Notifikasi, lalu muat ulang halaman.</p>`,
    unsupported: '<p class="hint">Browser ini belum mendukung notifikasi HP. Coba Chrome, Edge, Firefox, atau Safari versi terbaru.</p>',
    'ios-install': '<p class="hint">Di iPhone/iPad, notifikasi hanya bisa aktif kalau KEDAS dipasang dulu: tekan <b>Bagikan</b> › <b>Tambah ke Layar Utama</b>, buka KEDAS dari ikon barunya, lalu aktifkan di sini.</p>',
  }[st];
  return `<div class="card"><h2>Notifikasi HP</h2>${body}</div>`;
}

registerActions({
  sharedlg() { if (isAdmin()) shareDlg(); },
  copysec: async id => { if (!isAdmin()) return; const u = shareUrl(id, S.settings.classCode); toast(await copyText(u) ? 'Link disalin' : 'Gagal menyalin link'); },
  sharesec: id => { if (isAdmin()) shareSec(id); },
  notifdlg() { if (isAdmin()) notifDlg(); },
  ntpl(id) {
    const t = template(id); if (!t) return;
    $('#n-t').value = t.t; $('#n-b').value = t.b; $('#n-b').focus();
  },
  async pushon(_, el) {
    el.disabled = true;
    try { await push.enablePush(); toast('Notifikasi HP aktif'); } catch (e) { toast(db.errMsg(e)); }
    rerender();
  },
  async pushoff() { await push.disablePush(); toast('Notifikasi HP dimatikan'); rerender(); },
  async pushtest() { try { await push.testPush(); } catch { toast('Gagal menampilkan notifikasi tes'); } },
  pushlater() { push.hideBanner(); rerender(); },
});

registerForms({
  async notifForm({ v, btn, fail }) {
    if (!isAdmin()) return;
    const title = v.title.trim(), body = (v.body || '').trim();
    if (!title) return fail('n-err', 'Judul wajib diisi.');
    const ids = v.aud === 'tunggak' ? compute().rows.filter(r => r.status === 'tunggak').map(r => r.st.id) : null;
    if (ids && !ids.length) return fail('n-err', 'Tidak ada siswa yang menunggak.');
    const lbl = btn.querySelector('.lbl'); btn.disabled = true; lbl.textContent = 'Mengirim…'; fail('n-err', '');
    try {
      const r = await db.sendBroadcast({ title, body, studentIds: ids });
      closeDlg(); rerender();
      if (!r.devices) toast('Tersimpan di lonceng siswa. Belum ada yang mengaktifkan notifikasi HP.');
      else toast(`Terkirim ke ${r.sent} HP (${r.reached} siswa)` + (r.failed ? ` · ${r.failed} gagal` : '') + (r.recipients > r.reached ? ` · ${r.recipients - r.reached} siswa belum aktifkan` : ''));
    } catch (e) { btn.disabled = false; lbl.textContent = 'Kirim sekarang'; fail('n-err', db.errMsg(e)); }
  },
});
