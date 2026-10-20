// src/app/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getSupabaseConfigStatus } from '../../lib/supabase';
import { safeNextPath } from '../../lib/safeNextPath';

// 新規登録ボタンを出すかどうか。自分専用なら未設定のままにし、Supabase 側でも新規登録をオフにする
const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === 'true';

// よく出る認証エラーを日本語にする
function translateAuthError(message: string) {
  if (message.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが違います。';
  if (message.includes('Email not confirmed')) return 'メールアドレスの確認が済んでいません。届いた確認メールのリンクを開いてください。';
  if (message.includes('User already registered')) return 'このメールアドレスはすでに登録されています。ログインしてください。';
  if (message.includes('Password should be at least')) return 'パスワードは6文字以上にしてください。';
  if (message.includes('rate limit')) return '短時間に試行しすぎました。しばらく待ってからもう一度お試しください。';
  if (message.includes('Signups not allowed')) return '新規登録は受け付けていません。';
  return message;
}

// ログイン状態が変わったときは、意図的にページ全体を読み込み直す。
// それまでの先読み（未ログイン時は「ログイン画面への転送」）が使えなくなるが、
// router.refresh() では今のページのキャッシュしか消えず、先読みの通信が 404 エラーになるため
function goTo(path: string) {
  window.location.assign(path);
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    searchParams.get('error') === 'confirm'
      ? 'ログイン状態にできませんでした。メールアドレスの確認が済んでいれば、そのままログインできます。'
      : ''
  );
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!getSupabaseConfigStatus().isConfigured) {
      setError('Supabase の接続設定が読み込まれていません。.env.local を確認し、開発サーバーを再起動してください。');
      return;
    }

    setSubmitting(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setSubmitting(false);
      if (error) {
        setError(translateAuthError(error.message));
        return;
      }
      goTo(safeNextPath(searchParams.get('next')));
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSubmitting(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    if (data.session) {
      // メール確認が不要な設定の場合は、そのままログイン状態になる
      goTo('/');
      return;
    }
    setMessage('確認メールを送信しました。メール内のリンクを開くと登録が完了します。');
  };

  const isLogin = mode === 'login';

  return (
    <div className="max-w-md mx-auto mt-10 bg-slate-800/20 p-10 rounded-[2.5rem] border border-slate-700 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">{isLogin ? 'Login' : 'Sign Up'}</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{isLogin ? 'ログイン' : '新規登録'}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">メールアドレス</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">パスワード</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
            placeholder="6文字以上"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-2xl p-3">{error}</p>}
        {message && <p role="status" className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">{message}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all shadow-xl disabled:opacity-50"
        >
          {submitting ? '処理中...' : isLogin ? 'ログイン' : '登録する'}
        </button>
      </form>

      {allowSignup && (
        <button
          type="button"
          onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(''); setMessage(''); }}
          className="w-full text-xs text-slate-500 hover:text-white transition-all"
        >
          {isLogin ? 'アカウントをお持ちでない方は新規登録' : 'すでにアカウントをお持ちの方はログイン'}
        </button>
      )}
    </div>
  );
}
