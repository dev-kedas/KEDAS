import { $, ic, esc, rp, fmt, todayD, initials } from '../core/utils.js';
import { S } from '../core/store.js';
import { notifications } from '../core/calc.js';
import { openDlg } from '../core/ui.js';
import { isAdmin, getSession, userName } from '../core/session.js';
import { UPDATES } from '../core/updates.js';

const bcastNotifs = () => (S.broadcasts || []).map(b => ({ id: 'b|' + b.id, type: 'info', title: b.title, text: b.body, ts: b.ts, bc: true }));
const TAGS = { baru: 'Baru', perbaikan: 'Perbaikan', info: 'Info' };
const KEDAS_DAYS = 60, KEDAS_MIN = 3;
const updNotifs = () => {
  const have = new Set((S.kedasUpdates || []).map(u => u.id));
  const all = [...(S.kedasUpdates || []), ...UPDATES.filter(u => !have.has(u.id))].sort((a, b) => b.ts - a.ts);
  const fresh = all.filter(u => Date.now() - u.ts < KEDAS_DAYS * 864e5);
  return (fresh.length >= KEDAS_MIN ? fresh : all.slice(0, KEDAS_MIN))
    .map(u => ({ id: 'u|' + u.id, type: 'info', title: u.title, text: u.items.map(i => '\u2022 ' + i).join('\n'), ts: u.ts, bc: true, up: true, tag: u.tag }));
};
let notifTab = 'org';
export const setNotifTab = t => { notifTab = t === 'kedas' ? 'kedas' : 'org'; };
// tab: 'org' = pengumuman + pengingat iuran, 'kedas' = kabar dari KEDAS, kosong = semuanya
export function visibleNotifs(c, tab) {
  const all = notifications(c), s = getSession();
  const org = isAdmin() ? all : [...bcastNotifs(), ...all.filter(n => s && n.sid === s.studentId)];
  if (tab === 'org') return org;
  if (tab === 'kedas') return updNotifs();
  return [...updNotifs(), ...org];
}
function ago(ts) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'baru saja'; if (m < 60) return m + ' menit lalu';
  const h = Math.round(m / 60); if (h < 24) return h + ' jam lalu';
  const d = Math.round(h / 24); return d < 7 ? d + ' hari lalu' : fmt(new Date(ts));
}

export function closeNotif() {
  const p = $('#notifPanel'); if (!p) return;
  p.hidden = true; $('#bellBtn').setAttribute('aria-expanded', 'false');
}

export function initShell() {
  $('#bellBtn').addEventListener('click', e => {
    e.stopPropagation();
    const p = $('#notifPanel'); p.hidden = !p.hidden;
    $('#bellBtn').setAttribute('aria-expanded', String(!p.hidden));
  });
  document.addEventListener('click', e => { if (!e.composedPath().includes($('.notif-wrap'))) closeNotif(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNotif(); });
}

export function quickSheet() {
  openDlg('Tambah transaksi', `<div class="quick">
    <button class="quick-btn" data-act="pay"><span class="ico in">${ic('down')}</span><span><b>Catat pembayaran</b><small>Pilih anggota, lalu catat iuran</small></span></button>
    <button class="quick-btn" data-act="addexp"><span class="ico out">${ic('up')}</span><span><b>Tambah pengeluaran</b><small>Belanja atau biaya organisasi</small></span></button></div>`);
}

const prevPos = {}, lastHtml = {};
function setHtml(sel, html) { if (lastHtml[sel] !== html) { $(sel).innerHTML = html; lastHtml[sel] = html; } }
function markActive(id) {
  document.querySelectorAll('.nav-link,.tab').forEach(l => {
    const on = l.getAttribute('href') === '#' + id;
    l.classList.toggle('active', on);
    if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
  });
}
function slide(key, host, pick, animate = true) {
  const h = $(host), a = h && h.querySelector('.active'), ind = h && h.querySelector('.ind');
  const el = a && pick(a);
  if (!el || !ind || !el.offsetWidth) { delete prevPos[key]; if (ind) ind.style.opacity = 0; return; }
  const to = { x: el.offsetLeft, y: el.offsetTop };
  const from = animate && prevPos[key] || to;
  ind.style.transition = 'none';
  Object.assign(ind.style, { width: el.offsetWidth + 'px', height: el.offsetHeight + 'px', opacity: 1, transform: `translate(${from.x}px,${from.y}px)` });
  void ind.offsetWidth;
  ind.style.transition = '';
  ind.style.transform = `translate(${to.x}px,${to.y}px)`;
  prevPos[key] = to;
}
const syncIndicators = (animate = true) => {
  slide('side', '.side-nav', a => a, animate);
  slide('tab', '#bottomnav', a => a.querySelector('.ti'), animate);
};
window.addEventListener('resize', () => syncIndicators(false));
export function trackSidebar() { const t0 = performance.now(); (function f() { syncIndicators(false); if (performance.now() - t0 < 360) requestAnimationFrame(f); })(); }

const KIND = { tunggak: 'alert', tempo: 'clock', belum: 'wallet', info: 'bell' };

export function renderShell(c, pages, current) {
  const list = Object.values(pages);
  const nTunggak = c.rows.filter(r => r.status === 'tunggak').length;

  const side = `
    <div class="brand"><div class="brand-mark is-img"><img src="/logo.svg" alt="" width="40" height="40"></div><div><b>Kas Organisasi</b><span>${esc(S.settings.className)}</span></div></div>
    ${isAdmin() ? `<button class="btn-add" data-act="quick">${ic('plus')}<span>Tambah transaksi</span></button>` : '<div style="height:14px"></div>'}
    <nav class="side-nav" aria-label="Menu utama"><span class="ind" aria-hidden="true"></span>${list.map(p => `
      <a class="nav-link" href="#${p.id}" title="${p.nav}">${ic(p.icon)}<span>${p.nav}</span>${p.id === 'payments' && nTunggak ? `<em class="nav-badge" title="${nTunggak} anggota menunggak">${nTunggak}</em>` : ''}</a>`).join('')}</nav>
    <div class="side-foot"><div class="side-user"><span class="avatar">${esc(initials(userName() || '?'))}</span><div><b>${esc(userName())}</b><small>${isAdmin() ? 'Admin organisasi' : 'Anggota'}</small></div><button data-act="logout" aria-label="Keluar" title="Keluar">${ic('logout')}`;
  setHtml('#sidebar', side);

  const tab = p => `<a class="tab" href="#${p.id}"><span class="ti">${ic(p.icon)}${p.id === 'payments' && nTunggak ? '<i class="tab-dot"></i>' : ''}</span>${p.tab}</a>`;
  const [a, b, d, e] = list;
  setHtml('#bottomnav', `<span class="ind" aria-hidden="true"></span>${tab(a)}${tab(b)}${isAdmin() ? `<button class="fab" data-act="quick" aria-label="Tambah transaksi">${ic('plus')}</button>` : ''}${tab(d)}${tab(e)}`);
  $('#bottomnav').classList.toggle('no-fab', !isAdmin());
  markActive(current);

  syncIndicators();

  $('#pageTitle').textContent = pages[current].title;
  $('#pageSub').textContent = `${S.settings.className} · ${fmt(todayD(), { weekday: 'long', day: 'numeric', month: 'long' })}`;
  document.title = `${pages[current].title} · Kas Organisasi`;

  const orgList = visibleNotifs(c, 'org'), kedasList = visibleNotifs(c, 'kedas');
  const ids = new Set([...notifications(c).map(n => n.id), ...bcastNotifs().map(n => n.id), ...updNotifs().map(n => n.id)]);
  const pruned = S.readNotifs.filter(id => ids.has(id));
  if (pruned.length !== S.readNotifs.length) S.readNotifs = pruned;
  const isUnread = n => !S.readNotifs.includes(n.id);
  const uOrg = orgList.filter(isUnread).length, uKedas = kedasList.filter(isUnread).length, unread = uOrg + uKedas;
  const ns = notifTab === 'kedas' ? kedasList : orgList, uTab = notifTab === 'kedas' ? uKedas : uOrg;
  $('#bellBtn').innerHTML = ic('bell') + (unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : '');
  const tabBtn = (id, label, n) => `<button type="button" class="np-tab${notifTab === id ? ' on' : ''}" role="tab" aria-selected="${notifTab === id}" data-act="ntab" data-id="${id}">${label}${n ? `<i class="np-n">${n > 99 ? '99+' : n}</i>` : ''}</button>`;
  const empty = notifTab === 'kedas' ? 'Belum ada kabar dari KEDAS.' : isAdmin() ? 'Semua pembayaran aman. Tidak ada pengingat.' : 'Iuranmu aman. Tidak ada pengingat.';
  $('#notifPanel').innerHTML = `<div class="np-head"><b>Notifikasi</b>${uTab ? `<button class="np-read" data-act="readall" aria-label="Tandai semua dibaca di tab ini" title="Tandai semua dibaca">${ic('checks')}</button>` : ''}</div>` +
    `<div class="np-tabs" role="tablist" aria-label="Jenis notifikasi">${tabBtn('org', 'Organisasi', uOrg)}${tabBtn('kedas', 'KEDAS', uKedas)}</div>` +
    (ns.length ? ns.map(n => `<button class="np-item ${isUnread(n) ? 'unread' : ''}" data-act="notif" data-id="${esc(n.id)}" data-sid="${n.sid || ''}"><span class="np-dot ${n.type}">${ic(KIND[n.type])}</span><span><b>${n.tag ? `<em class="np-tag ${esc(n.tag)}">${esc(TAGS[n.tag] || 'Info')}</em>` : ''}${esc(n.title)}</b>${n.bc ? `${n.text ? `<p${n.up ? ' class="np-up"' : ''}>${esc(n.text)}</p>` : ''}<p class="np-time">${ago(n.ts)}</p>` : `<p>${esc(n.text)}</p><p><strong>${rp(n.sisa)}</strong> · jatuh tempo ${fmt(n.due)}</p>`}</span></button>`).join('')
      : `<div class="np-empty">${ic('check', 'width="32" height="32"')}<p>${empty}</p></div>`);
}
