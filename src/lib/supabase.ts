import { createClient } from '@supabase/supabase-js';

// 本来は .env.local から読み込みますが、まずは形を作ります
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 【デバッグ用】値が空っぽでないか確認
console.log('Connecting to Supabase at:', supabaseUrl);
if (supabaseAnonKey.length > 0) {
  console.log('API Key exists (length):', supabaseAnonKey.length);
} else {
  console.error('API Key is EMPTY!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export interface Character {
  id: string;
  name: string;
  gender: string;
  world_id: string;
  stats: {
    attack: number;
    defense: number;
    // 必要に応じて追加
  };
  created_at?: string;
}