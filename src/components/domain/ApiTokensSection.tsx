'use client';
import { useCallback, useEffect, useState } from 'react';

// 設定画面の「外部連携（API トークン）」欄。発行したトークンの平文はこの画面で 1 回だけ表示する
// （サーバーには SHA-256 しか保存しないため、閉じると二度と表示できない）

type ApiToken = {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('ja-JP') : '—');

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error?.message === 'string' ? body.error.message : fallback;
  } catch {
    return fallback;
  }
}

export default function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState('Story-Manager');
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 一覧の再読み込みは version を進めて行う（effect の中では非同期の結果を受けてから state を変える）
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tokens', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setMessage(await readError(res, 'トークンの一覧を読み込めませんでした'));
          return;
        }
        const body = await res.json();
        if (!cancelled) setTokens(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setMessage('トークンの一覧を読み込めませんでした');
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const issue = async () => {
    setMessage(null);
    setIssued(null);
    setCopied(false);
    if (name.trim() === '') {
      setMessage('名前（用途のメモ）を入力してください');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setMessage(await readError(res, 'トークンを発行できませんでした'));
        return;
      }
      const body = await res.json();
      setIssued(typeof body?.token === 'string' ? body.token : null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (token: ApiToken) => {
    if (!confirm(`「${token.name}」（${token.token_prefix}…）を失効させますか？\nこのトークンを使っているアプリからは読めなくなります。`)) return;
    setMessage(null);
    const res = await fetch(`/api/tokens/${encodeURIComponent(token.id)}`, { method: 'DELETE' });
    if (!res.ok) setMessage(await readError(res, 'トークンを失効できませんでした'));
    reload();
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
    } catch {
      setMessage('コピーできませんでした。表示されているトークンを選択してコピーしてください');
    }
  };

  return (
    <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
      <h2 className="text-amber-400 font-bold mb-2">外部連携（API トークン）</h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Story-Manager などの外部アプリが、あなたのキャラクター・世界観・組織を読み取るためのトークンです（読み取り専用）。
        発行したトークンは、外部アプリのサーバーの環境変数（Story-Manager なら <code className="text-slate-300">EXT_WORLDMANAGER_API_TOKEN</code>）に設定します。
      </p>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-white"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="用途のメモ（例: Story-Manager）"
          aria-label="トークンの名前"
        />
        <button
          onClick={issue}
          disabled={busy}
          className="bg-amber-600 disabled:opacity-50 px-6 py-2 rounded-xl font-bold text-white"
        >
          発行
        </button>
      </div>

      {issued && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-2">
          <p className="text-xs text-amber-300 font-bold">
            このトークンは今だけ表示されます。必ずコピーして保管してください（閉じると再表示できません）。
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 break-all text-sm text-white bg-slate-900 rounded-lg px-3 py-2 select-all">{issued}</code>
            <button onClick={copy} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-xs font-bold text-white">
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <button onClick={() => setIssued(null)} className="text-[10px] text-slate-400 hover:text-white">
            閉じる
          </button>
        </div>
      )}

      {message && <p className="mb-4 text-xs text-rose-400">{message}</p>}

      {tokens.length === 0 ? (
        <p className="text-xs text-slate-500">発行済みのトークンはありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[10px] text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-4">名前</th>
                <th className="py-2 pr-4">トークン</th>
                <th className="py-2 pr-4">作成日時</th>
                <th className="py-2 pr-4">最終使用日時</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className={`border-t border-slate-700/50 ${t.revoked_at ? 'opacity-50' : ''}`}>
                  <td className="py-2 pr-4">{t.name}</td>
                  <td className="py-2 pr-4 font-mono">{t.token_prefix}…</td>
                  <td className="py-2 pr-4">{formatDate(t.created_at)}</td>
                  <td className="py-2 pr-4">{formatDate(t.last_used_at)}</td>
                  <td className="py-2 text-right">
                    {t.revoked_at ? (
                      <span className="text-slate-500">失効済み（{formatDate(t.revoked_at)}）</span>
                    ) : (
                      <button onClick={() => revoke(t)} className="text-rose-400 hover:text-rose-300 font-bold">
                        失効
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
