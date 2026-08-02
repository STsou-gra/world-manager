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

  // フィルター用のState
  const [worlds, setWorlds] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedFilterWorldId, setSelectedFilterWorldId] = useState<string>('');
  const [selectedFilterOrgId, setSelectedFilterOrgId] = useState<string>('');

  const fetchData = async () => {
    const [charsRes, worldsRes, orgsRes] = await Promise.all([
      supabase.from('characters').select(`
        *,
        worlds:character_worlds(worlds(*)),
        organizations:character_organizations(organizations(*))
      `),
      supabase.from('worlds').select('*'),
      supabase.from('organizations').select('*')
    ]);

    if (charsRes.data) {
      setCharacters(charsRes.data.map((c: any) => ({
        ...c,
        worlds: c.worlds.map((w: any) => w.worlds).filter(Boolean),
        organizations: c.organizations.map((o: any) => o.organizations).filter(Boolean)
      })));
    }
    setWorlds(worldsRes.data || []);
    setOrganizations(orgsRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

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
      fetchData();
    }
  };

  // 選択された世界観に属する組織のみに絞り込む（連動）
  const displayOrgs = selectedFilterWorldId
    ? organizations.filter(org => org.world_id === selectedFilterWorldId)
    : organizations;

  // フィルター条件に基づいてキャラクターを絞り込む
  const filteredCharacters = characters.filter(char => {
    // 世界観フィルター
    if (selectedFilterWorldId) {
      const hasWorld = char.worlds?.some((w: any) => w.id === selectedFilterWorldId);
      if (!hasWorld) return false;
    }
    // 組織フィルター
    if (selectedFilterOrgId) {
      const hasOrg = char.organizations?.some((o: any) => o.id === selectedFilterOrgId);
      if (!hasOrg) return false;
    }
    return true;
  });

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

      {/* 連動フィルターセクション */}
      <div className="flex flex-wrap gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">世界観フィルター</label>
          <select
            value={selectedFilterWorldId}
            onChange={e => {
              setSelectedFilterWorldId(e.target.value);
              setSelectedFilterOrgId(''); // 世界観が変わったら組織選択をクリア
            }}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 w-60 transition-all cursor-pointer font-bold"
          >
            <option value="">すべての世界観</option>
            {worlds.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">所属組織フィルター</label>
          <select
            value={selectedFilterOrgId}
            onChange={e => setSelectedFilterOrgId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 w-60 transition-all cursor-pointer font-bold"
          >
            <option value="">すべての組織</option>
            {displayOrgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {(selectedFilterWorldId || selectedFilterOrgId) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedFilterWorldId('');
                setSelectedFilterOrgId('');
              }}
              className="text-[10px] text-red-500/70 hover:text-red-500 font-bold uppercase py-3 px-4 hover:bg-red-500/10 rounded-2xl transition-all"
            >
              フィルター解除
            </button>
          </div>
        )}
      </div>

      {/* キャラクターグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCharacters.map(char => {
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