import '../styles/pages/dashboard.css';
import { $, ic, esc, rp, fmt, initials, STATUS_LABEL } from '../core/utils.js';
import { transactions, compute } from '../core/calc.js';
import { S } from '../core/store.js';
import { isAdmin, me, userName } from '../core/session.js';
import { navigate } from '../core/router.js';
import { registerActions } from '../core/ui.js';
import { pushState, bannerHidden } from '../core/push.js';

const money = n => `<span class="cur">${n < 0 ? '−' : ''}Rp</span>${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n || 0))}`;

function txRow(t) {
  const isIn = t.type === 'in';
  const act = isIn ? 'detail' : 'viewexp';
  const id = isIn ? (t.sid || '') : (t.id || '');
  return `<button class="tx" data-act="${act}" data-id="${esc(id)}"><span class="ico ${isIn ? 'in' : 'out'}">${ic(isIn ? 'down' : 'up')}</span><div class="t"><b>${esc(t.title)}</b><small>${esc(t.sub)} · ${fmt(t.date)}</small></div><span class="amt ${t.type}">${isIn ? '+' : '−'}${rp(t.amount)}</span><span class="tx-go">${ic('arrow')}</span></button>`;
}

function stat(tone, icon, label, value, to, st, sec) {
  return `<button class="card stat stat-link ${tone}" data-sec="${sec}" data-act="go" data-id="${to}" data-st="${st}" data-tone="${tone}" aria-label="${label}: lihat detail"><span class="ico ${tone}">${ic(icon)}</span><div><small>${label}</small><b>${rp(value)}</b></div><span class="go">${ic('arrow')}</span></button>`;
}

function goal(saldo) {
  const target = +S.settings.targetAmount || 0;
  if (target <= 0) return '';
  const got = Math.max(0, saldo), pct = Math.min(100, Math.round(got / target * 100));
  return `<section class="card goal"><div class="goal-head"><small>${ic('receipt')}Tujuan kas</small><b>${esc(S.settings.targetName || 'Tanpa nama')}</b></div>
    <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progres ${esc(S.settings.targetName || 'tujuan kas')}"><i style="width:${pct}%"></i></div>
    <div class="goal-meta"><span>${rp(got)} terkumpul</span><span>${pct}% dari ${rp(target)}</span></div></section>`;
}

function adminBar() {
  return isAdmin() ? `<div class="admin-bar"><button class="btn" data-act="sharedlg">${ic('share')}Bagikan link</button><button class="btn primary" data-act="notifdlg">${ic('bell')}Kirim notifikasi</button></div>` : '';
}
function pushBanner() {
  if (isAdmin() || bannerHidden()) return '';
  const st = pushState();
  if (st === 'off') return `<div class="card push-banner"><span class="ico in">${ic('bell')}</span><div><b>Aktifkan notifikasi HP</b><small>Dapat info kas langsung di HP, walau aplikasi sedang ditutup.</small></div><button class="btn sm primary" data-act="pushon">Aktifkan</button><button class="icon-btn" data-act="pushlater" aria-label="Nanti saja">${ic('x')}</button></div>`;
  if (st === 'ios-install') return `<div class="card push-banner"><span class="ico in">${ic('bell')}</span><div><b>Notifikasi di iPhone</b><small>Tekan Bagikan › Tambah ke Layar Utama, buka KEDAS dari ikonnya, lalu aktifkan di Pengaturan.</small></div><button class="icon-btn" data-act="pushlater" aria-label="Tutup">${ic('x')}</button></div>`;
  return '';
}

function render(c) {
  const tx = transactions().slice(0, 10), mine = me() && c.rows.find(r => r.st.id === me().id);
  $('#view').innerHTML = `
  <div class="greet"><span class="avatar">${esc(initials(userName() || '?'))}</span><div><small>Halo,</small><b>${esc(userName())}</b></div></div>
  ${adminBar()}${pushBanner()}
  ${mine ? `<button class="card me-card" data-act="detail" data-id="${mine.st.id}"><span class="ico ${mine.sisa ? 'warn' : 'in'} stat-ico">${ic(mine.sisa ? 'alert' : 'check')}</span><div><small>Iuran kamu</small><b>${mine.sisa ? 'Tunggakan ' + rp(mine.sisa) : 'Sudah lunas'}</b></div><span class="pill ${mine.status}">${STATUS_LABEL[mine.status]}</span></button>` : ''}
  <section data-sec="saldo" class="card hero ${c.balance < 0 ? 'neg' : ''}"><small>${ic('wallet')}Saldo kas saat ini</small><div class="big">${money(c.balance)}</div>${c.balance < 0 ? `<span class="hero-warn">${ic('alert')}Kas minus · pengeluaran melebihi pemasukan</span>` : ''}</section>
  ${goal(c.balance)}
  <div class="grid g-stats dash-stats">
    ${stat('in', 'down', 'Total pemasukan', c.income, 'payments', 'all', 'pemasukan')}
    ${stat('out', 'up', 'Total pengeluaran', c.expense, 'expenses', '', 'pengeluaran')}
    ${stat('warn', 'alert', 'Total tunggakan siswa', c.sisaAll, 'payments', 'tunggak', 'tunggakan')}
  </div>
  <div class="card">
    <div class="card-head"><h2>Riwayat transaksi terbaru</h2></div>
    <div class="tx-list">${tx.length ? tx.map(txRow).join('') : '<div class="empty">Belum ada transaksi. Mulai dengan mencatat pembayaran anggota.</div>'}</div>
  </div>`;
}

registerActions({
  go(id, el) {
    const preset = id === 'payments'
      ? { q: el.dataset.q || '', status: el.dataset.st || 'all' }
      : { from: '', to: '', cat: el.dataset.cat || 'all' };
    navigate(id, preset, el);
  },
});

export default { id: 'dashboard', title: 'Dashboard', nav: 'Dashboard', tab: 'Beranda', icon: 'home', render };