// src/app/organizations/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export type StatSchemaItem = {
  name: string;
  type: 'number' | 'string';
};

export default function NewOrgPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [worldId, setWorldId] = useState('');
  const [summary, setSummary] = useState('');
  const [history, setHistory] = useState('');

  // マスタデータ
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  
  // 選択された所属メンバー（キャラクターID）
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 組織固有のステータスタグ
  const [orgSchema, setOrgSchema] = useState<StatSchemaItem[]>([]);
  const [newStatName, setNewStatName] = useState('');
  const [newStatType, setNewStatType] = useState<'number' | 'string'>('number');

  useEffect(() => {
    const init = async () => {
      const [wRes, cRes] = await Promise.all([
        supabase.from('worlds').select('id, name'),
        supabase.from('characters').select('id, name, gender')
      ]);

      setAllWorlds(wRes.data || []);
      setAllCharacters(cRes.data || []);
      setLoading(false);
    };
    init();
  }, []);

  const addOrgStat = () => {
    if (!newStatName.trim()) return;
    const trimmed = newStatName.trim();
    if (!orgSchema.some(s => s.name === trimmed)) {
      setOrgSchema([...orgSchema, { name: trimmed, type: newStatType }]);
    }
    setNewStatName('');
  };

  const toggleMemberSelect = (charId: string) => {
    setSelectedMembers(prev => 
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('組織名を入力してください');
      return;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      alert('Supabase接続エラー:\nNEXT_PUBLIC_SUPABASE_URL が未設定または読み込まれていません。.env.local ファイルをご確認の上、開発サーバーを再起動してください。');
      return;
    }

    const descJson = JSON.stringify({ summary, history });

    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert([{ 
        name: name.trim(), 
        world_id: worldId || null, 
        description: descJson,
        stats_schema: orgSchema 
      }])
      .select()
      .single();

    if (error) {
      console.error('Organization creation error:', error);
      alert(`組織の生成に失敗しました:\n${error.message || JSON.stringify(error)}`);
      return;
    }

    if (newOrg && selectedMembers.length > 0) {
      // 中間テーブルへの登録
      await supabase.from('character_organizations').insert(
        selectedMembers.map(charId => ({ character_id: charId, org_id: newOrg.id }))
      );
    }

    router.push('/organizations');
    router.refresh();
  };

  if (loading) {
    return <div className="p-20 text-center font-bold text-emerald-400 animate-pulse">初期化中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 pb-20">
      <header className="border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">New Organization</h1>
          <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">新規組織の登録と初期定義</p>
        </div>
        <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-white transition-all uppercase">
          キャンセル
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* メインエリア */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 基本情報 */}
          <section className="bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">結びついている所属世界観</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all text-xs" 
                value={worldId} 
                onChange={e => setWorldId(e.target.value)}
              >
                <option value="">無所属・独立</option>
                {allWorlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">組織名 *</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-slate-700 text-lg" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="例: 蒼穹騎士団、シャドウコーポレーション..." 
              />
            </div>
          </section>

          {/* 概要欄と歴史欄 */}
          <section className="bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">組織の概要・理念</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all h-28 resize-none placeholder:text-slate-700"
                placeholder="組織の目的、理念、主な活動内容など..."
                value={summary} 
                onChange={e => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">組織の歴史・沿革</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all h-36 resize-none placeholder:text-slate-700"
                placeholder="設立の経緯、過去の大事件、発展の軌跡など..."
                value={history} 
                onChange={e => setHistory(e.target.value)}
              />
            </div>
          </section>

          {/* 組織固有ステータスタグ設定 */}
          <section className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">組織固有ステータス</h3>
              <p className="text-[10px] text-slate-500">所属キャラクターや組織自体に適用される固有変数（数値・文字列）</p>
            </div>

            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="変数名（例: 忠誠度, 役職, 貢献度）"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                value={newStatName}
                onChange={e => setNewStatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOrgStat(); } }}
              />
              <select
                value={newStatType}
                onChange={e => setNewStatType(e.target.value as 'number' | 'string')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 font-bold"
              >
                <option value="number">数値型 (0-999)</option>
                <option value="string">文字列型 (タグ/属性)</option>
              </select>
              <button 
                type="button"
                onClick={addOrgStat}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md"
              >
                + 追加
              </button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[48px] p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              {orgSchema.length === 0 ? (
                <span className="text-[10px] text-slate-600 self-center">登録されている固有ステータスはありません</span>
              ) : (
                orgSchema.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs shadow-sm">
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.type === 'string' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {item.type === 'string' ? '文字列' : '数値'}
                    </span>
                    <button 
                      onClick={() => setOrgSchema(orgSchema.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 font-bold text-xs ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* サイドバー（所属メンバー選択＆アクション） */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 space-y-6">
            
            {/* メンバー選択 */}
            <div className="bg-slate-800/20 p-6 rounded-3xl border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">所属メンバー選択</h3>
                <span className="text-[10px] font-mono text-slate-500">{selectedMembers.length}名選択</span>
              </div>

              {allCharacters.length === 0 ? (
                <p className="text-[10px] text-slate-600">登録済みキャラクターがいません</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                  {allCharacters.map(char => {
                    const isSelected = selectedMembers.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => toggleMemberSelect(char.id)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-md' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {char.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              <button 
                onClick={handleCreate} 
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl hover:bg-emerald-500 transition-all shadow-xl text-lg active:scale-95"
              >
                組織を保存する
              </button>
              <button 
                onClick={() => router.back()} 
                className="w-full bg-slate-800 text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-700 transition-all text-xs"
              >
                キャンセル
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}