import '../styles/pages/payments.css';
import { $, ic, esc, rp, fmt, iso, todayD, uid, initials, moneyField, parseMoney, STATUS_LABEL } from '../core/utils.js';
import { isAdmin } from '../core/session.js';
import { S } from '../core/store.js';
import * as db from '../core/db.js';
import { compute, periodLabel } from '../core/calc.js';
import { openDlg, closeDlg, toast, confirmBox, registerActions, registerForms } from '../core/ui.js';
import { render as rerender, takePreset } from '../core/router.js';
import { seg, placeIndicators } from './settings.js';

const F = { q: '', status: 'all' };

function render() {
  const p = takePreset(); if (p) Object.assign(F, p);
  if (!['all', 'tunggak', 'lunas'].includes(F.status)) F.status = 'all';
  $('#view').innerHTML = `
  <div class="toolbar pay-toolbar">
    <input class="input grow" id="fq" type="search" placeholder="Cari nama anggota…" value="${esc(F.q)}" aria-label="Cari anggota">
    <div class="pay-filter">${seg('pstatus', [['all', 'Semua'], ['tunggak', 'Menunggak'], ['lunas', 'Lunas']], F.status)}</div>
  </div>
  <div class="card"><div id="payTable"></div></div>`;
  $('#fq').oninput = e => { F.q = e.target.value; table(); };
  table();
  placeIndicators();registerActions({ pstatus(id) { F.status = id; rerender(); } });registerActions({ pstatus(id) { F.status = id; rerender(); } });
}

function table() {
  const el = $('#payTable'); if (!el) return;
  const c = compute(), q = F.q.trim().toLowerCase();
  const order = { tunggak: 0, belum: 1, lunas: 2 };
  const rows = c.rows.filter(r => (F.status === 'all' || (F.status === 'owing' ? r.sisa > 0 : r.status === F.status)) && r.st.name.toLowerCase().includes(q))
    .sort((a, b) => order[a.status] - order[b.status] || b.sisa - a.sisa || a.st.name.localeCompare(b.st.name));
  const per = S.settings.mode === 'weekly' ? 'minggu' : 'bulan';
  if (!S.students.length) { el.innerHTML = '<div class="empty">Belum ada anggota. Admin bisa menambahkan di Pengaturan › Admin.</div>'; return; }
  const n = st => c.rows.filter(r => r.status === st).length;
  el.innerHTML = `<div class="pay-sum"><div><small>Iuran per ${per}</small><b>${rp(S.settings.nominal)}</b></div><div class="bad"><small>Menunggak</small><b>${n('tunggak')} anggota</b></div><div class="ok"><small>Lunas</small><b>${n('lunas')} anggota</b></div></div>` +
    (rows.length ? `<div class="table-wrap"><table class="resp pay"><thead><tr><th>anggota</th><th>Status</th><th>Wajib</th><th>Dibayar</th><th>Tunggakan</th><th></th></tr></thead><tbody>` +
      rows.map(r => `<tr class="row-${r.status}" data-act="detail" data-id="${r.st.id}" tabindex="0" role="button" aria-label="Buka riwayat ${esc(r.st.name)}">
        <td class="first"><div class="name-cell"><span class="avatar">${esc(initials(r.st.name))}</span>${esc(r.st.name)}</div></td>
        <td data-label="Status"><span class="pill ${r.status}">${STATUS_LABEL[r.status]}</span></td>
        <td data-label="Wajib">${rp(r.wajib)}</td>
        <td data-label="Dibayar">${rp(r.paid)}${r.extra ? `<br><small class="muted">lebih ${rp(r.extra)}</small>` : ''}</td>
        <td data-label="Tunggakan"><b class="${r.sisa ? 'owe' : 'clear'}">${rp(r.sisa)}</b></td>
        <td class="go">${ic('arrow')}</td></tr>`).join('') +
      '</tbody></table></div>' : '<div class="empty">Tidak ada anggota yang cocok dengan filter.</div>');
  el.querySelectorAll('tr[data-act]').forEach(tr => { tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.click(); } }; });
}

function pickStudent() {
  if (!S.students.length) return toast('Tambahkan anggota dulu di Pengaturan › Admin');
  const rows = compute().rows.slice().sort((a, b) => b.sisa - a.sisa || a.st.name.localeCompare(b.st.name));
  const list = q => rows.filter(r => r.st.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map(r => `<button type="button" class="pick-item" data-act="pay" data-id="${r.st.id}"><span class="avatar">${esc(initials(r.st.name))}</span><span class="t">${esc(r.st.name)}</span>${r.sisa ? `<b class="owe">${rp(r.sisa)}</b>` : '<span class="pill lunas">Lunas</span>'}</button>`).join('') || '<div class="empty">anggota tidak ditemukan.</div>';
  openDlg('Pilih anggota', `<input class="input pick-search" id="pk" type="search" placeholder="Cari nama anggota…" aria-label="Cari anggota" autocomplete="off"><div id="pkList" class="pick-list">${list('')}</div>`);
  $('#pk').oninput = e => { $('#pkList').innerHTML = list(e.target.value); };
}

function payForm(sid) {
  const r = compute().rows.find(x => x.st.id === sid); if (!r) return;
  openDlg('Catat pembayaran', `<form id="payForm" novalidate>
    <input type="hidden" name="sid" value="${r.st.id}">
    <div class="who"><span class="avatar">${esc(initials(r.st.name))}</span><div><b>${esc(r.st.name)}</b><small>${r.sisa ? 'Tunggakan ' + rp(r.sisa) : 'Sudah lunas'}</small></div></div>
    <div class="row2"><div class="field"><label for="pf-a">Nominal</label>${moneyField('pf-a', 'amount', r.sisa ? r.sisa : S.settings.nominal)}</div>
    <div class="field"><label for="pf-d">Tanggal bayar</label><input class="input" id="pf-d" name="date" type="date" value="${iso(todayD())}" max="${iso(todayD())}" required></div></div>
    <div class="field"><label for="pf-n">Catatan (opsional)</label><input class="input" id="pf-n" name="note" maxlength="80" placeholder="Contoh: bayar tunai ke bendahara"></div>
    <p class="hint">Pembayaran otomatis dialokasikan ke periode terlama yang belum lunas.</p><p class="err" id="pf-err"></p>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">Simpan pembayaran</button></div></form>`,
  () => detailDlg(sid));
}

function detailDlg(sid) {
  const r = compute().rows.find(x => x.st.id === sid); if (!r) return;
  const last = r.pays[0];
  openDlg(r.st.name, `<div class="detail-status"><span class="pill ${r.status}">${STATUS_LABEL[r.status]}</span></div>
    <div class="kv three">
      <div class="k-ok"><small>Sudah dibayar</small><b>${rp(r.paid)}</b></div>
      <div class="${r.sisa ? 'k-bad' : 'k-ok'}"><small>Tunggakan</small><b>${rp(r.sisa)}</b></div>
      <div><small>Terakhir bayar</small><b>${last ? fmt(last.date) : '—'}</b><small>${last ? rp(last.amount) : 'Belum ada'}</small></div>
    </div>
    <div class="sec-title">Status per periode</div>
    ${r.periods.length ? r.periods.slice().reverse().map(p => `<div class="plist"><div>${esc(periodLabel(p.i))}<small>Jatuh tempo ${fmt(p.due)}${p.left ? ' · kurang ' + rp(p.left) : ''}</small></div><span class="pill ${p.status}">${STATUS_LABEL[p.status]}</span></div>`).join('') : '<p class="muted">Belum ada periode berjalan.</p>'}
    <div class="sec-title">Riwayat pembayaran</div>
    ${r.pays.length ? r.pays.map(p => `<div class="plist"><div><b>${rp(p.amount)}</b><small>${fmt(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</small></div>${isAdmin() ? `<button class="btn sm ghost" data-act="delpay" data-id="${p.id}" aria-label="Hapus pembayaran">${ic('trash')}</button>` : ''}</div>`).join('') : '<p class="muted">Belum ada pembayaran.</p>'}
    <div class="dlg-foot"><button class="btn" data-close>Tutup</button>${isAdmin() ? `<button class="btn primary" data-act="pay" data-id="${r.st.id}">${ic('plus')}Catat pembayaran</button>` : ''}</div>`);
}

registerActions({
  pay: id => { if (isAdmin()) (id ? payForm(id) : pickStudent()); },
  detail: id => detailDlg(id),
  async delpay(id) {
    const p = S.payments.find(x => x.id === id); if (!p || !isAdmin()) return;
    if (await confirmBox(`Hapus pembayaran ${rp(p.amount)} tanggal ${fmt(p.date)}? Pemasukan, saldo, dan tunggakan akan dihitung ulang.`)) {
      try { await db.deletePayment(id); rerender(); toast('Pembayaran dihapus'); detailDlg(p.studentId); }
      catch (e) { toast(db.errMsg(e)); }
    }
  },
});

registerForms({
  async payForm({ v, btn, fail }) {
    const amount = parseMoney(v.amount);
    if (!v.sid || !S.students.some(s => s.id === v.sid)) return fail('pf-err', 'anggota tidak ditemukan.');
    if (!(amount > 0)) return fail('pf-err', 'Nominal harus lebih dari 0.');
    if (!v.date || v.date > iso(todayD())) return fail('pf-err', 'Tanggal tidak valid.');
    btn.disabled = true;
    try { await db.addPayment({ studentId: v.sid, amount, date: v.date, note: v.note.trim() }); rerender(); closeDlg(true); toast('Pembayaran dicatat'); }
    catch (e) { btn.disabled = false; fail('pf-err', db.errMsg(e)); }
  },
});

export default { id: 'payments', title: 'Pembayaran anggota', nav: 'Pembayaran', tab: 'Pembayaran', icon: 'users', render };
registerActions({ pstatus(id) { F.status = id; rerender(); } });