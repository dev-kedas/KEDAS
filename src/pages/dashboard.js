import '../styles/pages/dashboard.css';
import { $, ic, esc, rp, fmt, initials, STATUS_LABEL } from '../core/utils.js';
import { transactions, compute } from '../core/calc.js';
import { S } from '../core/store.js';
import { isAdmin, me, userName } from '../core/session.js';
import { navigate } from '../core/router.js';
import { registerActions } from '../core/ui.js';

const money = n => `<span class="cur">${n < 0 ? '−' : ''}Rp</span>${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n || 0))}`;

function txRow(t) {
  const isIn = t.type === 'in';
  const act = isIn ? 'detail' : 'viewexp';
  const id = isIn ? (t.sid || '') : (t.id || '');
  return `<button class="tx" data-act="${act}" data-id="${esc(id)}"><span class="ico ${isIn ? 'in' : 'out'}">${ic(isIn ? 'down' : 'up')}</span><div class="t"><b>${esc(t.title)}</b><small>${esc(t.sub)} · ${fmt(t.date)}</small></div><span class="amt ${t.type}">${isIn ? '+' : '−'}${rp(t.amount)}</span><span class="tx-go">${ic('arrow')}</span></button>`;
}

function stat(tone, icon, label, value, to, st) {
  return `<button class="card stat stat-link ${tone}" data-act="go" data-id="${to}" data-st="${st}" data-tone="${tone}" aria-label="${label}: lihat detail"><span class="ico ${tone}">${ic(icon)}</span><div><small>${label}</small><b>${rp(value)}</b></div><span class="go">${ic('arrow')}</span></button>`;
}

function goal(saldo) {
  const target = +S.settings.targetAmount || 0;
  if (target <= 0) return '';
  const got = Math.max(0, saldo), pct = Math.min(100, Math.round(got / target * 100));
  return `<section class="card goal"><div class="goal-head"><small>${ic('receipt')}Tujuan kas</small><b>${esc(S.settings.targetName || 'Tanpa nama')}</b></div>
    <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progres ${esc(S.settings.targetName || 'tujuan kas')}"><i style="width:${pct}%"></i></div>
    <div class="goal-meta"><span>${rp(got)} terkumpul</span><span>${pct}% dari ${rp(target)}</span></div></section>`;
}

function render(c) {
  const tx = transactions().slice(0, 10), mine = me() && c.rows.find(r => r.st.id === me().id);
  $('#view').innerHTML = `
  <div class="greet"><span class="avatar">${esc(initials(userName() || '?'))}</span><div><small>Halo,</small><b>${esc(userName())}</b></div></div>
  ${mine ? `<button class="card me-card" data-act="detail" data-id="${mine.st.id}"><span class="ico ${mine.sisa ? 'warn' : 'in'} stat-ico">${ic(mine.sisa ? 'alert' : 'check')}</span><div><small>Iuran kamu</small><b>${mine.sisa ? 'Tunggakan ' + rp(mine.sisa) : 'Sudah lunas'}</b></div><span class="pill ${mine.status}">${STATUS_LABEL[mine.status]}</span></button>` : ''}
  <section class="card hero ${c.balance < 0 ? 'neg' : ''}"><small>${ic('wallet')}Saldo kas saat ini</small><div class="big">${money(c.balance)}</div>${c.balance < 0 ? `<span class="hero-warn">${ic('alert')}Kas minus · pengeluaran melebihi pemasukan</span>` : ''}</section>
  ${goal(c.balance)}
  <div class="grid g-stats dash-stats">
    ${stat('in', 'down', 'Total pemasukan', c.income, 'payments', 'all')}
    ${stat('out', 'up', 'Total pengeluaran', c.expense, 'expenses', '')}
    ${stat('warn', 'alert', 'Total tunggakan anggota', c.sisaAll, 'payments', 'tunggak')}
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