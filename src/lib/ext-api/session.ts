import 'server-only';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '../supabase-server';

// トークンの管理（/api/tokens）用: ログイン中の Cookie セッションの Supabase クライアント（RLS の下で読み書きする）

const NO_STORE = { 'Cache-Control': 'no-store' };

export function sessionJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function sessionError(status: number, message: string): Response {
  return Response.json({ error: { message } }, { status, headers: NO_STORE });
}

/** 書き込みの要求が同じオリジンの画面から来たか（Cookie を使う API の CSRF 対策） */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // ブラウザは POST / DELETE に Origin を付ける。無い要求（ブラウザ以外）は Cookie を持たないため通す
  return origin === null || origin === request.nextUrl.origin;
}

/** ログイン中のユーザーのクライアント。未ログインなら null */
export async function getSessionClient() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}
