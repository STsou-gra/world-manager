import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { targetUrl, targetKey } from './supabase-config';

// Route Handler 用のクライアント。リクエストごとに作り直すこと
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(targetUrl, targetKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
