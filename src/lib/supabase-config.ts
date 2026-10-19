// Supabase の接続設定（ブラウザ用・サーバー用のクライアントで共通）

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

// URLが未設定の際のフォールバック用（エラー検出を容易にする）
export const targetUrl = supabaseUrl || 'https://invalid-supabase-url.local';
export const targetKey = supabaseAnonKey || 'invalid-anon-key';
