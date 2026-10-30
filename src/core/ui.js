import { $, ic, esc } from './utils.js';

const dlg = $('#dlg'), cdlg = $('#confirmDlg');
const actions = {}, forms = {};
let back = null, dir = 'fwd', curTitle = '';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const registerActions = o => Object.assign(actions, o);
export const registerForms = o => Object.assign(forms, o);
export const runAction = (name, ...args) => actions[name] && actions[name](...args);

export function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2600);
}
export function openDlg(title, body, onBack = null) {
  back = onBack;
  const html = `<div class="dlg-pane"><div class="dlg-head"><h3>${esc(title)}</h3><button class="icon-btn dlg-x" data-close aria-label="Tutup">${ic('x')}</button></div><div class="dlg-body">${body}</div></div>`;
  if (!dlg.open) { dlg.innerHTML = html; curTitle = title; dir = 'fwd'; dlg.showModal(); return; }
  const h0 = dlg.offsetHeight, swap = title !== curTitle && !reduced();
  dlg.innerHTML = html; curTitle = title;
  if (swap) {
    dlg.firstElementChild.classList.add(dir === 'back' ? 'in-back' : 'in-fwd');
    const h1 = dlg.offsetHeight;
    if (h0 !== h1) dlg.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  dir = 'fwd';
}
function goBack() { const f = back; back = null; if (!f) return false; dir = 'back'; f(); return true; }
export const closeDlg = (backToPrev = false) => {
  if (backToPrev && goBack()) return;
  back = null;
  if (!dlg.open) return;
  if (reduced()) { dlg.close(); return; }
  dlg.classList.add('closing');
  dlg.addEventListener('animationend', () => { dlg.classList.remove('closing'); dlg.close(); }, { once: true });
};
export function confirmBox(msg, okText = 'Hapus') {
  return new Promise(res => {
    cdlg.innerHTML = `<div class="dlg-body"><h3 class="confirm-title">Konfirmasi</h3><p>${msg}</p><div class="dlg-foot"><button class="btn" data-v="0">Batal</button><button class="btn danger" data-v="1">${okText}</button></div></div>`;
    cdlg.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { cdlg.close(); res(b.dataset.v === '1'); } };
    cdlg.oncancel = () => res(false);
    cdlg.showModal();
  });
}

export function initUI() {
  dlg.addEventListener('close', () => { back = null; });
  dlg.addEventListener('cancel', e => { if (back) { e.preventDefault(); goBack(); } });
  dlg.addEventListener('click', e => { if ((e.target.closest('[data-close]') || e.target === dlg) && !goBack()) closeDlg(); });
  document.addEventListener('input', e => {
    const el = e.target; if (!el.matches || !el.matches('input[data-money]')) return;
    const raw = el.value, neg = el.dataset.money === 'signed' && /^\s*-/.test(raw);
    const before = raw.slice(0, el.selectionStart ?? raw.length).replace(/\D/g, '').length;
    const d = raw.replace(/\D/g, '').slice(0, 12).replace(/^0+(?=\d)/, '');
    const out = (neg ? '-' : '') + (d ? Number(d).toLocaleString('id-ID') : '');
    el.value = out;
    let i = before === 0 ? (neg ? 1 : 0) : 0, n = 0;
    if (before) for (i = 0; i < out.length && n < before; i++) if (/\d/.test(out[i])) n++;
    try { el.setSelectionRange(i, i); } catch { }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const fn = actions[b.dataset.act]; if (fn) fn(b.dataset.id, b, e);
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, h = forms[f.id]; if (!h) return;
    const v = Object.fromEntries(new FormData(f));
    const fail = (id, m) => { const el = $('#' + id); if (el) el.textContent = m; };
    h({ f, v, btn: f.querySelector('[type=submit]'), fail });
  });
}
