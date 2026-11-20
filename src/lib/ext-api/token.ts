import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

// 外部連携用の個人 API トークン（wmpat_ + 32 バイトの乱数の base64url）。
// 平文は発行時に 1 回だけ返し、DB には SHA-256（16 進）と先頭 12 文字だけを保存する

export const TOKEN_PREFIX = 'wmpat_';
/** 一覧表示用に保存する先頭の文字数 */
export const TOKEN_DISPLAY_PREFIX_LENGTH = 12;
/** トークンの名前（用途のメモ）の最大文字数 */
export const TOKEN_NAME_MAX_LENGTH = 100;

export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function displayPrefix(token: string): string {
  return token.slice(0, TOKEN_DISPLAY_PREFIX_LENGTH);
}

/** Authorization: Bearer <トークン> からトークンを取り出す（形式が違えば null） */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1];
  return token && token.startsWith(TOKEN_PREFIX) ? token : null;
}
