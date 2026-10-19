import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfigStatus, targetUrl, targetKey } from './supabase-config';

export { supabaseUrl, supabaseAnonKey, getSupabaseConfigStatus } from './supabase-config';

// デバッグ用ログ
if (typeof window !== 'undefined') {
  const status = getSupabaseConfigStatus();
  if (!status.isConfigured) {
    console.warn('[Supabase Config Alert]', status);
  }
}

// ブラウザ用クライアント。ログイン状態を cookie に保存するので、
// proxy.ts（サーバー側）からもログインしているかを確認できる
export const supabase = createBrowserClient(targetUrl, targetKey);

export interface Character {
  id: string;
  name: string;
  gender: string;
  world_id: string;
  stats: {
    attack: number;
    defense: number;
  };
  created_at?: string;
}
