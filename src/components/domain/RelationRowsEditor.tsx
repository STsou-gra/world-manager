// src/components/domain/RelationRowsEditor.tsx
import { RelationRow } from '../../lib/relationRows';

// Tailwind が検出できるよう、クラス名は完全な文字列で持つ
const THEMES = {
  amber: {
    title: 'text-amber-400',
    addButton: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500',
    focus: 'focus:border-amber-500',
    nameText: 'text-amber-300',
  },
  rose: {
    title: 'text-rose-400',
    addButton: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500',
    focus: 'focus:border-rose-500',
    nameText: 'text-rose-300',
  },
};

// 「相手 + 関係名」の行を追加・編集・削除する入力欄
export default function RelationRowsEditor({
  title,
  description,
  theme,
  targetLabel,
  targetPlaceholder,
  namePlaceholder,
  emptyMessage,
  options,
  rows,
  onChange,
}: {
  title: string;
  description: string;
  theme: keyof typeof THEMES;
  targetLabel: string;
  targetPlaceholder: string;
  namePlaceholder: string;
  emptyMessage: string;
  options: { id: string; name: string }[];
  rows: RelationRow[];
  onChange: (rows: RelationRow[]) => void;
}) {
  const t = THEMES[theme];

  const updateRow = (idx: number, patch: Partial<RelationRow>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <section className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h3 className={`text-xs font-black uppercase tracking-widest ${t.title}`}>{title}</h3>
          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...rows, { target_id: '', relation_name: '' }])}
          className={`text-[9px] px-3 py-1.5 rounded-full border hover:text-white transition-all font-bold shrink-0 ${t.addButton}`}
        >
          + 関係を追加
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-2xl">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => (
            <div key={row.id ?? `new-${idx}`} className="flex flex-wrap items-center gap-3 bg-slate-800/10 p-4 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-black">{targetLabel}</span>
                <select
                  aria-label={targetLabel}
                  className={`bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none ${t.focus}`}
                  value={row.target_id}
                  onChange={e => updateRow(idx, { target_id: e.target.value })}
                >
                  <option value="">{targetPlaceholder}</option>
                  {options.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                <span className="text-[10px] text-slate-500 uppercase font-black">関係性</span>
                <input
                  type="text"
                  aria-label="関係性"
                  placeholder={namePlaceholder}
                  className={`flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none ${t.nameText} ${t.focus}`}
                  value={row.relation_name}
                  onChange={e => updateRow(idx, { relation_name: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                className="text-[10px] text-red-500/50 hover:text-red-500 font-bold px-2 py-1"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
