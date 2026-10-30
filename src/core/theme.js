import { S } from './store.js';
import { getSession, userKey } from './session.js';


const CK = 'kasorganisasi.accentCustom';
const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const customAccent = hex => ({ name: 'Kustom', c: hex, c2: mixHex(hex, '#ffffff', 0.18) });
const loadCustom = () => { try { return localStorage.getItem(CK) || '#0e4d3a'; } catch { return '#0e4d3a'; } };
export const ACCENTS = {
  green: { name: 'Hijau', c: '#0e4d3a', c2: '#14654c' },
  blue: { name: 'Biru', c: '#1d4e8f', c2: '#2a68b8' },
  purple: { name: 'Ungu', c: '#5b3a99', c2: '#7350b8' },
  rose: { name: 'Mawar', c: '#a3274f', c2: '#c23a66' },
  amber: { name: 'Oranye', c: '#a04a12', c2: '#c25f1d' },
  slate: { name: 'Abu', c: '#334155', c2: '#475569' },
  custom: customAccent(loadCustom()),
};
export function setCustomAccent(hex) {
  ACCENTS.custom = customAccent(hex);
  try { localStorage.setItem(CK, hex); } catch { }
  setPref({ accent: 'custom' });
}
export const MODES = [['light', 'Terang', 'sun'], ['dark', 'Gelap', 'moon'], ['system', 'Sistem', 'monitor']];

const PK = 'kasorganisasi.prefs';
let prefs = (() => { try { return JSON.parse(localStorage.getItem(PK)) || {}; } catch { return {}; } })();

export const classTheme = () => ({ mode: 'light', accent: 'green', forced: false, ...(S.settings && S.settings.theme) });
export const getPref = () => ({ source: 'own', mode: 'system', accent: 'green', ...prefs[userKey()] });
export function setPref(p) {
  prefs[userKey()] = { ...getPref(), ...p };
  try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch { }
  applyTheme(true);
}
export function resolveTheme() {
  if (!getSession()) { const g = getPref(); return { mode: g.mode, accent: g.accent, from: 'own' }; }
  const ct = classTheme(), p = getPref();
  return ct.forced || p.source === 'class' ? { mode: ct.mode, accent: ct.accent, hex: ct.customHex, from: 'class' } : { mode: p.mode, accent: p.accent, from: 'own' };
}

const mq = matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(animate = false) {
  const t = resolveTheme(), a = t.accent === 'custom' && t.hex ? customAccent(t.hex) : ACCENTS[t.accent] || ACCENTS.green, el = document.documentElement;
  const dark = t.mode === 'dark' || (t.mode === 'system' && mq.matches);
  if (animate) { el.classList.add('theme-swap'); setTimeout(() => el.classList.remove('theme-swap'), 400); }
  el.dataset.mode = dark ? 'dark' : 'light';
  el.style.setProperty('--brand', a.c); el.style.setProperty('--brand-2', a.c2);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0c1411' : a.c;
}
mq.addEventListener('change', () => applyTheme());