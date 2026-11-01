// Netlify: /s/:type/:code (path diatur di config di bawah, tanpa netlify.toml)
import { buildShare, CACHE } from '../../server/share-core.js';

export default async (req, context) => {
  const u = new URL(req.url);
  const { html } = await buildShare({
    origin: u.origin,
    type: (context.params && context.params.type) || '',
    code: (context.params && context.params.code) || '',
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE } });
};

export const config = { path: '/s/:type/:code' };
