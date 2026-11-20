import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { targetUrl, targetKey } from './lib/supabase-config';
import { safeNextPath } from './lib/safeNextPath';

// ログインしなくても開けるページ
// /api/ext は外部連携 API。Cookie のログインではなく API トークンで認証する（src/lib/ext-api/with-api-user.ts）
const PUBLIC_PATHS = ['/login', '/auth', '/api/ext'];

// Cookie のセッションを使わないパス（ログイン状態の確認・更新の問い合わせも省く）
const TOKEN_AUTH_PATHS = ['/api/ext'];

const matchesPath = (pathname: string, paths: readonly string[]) =>
  paths.some(p => pathname === p || pathname.startsWith(`${p}/`));

// すべてのページの前に実行され、未ログインならログイン画面へ移動させる。
// ログインの有効期限が近い場合は、ここで自動更新される
export async function proxy(request: NextRequest) {
  if (matchesPath(request.nextUrl.pathname, TOKEN_AUTH_PATHS)) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(targetUrl, targetKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = matchesPath(pathname, PUBLIC_PATHS);

  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    // 更新・削除されたログイン情報の cookie を引き継ぐ
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return redirectTo(url);
  }

  // ログイン済みでログイン画面を開いた場合は、本来の行き先へ
  if (user && pathname === '/login') {
    return redirectTo(new URL(safeNextPath(request.nextUrl.searchParams.get('next')), request.url));
  }

  return response;
}

export const config = {
  // 画像・JS・CSS などの静的ファイルには実行しない
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
