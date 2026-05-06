'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('worlds').select(`*, organizations(id, name)`);
    setWorlds(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkDelete = async () => {
    if (!confirm(`${selectedIds.length}個の世界観を削除しますか？付随する組織設定も影響を受けます。`)) return;
    const { error } = await supabase.from('worlds').delete().in('id', selectedIds);
    if (!error) {
      setSelectedIds([]);
      setIsSelectMode(false);
      fetch();
    }
  };

  return (
    <div className="space-y-10 pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">World_Layers</h1>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">
            {isSelectMode ? `${selectedIds.length}件を選択中` : '世界観・舞台設定'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-xl font-bold text-[10px] transition-all uppercase tracking-widest ${isSelectMode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
          >
            {isSelectMode ? '解除' : '複数選択'}
          </button>
          {!isSelectMode && (
            <Link href="/worlds/new" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs">+ 新規世界作成</Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {worlds.map(w => {
          const isSelected = selectedIds.includes(w.id);
          return (
            <div 
              key={w.id} 
              onClick={() => isSelectMode && toggleSelect(w.id)}
              className={`bg-slate-800/30 border rounded-[2.5rem] p-10 relative transition-all duration-300 ${isSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-blue-500 bg-blue-500/10 scale-[0.98]' : 'border-slate-700'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">{w.name}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">{w.description || "説明なし"}</p>
                </div>
                
                {/* 選択モードでない時だけ編集ボタンを表示 */}
                {!isSelectMode && (
                  <Link href={`/worlds/edit/${w.id}`} className="text-[10px] font-black bg-slate-700 hover:bg-blue-600 px-4 py-2 rounded-full transition-colors uppercase">
                    設定を編集
                  </Link>
                )}

                {/* 選択モード時のチェックマーク */}
                {isSelectMode && (
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'}`}>
                    {isSelected && '✓'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-10 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5">
          <span className="text-white font-bold text-sm">{selectedIds.length}件を選択中</span>
          <button onClick={bulkDelete} className="text-red-500 hover:text-white text-xs font-black uppercase transition-colors">一括削除を実行</button>
        </div>
      )}
    </div>
  );
}