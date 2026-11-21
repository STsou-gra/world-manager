import 'server-only';
import { BadRequestError } from './responses';

// 一覧のクエリ（ids、または cursor + limit）の検証

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 200;
export const MAX_IDS = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export type ListQuery =
  | { kind: 'ids'; ids: string[] }
  | { kind: 'page'; offset: number; limit: number };

export function parseListQuery(params: URLSearchParams): ListQuery {
  const limitRaw = params.get('limit');
  const cursorRaw = params.get('cursor');
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    if (!/^\d+$/.test(limitRaw)) throw new BadRequestError('limit は 1〜200 の整数で指定してください');
    limit = Number(limitRaw);
    if (limit < 1 || limit > MAX_LIMIT) throw new BadRequestError('limit は 1〜200 の整数で指定してください');
  }
  let offset = 0;
  if (cursorRaw !== null) {
    if (!/^\d{1,9}$/.test(cursorRaw)) throw new BadRequestError('cursor が不正です');
    offset = Number(cursorRaw);
  }
  const ids = params.getAll('ids');
  if (ids.length > 0) {
    if (ids.length > MAX_IDS) throw new BadRequestError(`ids は ${MAX_IDS} 件以内で指定してください`);
    // UUID でない ID は存在しないものとして扱う（DB の型エラーにしない）
    return { kind: 'ids', ids: [...new Set(ids.filter(isUuid))] };
  }
  return { kind: 'page', offset, limit };
}
