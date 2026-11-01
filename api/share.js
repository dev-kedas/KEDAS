// Vercel: /s/:type/:code  ->  /api/share  (lihat vercel.json)
import { buildShare, CACHE } from '../server/share-core.js';

export default async function handler(req, res) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0];
  const { html } = await buildShare({
    origin: `${proto}://${host}`,
    type: String(req.query.type || ''),
    code: String(req.query.code || ''),
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', CACHE);
  res.status(200).send(html);
}
