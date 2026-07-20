// src/app/organizations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('organizations').select('*, worlds(name), character_organizations(character_id)');
    setOrgs(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkDelete = async () => {
    if (!confirm(`${selectedIds.length}個の組織を解体しますか？`)) return;
    const { error } = await supabase.from('organizations').delete().in('id', selectedIds);
    if (!error) {
      setSelectedIds([]);
      setIsSelectMode(false);
      fetch();
    }
  };

  // descriptionを安全に表示用プロパティへ変換
  const getOrgDescDetails = (description: string) => {
    if (!description) return { summary: '説明なし', history: '' };
    try {
      const parsed = JSON.parse(description);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          summary: parsed.summary || '説明なし',
          history: parsed.history || ''
        };
      }
    } catch (e) {
      // JSONでない文字列の場合
    }
    return { summary: description, history: '' };
  };

  return (
    <div className="space-y-10 pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Org_Unit_DB</h1>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">
            {isSelectMode ? `${selectedIds.length}件を選択中` : '組織・勢力データベース'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest ${isSelectMode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
          >
            {isSelectMode ? '解除' : '複数選択'}
          </button>
          {!isSelectMode && (
            <Link href="/organizations/new" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-xs">+ 新規組織登録</Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orgs.map(o => {
          const isSelected = selectedIds.includes(o.id);
          const details = getOrgDescDetails(o.description);
          const memberCount = o.character_organizations?.length || 0;

          return (
            <div 
              key={o.id} 
              onClick={() => isSelectMode && toggleSelect(o.id)}
              className={`bg-slate-800/40 border p-8 rounded-3xl relative transition-all duration-300 flex flex-col justify-between ${isSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-emerald-500 bg-emerald-500/10 scale-95' : 'border-slate-700'}`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold uppercase">
                      {o.worlds?.name || '無所属'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono font-bold">
                      {memberCount} メンバー
                    </span>
                  </div>
                  
                  {!isSelectMode && (
                    <Link href={`/organizations/edit/${o.id}`} className="text-[9px] font-black text-slate-500 hover:text-white uppercase transition-colors bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                      編集
                    </Link>
                  )}

                  {isSelectMode && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'}`}>
                      {isSelected && '✓'}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{o.name}</h2>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-3 mb-3">{details.summary}</p>
                {details.history && (
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[9px] font-black text-slate-500 block uppercase mb-1 tracking-widest">歴史・沿革</span>
                    <p className="text-slate-400 text-[11px] line-clamp-2 italic">{details.history}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-10 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50">
          <span className="text-white font-bold text-xs uppercase tracking-widest">{selectedIds.length} Orgs Selected</span>
          <button onClick={bulkDelete} className="text-red-500 hover:text-white text-[10px] font-black uppercase">一括削除を実行</button>
        </div>
      )}
    </div>
  );
}