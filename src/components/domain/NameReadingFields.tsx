'use client';
import { useState, type KeyboardEvent } from 'react';
import { ALIAS_MAX_COUNT, ALIAS_MAX_LENGTH, KANA_MAX_LENGTH, charLength } from '../../lib/characterNames';

// キャラクターの「読み（ふりがな）」と「別名・愛称」の入力欄（作成・編集画面で共通）。
// 別名は Enter で追加・× で削除する。保存時の整え方・検証は lib/characterNames.ts

type Props = {
  kana: string;
  onKanaChange: (value: string) => void;
  aliases: string[];
  onAliasesChange: (value: string[]) => void;
};

export default function NameReadingFields({ kana, onKanaChange, aliases, onAliasesChange }: Props) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const addAlias = () => {
    const value = draft.trim();
    if (value === '') return;
    if (aliases.includes(value)) {
      setHint('同じ別名がすでにあります');
      return;
    }
    if (charLength(value) > ALIAS_MAX_LENGTH) {
      setHint(`別名は 1 つ ${ALIAS_MAX_LENGTH} 文字以内にしてください`);
      return;
    }
    if (aliases.length >= ALIAS_MAX_COUNT) {
      setHint(`別名は ${ALIAS_MAX_COUNT} 個までです`);
      return;
    }
    onAliasesChange([...aliases, value]);
    setDraft('');
    setHint(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // IME の変換確定の Enter では追加しない
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      addAlias();
    }
  };

  const kanaTooLong = charLength(kana.trim()) > KANA_MAX_LENGTH;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label htmlFor="character-kana" className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">
          読み（ふりがな）
        </label>
        <input
          id="character-kana"
          className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white w-full outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
          placeholder="例: ほしの ひかり"
          value={kana}
          onChange={(e) => onKanaChange(e.target.value)}
        />
        {kanaTooLong && <p className="mt-1 text-[10px] text-rose-400">読みは {KANA_MAX_LENGTH} 文字以内にしてください</p>}
      </div>
      <div>
        <label htmlFor="character-alias" className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">
          別名・愛称（Enter で追加）
        </label>
        <div className="flex gap-2">
          <input
            id="character-alias"
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
            placeholder="例: ひーちゃん"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setHint(null);
            }}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            onClick={addAlias}
            className="text-[10px] bg-slate-800 text-slate-300 px-3 rounded-xl border border-slate-700 hover:bg-slate-700"
          >
            追加
          </button>
        </div>
        {hint && <p className="mt-1 text-[10px] text-rose-400">{hint}</p>}
        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {aliases.map((alias) => (
              <span
                key={alias}
                className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-300 border border-blue-500/30 pl-3 pr-1 py-0.5 rounded-full"
              >
                {alias}
                <button
                  type="button"
                  onClick={() => onAliasesChange(aliases.filter((a) => a !== alias))}
                  className="w-5 h-5 rounded-full hover:bg-blue-500/20 text-blue-300"
                  aria-label={`別名「${alias}」を削除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
