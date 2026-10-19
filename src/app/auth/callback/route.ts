import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '../../../lib/supabase-server';

// 確認メールのリンクから戻ってきたときに、ログイン状態にしてトップへ移動する
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
    console.error('Auth callback error:', error);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
