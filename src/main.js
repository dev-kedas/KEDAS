import './styles/base.css';
import './styles/layout.css';
import './styles/forms.css';
import './styles/components.css';
import './styles/dialog.css';
import './styles/notifications.css';

import { $ } from './core/utils.js';
import { compute } from './core/calc.js';
import { isAdmin, sessionValid } from './core/session.js';
import { applyTheme } from './core/theme.js';
import { initUI, registerActions, runAction, toast } from './core/ui.js';
import { initDatePickers } from './core/datepicker.js';
import { registerPages, render, route, start, navigate } from './core/router.js';
import { initShell, quickSheet, closeNotif, visibleNotifs} from './components/shell.js';
import { initAuth, showAuth, showSetup, showShareLogin, logout } from './pages/auth.js';
import { captureShare, getShare, clearShare, norm, flashSection } from './core/share.js';
import { registerSW, syncPush } from './core/push.js';
import { sb } from './core/supabase.js';
import { S } from './core/store.js';
import { bootSession, startRealtime, markRead, isNetErr } from './core/db.js';

import dashboard from './pages/dashboard.js';
import payments from './pages/payments.js';
import expenses from './pages/expenses.js';
import settings, { passForm } from './pages/settings.js';
import './pages/broadcast.js';

registerPages([dashboard, payments, expenses, settings]);

registerActions({
  quick() { if (!isAdmin()) return; closeNotif(); quickSheet(); },
  readall() {
    markRead(visibleNotifs(compute()).map(n => n.id)); render(); $('#notifPanel').hidden = false;
  },
  notif(id, el) {
    markRead([id]);
    closeNotif(); render(); if (el.dataset.sid) runAction('detail', el.dataset.sid);
  },
  logout,
});

function enterApp() {
  document.body.classList.remove('is-auth', 'booting');
  applyTheme();
  history.replaceState(null, '', location.pathname + location.search);
  start();
  startRealtime(onRemote);
  syncPush();
  consumeShare();
  if (recovering) { recovering = false; passForm(); }
}

// Link bagikan: setelah masuk, pastikan link-nya untuk organisasi ini, lalu sorot bagiannya.
function consumeShare() {
  const sh = getShare(); if (!sh) return;
  clearShare();
  if (sh.code && norm(sh.code) !== norm(S.settings.classCode)) { toast('Link itu untuk organisasi lain. Keluar dulu, lalu buka linknya lagi.'); return; }
  navigate('dashboard');
  setTimeout(() => flashSection(sh.type), 350);
}
const showEntry = () => { const sh = getShare(); if (sh && sh.code) showShareLogin(sh.code); else showAuth(); };

// Dipanggil saat data berubah dari perangkat lain (realtime).
function onRemote(ok) {
  if (!ok || !sessionValid()) { logout(); toast('Sesi berakhir. Silakan masuk lagi.'); return; }
  applyTheme();
  const a = document.activeElement;
  const typing = a && a.closest && a.closest('#view') && a.matches('input,textarea,select');
  if (!typing) render();
}

let recovering = false;
sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') recovering = true; });

let bootTries = 0;
async function boot() {
  let st = 'none';
  try { st = await bootSession(); }
  catch (e) {
    console.error(e);
    if (isNetErr(e) && bootTries++ < 5) {
      toast('Tidak bisa terhubung ke server. Mencoba lagi...');
      setTimeout(boot, 2000 * bootTries);
      return;
    }
    if (isNetErr(e)) { toast('Tidak bisa terhubung ke server. Cek koneksi internet.'); return; }
    try { await sb.auth.signOut({ scope: 'local' }); } catch { }
  }
  document.body.classList.remove('booting');
  if (st === 'app') enterApp();
  else if (st === 'setup') showSetup();
  else showEntry();
}

captureShare();
initUI();
initDatePickers();
initShell();
initAuth({ onEnter: enterApp });
window.addEventListener('hashchange', () => { if (sessionValid()) route(); });

const hasToken = (() => { try { return Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k)); } catch { return false; } })();
if (hasToken) { document.body.classList.add('booting'); boot(); } else showEntry();
registerSW();

requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('anim')));
