// src/app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import CharacterCard from '../components/domain/CharacterCard';
import Link from 'next/link';

export default function CharacterListPage() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // 選択中のID
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('characters').select(`
      *,
      worlds:character_worlds(worlds(*)),
      organizations:character_organizations(organizations(*))
    `);
    if (data) {
      setCharacters(data.map((c: any) => ({
        ...c,
        worlds: c.worlds.map((w: any) => w.worlds),
        organizations: c.organizations.map((o: any) => o.organizations)
      })));
    }
  };

  useEffect(() => { fetch(); }, []);

  // 選択の切り替え
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 一括削除
  const bulkDelete = async () => {
    if (!confirm(`${selectedIds.length}体のキャラクターを完全に削除しますか？`)) return;
    const { error } = await supabase.from('characters').delete().in('id', selectedIds);
    if (!error) {
      setSelectedIds([]);
      setIsSelectMode(false);
      fetch();
    }
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Units</h1>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">
            {isSelectMode ? `${selectedIds.length}体を選択中` : 'キャラクター管理'}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
            className={`px-6 py-3 rounded-full font-bold text-xs transition-all ${isSelectMode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            {isSelectMode ? 'キャンセル' : '複数選択'}
          </button>
          {!isSelectMode && (
            <Link href="/new" className="bg-white text-black hover:bg-blue-600 hover:text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg">+ 新規作成</Link>
          )}
        </div>
      </header>

      {/* キャラクターグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {characters.map(char => {
          const isSelected = selectedIds.includes(char.id);
          return (
            <div 
              key={char.id} 
              onClick={() => isSelectMode && toggleSelect(char.id)}
              className={`relative transition-all duration-300 ${isSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'scale-95' : ''}`}
            >
              {/* 選択時のオーバーレイ */}
              {isSelectMode && (
                <div className={`absolute inset-0 z-20 rounded-[2.5rem] border-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-black/20'}`}>
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/50'}`}>
                    {isSelected && '✓'}
                  </div>
                </div>
              )}
              <CharacterCard character={char} />
            </div>
          );
        })}
      </div>

      {/* 下部の一括操作ツールバー（選択モード時のみ表示） */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 px-8 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-8 animate-in slide-in-from-bottom-10">
          <span className="text-white font-bold text-sm">{selectedIds.length}体を選択中</span>
          
          <div className="h-8 w-[1px] bg-slate-700" />
          
          <div className="flex gap-4">
            {/* ここに「一括タグ付け」ボタンなどを追加可能 */}
            <button 
              onClick={() => alert('一括タグ付け機能は、中間テーブルへの一括Insert処理として実装可能です')}
              className="text-blue-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
            >
              タグを追加
            </button>
            
            <button 
              onClick={bulkDelete}
              className="text-red-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
            >
              一括削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}