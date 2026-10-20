// src/components/domain/UserMenu.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ログイン中のメールアドレスとログアウトボタン（未ログインなら何も表示しない）
export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ログイン状態が変わったときは、意図的にページ全体を読み込み直す（理由は login/page.tsx の goTo を参照）
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  };

  if (!email) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-500 font-mono max-w-40 truncate" title={email}>{email}</span>
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all"
      >
        ログアウト
      </button>
    </div>
  );
}
