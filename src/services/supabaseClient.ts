import { createClient } from '@supabase/supabase-js';

// Normalize URL: ensure we pass the API root without trailing slashes or /rest/v1
function normalizeUrl(raw?: string): string {
  if (!raw) return '' as unknown as string;
  let u = String(raw).trim();
  // strip whitespace
  u = u.replace(/\s+/g, '');
  // remove any trailing /rest/v1 (with or without trailing slash)
  u = u.replace(/\/?rest\/v1\/?$/i, '');
  // remove trailing slashes
  u = u.replace(/\/+$/g, '');
  return u;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseUrl = normalizeUrl(rawUrl);
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const hasBackend = !!(supabaseUrl && supabaseAnonKey);

// Helpful console hint in case of common misconfig
if (rawUrl && /\/rest\/v1/i.test(rawUrl)) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] VITE_SUPABASE_URL should be the API root without /rest/v1. Normalized to:', supabaseUrl);
}
