import type { NextRequest } from 'next/server';
import {
  displayPrefix,
  generateToken,
  hashToken,
  TOKEN_NAME_MAX_LENGTH,
} from '../../../lib/ext-api/token';
import { getSessionClient, isSameOrigin, sessionError, sessionJson } from '../../../lib/ext-api/session';

// 外部連携用 API トークンの一覧・発行（ログイン中の本人のみ。RLS の下で読み書きする）

const LIST_COLUMNS = 'id, name, token_prefix, created_at, last_used_at, revoked_at';

export async function GET() {
  const supabase = await getSessionClient();
  if (!supabase) return sessionError(401, 'ログインしてください');
  const { data, error } = await supabase
    .from('api_tokens')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('api_tokens list error:', error.message);
    return sessionError(500, 'トークンの一覧を読み込めませんでした（マイグレーションを確認してください）');
  }
  return sessionJson({ data: data ?? [] });
}

/** 発行: { name } → 平文のトークンを 1 回だけ返す */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return sessionError(403, '不正な要求です');
  const supabase = await getSessionClient();
  if (!supabase) return sessionError(401, 'ログインしてください');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sessionError(400, 'リクエストの形式が不正です');
  }
  const rawName = body !== null && typeof body === 'object' ? (body as { name?: unknown }).name : undefined;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (name === '') return sessionError(400, '名前を入力してください');
  if ([...name].length > TOKEN_NAME_MAX_LENGTH) {
    return sessionError(400, `名前は ${TOKEN_NAME_MAX_LENGTH} 文字以内にしてください`);
  }

  const token = generateToken();
  const { data, error } = await supabase
    .from('api_tokens')
    .insert({ name, token_hash: hashToken(token), token_prefix: displayPrefix(token) })
    .select(LIST_COLUMNS)
    .single();
  if (error || !data) {
    console.error('api_tokens insert error:', error?.message);
    return sessionError(500, 'トークンを発行できませんでした');
  }
  return sessionJson({ token, data }, 201);
}
