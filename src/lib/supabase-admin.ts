import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase-config';

// service role（RLS を迂回する特権キー）のクライアント。サーバー専用。
// ⚠ ブラウザに出さないこと（NEXT_PUBLIC_ を付けない）。
// ⚠ RLS が効かないため、外部 API ではすべてのクエリを user_id で絞る（src/lib/ext-api/with-api-user.ts に一本化）

let cached: SupabaseClient | null = null;

/** SUPABASE_SERVICE_ROLE_KEY が無ければ null */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !key) return null;
  cached = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
