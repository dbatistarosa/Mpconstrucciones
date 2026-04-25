import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─────────────────────────────────────────────────────────────
// Fill in your credentials from:
// Supabase Dashboard → Settings → API
// ─────────────────────────────────────────────────────────────
export const SUPABASE_URL  = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
