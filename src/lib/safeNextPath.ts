// ログイン後の移動先。外部サイトへ飛ばされないよう、サイト内のパスだけ受け付ける
export function safeNextPath(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
