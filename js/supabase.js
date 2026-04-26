import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─────────────────────────────────────────────────────────────
// This file is overwritten at Vercel build time by
// scripts/inject-config.js (reads SUPABASE_URL + SUPABASE_ANON_KEY).
//
// The URL below is hardcoded because it is public and known.
// The anon key is intentionally left as a placeholder so the
// admin panel shows a configuration prompt on first use.
// ─────────────────────────────────────────────────────────────
export const SUPABASE_URL  = 'https://yzpistceuhpcooyfgdvb.supabase.co';
export const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false
  }
});
