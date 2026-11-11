#!/usr/bin/env node
// Kirim kabar ke tab KEDAS (+ push ke HP).
//   node scripts/kedas-update.mjs "Judul" "poin 1" "poin 2" [--tag=baru|perbaikan|info] [--no-push]
//   node scripts/kedas-update.mjs --hapus <id>
// Butuh KEDAS_ADMIN_SECRET (di .kedas-admin.env atau environment) dan VITE_SUPABASE_URL (di .env).
import { readFileSync } from 'node:fs';

const env = { ...process.env };
for (const f of ['.env', '.env.local', '.kedas-admin.env']) {
  try {
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { }
}
const base = (env.KEDAS_FUNCTIONS_URL || (env.VITE_SUPABASE_URL ? env.VITE_SUPABASE_URL.replace(/\/$/, '') + '/functions/v1' : ''));
const secret = env.KEDAS_ADMIN_SECRET;
if (!base || !secret) { console.error('Isi KEDAS_ADMIN_SECRET di .kedas-admin.env dan VITE_SUPABASE_URL di .env dulu.'); process.exit(1); }

const args = process.argv.slice(2);
let tag = 'baru', push = true, del = null;
const text = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--tag=')) tag = a.slice(6);
  else if (a === '--no-push') push = false;
  else if (a === '--hapus') del = args[++i];
  else text.push(a);
}
const body = del ? { action: 'delete', id: del } : { title: text[0], items: text.slice(1), tag, push };
if (!del && !text[0]) { console.error('Pakai: node scripts/kedas-update.mjs "Judul" "poin 1" "poin 2" [--tag=baru] [--no-push]'); process.exit(1); }

const res = await fetch(base + '/send-kedas-update', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify(body) });
const out = await res.json().catch(() => ({}));
if (!res.ok) { console.error('Gagal:', out.error || res.status); process.exit(1); }
if (del) console.log('Dihapus:', out.deleted);
else console.log(`Terkirim (id: ${out.id}).` + (out.push ? ` Push: ${out.sent}/${out.devices} perangkat${out.failed ? `, ${out.failed} gagal` : ''}.` : out.warning ? ' ' + out.warning : ' Tanpa push.'));
