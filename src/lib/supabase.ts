import { createClient } from '@supabase/supabase-js';

// URLの末尾スラッシュを自動削除してパス重複エラーを防止
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseUrl = rawUrl.trim().replace(/\/+$/, '');

export const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  ''
).trim();

// 接続設定の状態を診断するヘルパー関数
export function getSupabaseConfigStatus() {
  const isUrlValid = Boolean(supabaseUrl && supabaseUrl.startsWith('http'));
  const isKeyValid = Boolean(supabaseAnonKey && supabaseAnonKey.length > 10);
  return {
    isConfigured: isUrlValid && isKeyValid,
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : '未設定(空)',
    hasAnonKey: isKeyValid,
  };
}

// デバッグ用ログ
if (typeof window !== 'undefined') {
  const status = getSupabaseConfigStatus();
  if (!status.isConfigured) {
    console.warn('[Supabase Config Alert]', status);
  }
}

// URLが未設定の際のフォールバック用（エラー検出を容易にする）
const targetUrl = supabaseUrl || 'https://invalid-supabase-url.local';
const targetKey = supabaseAnonKey || 'invalid-anon-key';

export const supabase = createClient(targetUrl, targetKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

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