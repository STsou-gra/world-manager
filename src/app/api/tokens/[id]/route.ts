import type { NextRequest } from 'next/server';
import { isUuid } from '../../../../lib/ext-api/query';
import { getSessionClient, isSameOrigin, sessionError, sessionJson } from '../../../../lib/ext-api/session';

// 外部連携用 API トークンの失効（revoked_at を設定する。行は残す）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return sessionError(403, '不正な要求です');
  const supabase = await getSessionClient();
  if (!supabase) return sessionError(401, 'ログインしてください');
  const { id } = await params;
  if (!isUuid(id)) return sessionError(404, 'トークンが見つかりません');

  const { data, error } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
    .select('id');
  if (error) {
    console.error('api_tokens revoke error:', error.message);
    return sessionError(500, 'トークンを失効できませんでした');
  }
  if (!data || data.length === 0) return sessionError(404, 'トークンが見つからないか、すでに失効しています');
  return sessionJson({ ok: true });
}
