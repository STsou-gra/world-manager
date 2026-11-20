import 'server-only';
import { after, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../supabase-admin';
import { bearerToken, hashToken } from './token';
import { BadRequestError, jsonError } from './responses';

// 外部 API（/api/ext/v1/*）の認証と認可を一本化する。
//  1. Authorization: Bearer <トークン> の SHA-256 で api_tokens を引く（無い・失効済みは 401）
//  2. トークンの持ち主（user_id）で絞り込むクライアント（UserScopedDb）だけを各 Route Handler に渡す
// service role は RLS を迂回するため、ここが認可の唯一の砦。Route Handler は getSupabaseAdmin() を直接使わないこと

/** 外部 API で読んでよいテーブル（すべて user_id 列を持つ） */
export type ScopedTable = 'characters' | 'worlds' | 'organizations';

function createScopedDb(admin: SupabaseClient, userId: string) {
  return {
    userId,
    /** user_id = トークンの持ち主 で絞り込んだ select */
    select: (table: ScopedTable, columns: string) => admin.from(table).select(columns).eq('user_id', userId),
  };
}

export type UserScopedDb = ReturnType<typeof createScopedDb>;

type Params = Record<string, string>;

export type ApiHandler<P extends Params> = (ctx: {
  request: NextRequest;
  db: UserScopedDb;
  params: P;
}) => Promise<Response>;

export function withApiUser<P extends Params = Params>(handler: ApiHandler<P>) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    try {
      const token = bearerToken(request.headers.get('authorization'));
      if (!token) return jsonError('UNAUTHORIZED', 'API トークンが必要です');

      const admin = getSupabaseAdmin();
      if (!admin) {
        console.error('[ext-api] SUPABASE_SERVICE_ROLE_KEY が設定されていません');
        return jsonError('INTERNAL_ERROR', 'サーバーの設定が不足しています');
      }

      const { data, error } = await admin
        .from('api_tokens')
        .select('id, user_id, revoked_at')
        .eq('token_hash', hashToken(token))
        .maybeSingle();
      if (error) {
        console.error('[ext-api] token lookup failed:', error.message);
        return jsonError('INTERNAL_ERROR', 'トークンを確認できませんでした');
      }
      const row = data as { id: string; user_id: string | null; revoked_at: string | null } | null;
      if (!row || row.revoked_at !== null || !row.user_id) {
        return jsonError('UNAUTHORIZED', 'API トークンが無効です');
      }

      // 最終使用日時は応答の後に更新する（失敗しても応答には影響させない）
      const tokenId = row.id;
      after(async () => {
        const { error: updateError } = await admin
          .from('api_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', tokenId);
        if (updateError) console.error('[ext-api] last_used_at update failed:', updateError.message);
      });

      return await handler({ request, db: createScopedDb(admin, row.user_id), params: await context.params });
    } catch (e) {
      if (e instanceof BadRequestError) return jsonError('BAD_REQUEST', e.message);
      console.error('[ext-api] unexpected error:', e);
      return jsonError('INTERNAL_ERROR', 'サーバーでエラーが発生しました');
    }
  };
}
