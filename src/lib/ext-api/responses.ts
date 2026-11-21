import 'server-only';

// 外部 API（/api/ext/v1/*）の応答。キャッシュさせない（Cache-Control: no-store）

export type ApiErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_ERROR';

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
};

const NO_STORE = { 'Cache-Control': 'no-store' };

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status: STATUS[code], headers: NO_STORE });
}

/** クエリの検証エラー */
export class BadRequestError extends Error {}
