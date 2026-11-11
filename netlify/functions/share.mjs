import { buildShare, CACHE } from '../../server/share-core.js';

export default async (req, context) => {
  const u = new URL(req.url);
  const { html } = await buildShare({
    origin: u.origin,
    type: (context.params && context.params.type) || '',
    code: (context.params && context.params.code) || '',
    photo: (context.params && context.params.photo) || '',
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE } });
};

export const config = { path: ['/s/:type/:code', '/s/:type/:code/:photo'] };
