// Pasang KEDAS sebagai aplikasi di HP (PWA). Chrome/Edge/Samsung Internet menyediakan tombol pasang
// sekali ketuk lewat 'beforeinstallprompt'; iPhone/iPad dan browser lain perlu langkah manual.
import { $, ic } from './utils.js';
import { openDlg, toast, registerActions } from './ui.js';

const KEY = 'kedas.installlater';
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; refresh(); });
window.addEventListener('appinstalled', () => { deferred = null; ls.set(KEY, '1'); refresh(); toast('KEDAS terpasang'); });

// 'installed' | 'prompt' | 'ios' | 'manual'
export function installState() {
  if (standalone()) return 'installed';
  if (deferred) return 'prompt';
  return isIOS() ? 'ios' : 'manual';
}

function refresh() {
  const box = $('#installBox'); if (box) box.outerHTML = installCard();
  const ban = $('#installBanner'); if (ban && installState() === 'installed') ban.remove();
}

export function installCard() {
  const st = installState();
  const body = {
    installed: `<div class="push-state on">${ic('check')}<span>Terpasang di perangkat ini</span></div><p class="hint">Kamu sedang membuka KEDAS sebagai aplikasi.</p>`,
    prompt: `<p class="hint">Pasang KEDAS di layar utama HP: tampil layar penuh seperti aplikasi biasa dan lebih cepat dibuka.</p>
      <div class="push-actions"><button class="btn primary" data-act="installapp">${ic('down')}Pasang aplikasi</button></div>`,
    ios: `<p class="hint">Di iPhone/iPad, KEDAS dipasang lewat menu Bagikan di Safari. Setelah terpasang, buka dari ikonnya di layar utama.</p>
      <div class="push-actions"><button class="btn primary" data-act="installapp">${ic('down')}Lihat caranya</button></div>`,
    manual: `<p class="hint">Pasang KEDAS di layar utama HP supaya tampil layar penuh seperti aplikasi biasa.</p>
      <div class="push-actions"><button class="btn primary" data-act="installapp">${ic('down')}Lihat caranya</button></div>`,
  }[st];
  return `<div class="card" id="installBox"><h2>Pasang sebagai aplikasi</h2>${body}</div>`;
}

// Banner di dashboard: hanya kalau belum terpasang dan belum ditutup. suppressIos: banner notifikasi iOS ikut diganti.
export function installBanner() {
  const st = installState();
  if (st === 'installed' || st === 'manual' || ls.get(KEY) === '1') return '';
  return `<div class="card push-banner" id="installBanner"><span class="ico in">${ic('down')}</span><div><b>Pasang KEDAS di HP</b><small>${st === 'ios' ? 'Tambahkan ke Layar Utama supaya terbuka seperti aplikasi.' : 'Buka layar penuh seperti aplikasi, langsung dari layar utama.'}</small></div><button class="btn sm primary" data-act="installapp">${st === 'ios' ? 'Caranya' : 'Pasang'}</button><button class="icon-btn" data-act="installlater" aria-label="Nanti saja">${ic('x')}</button></div>`;
}

function steps(title, list, note = '') {
  openDlg(title, `<ol class="install-steps">${list.map(s => `<li>${s}</li>`).join('')}</ol>${note ? `<p class="hint">${note}</p>` : ''}<div class="dlg-foot"><button class="btn primary" data-close>Mengerti</button></div>`);
}

registerActions({
  async installapp() {
    const st = installState();
    if (st === 'installed') return toast('KEDAS sudah terpasang');
    if (st === 'prompt' && deferred) {
      const ev = deferred; deferred = null;
      try { await ev.prompt(); await ev.userChoice; } catch { }
      refresh(); return;
    }
    if (st === 'ios') return steps('Pasang di iPhone / iPad', [
      'Buka KEDAS di <b>Safari</b>.',
      'Tekan tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bawah layar.',
      'Gulir, lalu pilih <b>Tambah ke Layar Utama</b>.',
      'Tekan <b>Tambah</b>. KEDAS muncul di layar utama.',
    ], 'Notifikasi HP di iPhone juga hanya bisa aktif kalau KEDAS dibuka dari ikon di layar utama.');
    steps('Pasang di HP / komputer', [
      'Buka menu browser (ikon <b>⋮</b> di pojok kanan atas).',
      'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.',
      'Konfirmasi dengan menekan <b>Instal</b> / <b>Tambah</b>.',
    ], 'Di Chrome komputer, bisa juga lewat ikon instal di sisi kanan address bar. Kalau menunya tidak ada, coba Chrome atau Edge versi terbaru.');
  },
  installlater() { ls.set(KEY, '1'); const b = $('#installBanner'); if (b) b.remove(); },
});
