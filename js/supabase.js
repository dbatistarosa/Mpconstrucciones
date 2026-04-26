import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─────────────────────────────────────────────────────────────
// This file is overwritten at Vercel build time by:
//   scripts/inject-config.js  (reads SUPABASE_URL + SUPABASE_ANON_KEY env vars)
//
// For local development, paste your credentials in Settings tab
// inside the Admin panel (stored in localStorage, never in code).
// ─────────────────────────────────────────────────────────────
export const SUPABASE_URL  = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false
  }
});
