// Notifikasi HP (Web Push). Service worker: public/sw.js. Pengirim: supabase/functions/send-push.
import { sb } from './supabase.js';

// Kunci publik VAPID (aman dibuka; pasangannya yang privat hanya ada di Supabase secrets).
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNu62ruM18S1CSVKbA1BGpzbtq-taK_tgQigkgj2wpSQpSc_PYdFz9EpzBEX7wAixxGEFE6lkzfHZCQeFvwt3xE';
const FLAG = 'kedas.push', LATER = 'kedas.pushlater';
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } } };

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };

// 'ios-install' | 'unsupported' | 'denied' | 'on' | 'off'
export function pushState() {
  if (isIOS() && !standalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  const p = Notification.permission;
  if (p === 'denied') return 'denied';
  return p === 'granted' && ls.get(FLAG) !== '0' ? 'on' : 'off';
}
export const bannerHidden = () => ls.get(LATER) === '1';
export const hideBanner = () => ls.set(LATER, '1');

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const go = () => navigator.serviceWorker.register('/sw.js').catch(() => { });
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}

async function save(sub) {
  const j = sub.toJSON();
  const { error } = await sb.rpc('save_push_subscription', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent });
  if (error) throw error;
}
async function currentSub(create) {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
  return sub;
}

export async function enablePush() {
  const st = pushState();
  if (st === 'ios-install') throw new Error('Di iPhone, tambahkan KEDAS ke Layar Utama dulu, lalu buka dari ikonnya.');
  if (st === 'unsupported') throw new Error('Browser ini belum mendukung notifikasi.');
  if (st === 'denied') throw new Error('Notifikasi diblokir. Izinkan lewat pengaturan situs di browser.');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Izin notifikasi tidak diberikan.');
  await save(await currentSub(true));
  ls.set(FLAG, '1');
}

export async function disablePush() {
  try {
    const sub = await currentSub(false);
    if (sub) { await sb.rpc('remove_push_subscription', { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch { }
  ls.set(FLAG, '0');
}

// Saat masuk: sambungkan lagi perangkat ini ke akun yang sedang login (HP bisa dipakai gantian).
export async function syncPush() {
  try { if (pushState() === 'on') await save(await currentSub(true)); } catch (e) { console.warn('sync push', e); }
}
// Saat keluar: lepaskan perangkat dari akun lama supaya tidak menerima notifikasi orang lain.
export async function unlinkPush() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await sb.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
  } catch { }
}

export async function testPush() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('KEDAS', { body: 'Notifikasi HP kamu sudah aktif.', icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', tag: 'kedas-test' });
}
