import { $ } from './utils.js';
import { compute } from './calc.js';
import { closeDlg } from './ui.js';
import { renderShell, closeNotif } from '../components/shell.js';

const pages = {};
let current = 'dashboard', started = false;

export const registerPages = list => list.forEach(p => { pages[p.id] = p; });
export const currentPage = () => current;

let preset = null;
export const takePreset = () => { const p = preset; preset = null; return p; };

export function render() {
  const c = compute();
  renderShell(c, pages, current);
  pages[current].render(c);
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let shown = false;

function enter(src) {
  const v = $('#view');
  const apply = () => { render(); window.scrollTo(0, 0); };
  if (!shown || !document.startViewTransition || reduced()) {
    apply(); shown = true;
    v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
    return Promise.resolve();
  }
  if (src) src.style.viewTransitionName = 'vt-card';
  const t = document.startViewTransition(() => {
    if (src) { src.style.viewTransitionName = ''; v.style.viewTransitionName = 'vt-card'; }
    apply();
  });
  t.finished.finally(() => { v.style.viewTransitionName = ''; });
  return t.finished.catch(() => {});
}
export function navigate(id, state = null, src = null) {
  if (!pages[id]) return Promise.resolve();
  preset = state;
  if (id !== current) closeDlg();
  current = id; started = true;
  if (location.hash !== '#' + id) location.hash = id;
  closeNotif(); return enter(src);
}
export function route() {
  const h = location.hash.slice(1), next = pages[h] ? h : 'dashboard';
  if (started && next === current) return;
  if (next !== current) closeDlg();
  current = next; started = true;
  closeNotif(); enter();
}

export function start() { started = false; shown = false; route(); }
