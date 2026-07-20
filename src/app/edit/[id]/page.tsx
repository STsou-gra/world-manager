// src/app/edit/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function EditCharacterPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  // フォームステート
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [background, setBackground] = useState('');
  const [memo, setMemo] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [statNotes, setStatNotes] = useState<Record<string, string>>({});

  // マスタデータ
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const [wRes, oRes, cRes] = await Promise.all([
        supabase.from('worlds').select('*'),
        supabase.from('organizations').select('*'),
        supabase.from('characters').select('*, character_worlds(world_id), character_organizations(org_id)').eq('id', id).single()
      ]);

      setAllWorlds(wRes.data || []);
      setAllOrgs(oRes.data || []);

      if (cRes.data) {
        setName(cRes.data.name);
        const desc = cRes.data.description ? JSON.parse(cRes.data.description) : {};
        setPersonality(desc.personality || '');
        setBackground(desc.background || '');
        setMemo(desc.memo || '');
        setStats(cRes.data.stats || {});
        setStatNotes(cRes.data.stat_notes || {});
        setSelectedWorlds(cRes.data.character_worlds.map((w: any) => w.world_id));
        setSelectedOrgs(cRes.data.character_organizations.map((o: any) => o.org_id));
      }
      setLoading(false);
    };
    init();
  }, [id]);

  // 世界観タグ切り替え時の自動インポート
  const handleWorldToggle = (wId: string) => {
    const isSelecting = !selectedWorlds.includes(wId);
    setSelectedWorlds(prev => isSelecting ? [...prev, wId] : prev.filter(i => i !== wId));

    if (isSelecting) {
      const world = allWorlds.find(w => w.id === wId);
      if (world?.char_stats_schema) {
        const newStats = { ...stats };
        world.char_stats_schema.forEach((s: string) => {
          if (newStats[s] === undefined) newStats[s] = 0;
        });
        setStats(newStats);
      }
    }
  };

  const applyStandardStats = () => {
    setStats({ ...stats, 'HP': 100, '攻撃力': 10, '防御力': 10 });
  };

  const addCustomStat = () => {
    const sName = prompt("変数名を入力（例：運、カリスマ）");
    if (sName) setStats({ ...stats, [sName]: 0 });
  };

  const handleSave = async () => {
    const descJson = JSON.stringify({ personality, background, memo });
    
    // 基本情報の更新
    await supabase.from('characters').update({ 
      name, 
      description: descJson, 
      stats, 
      stat_notes: statNotes 
    }).eq('id', id);

    // 中間テーブルの更新
    await supabase.from('character_worlds').delete().eq('character_id', id);
    await supabase.from('character_organizations').delete().eq('character_id', id);
    if (selectedWorlds.length > 0) {
      await supabase.from('character_worlds').insert(selectedWorlds.map(wId => ({ character_id: id, world_id: wId })));
    }
    if (selectedOrgs.length > 0) {
      await supabase.from('character_organizations').insert(selectedOrgs.map(oId => ({ character_id: id, org_id: oId })));
    }
    
    router.push('/');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('このキャラクターを完全に削除しますか？')) return;
    await supabase.from('characters').delete().eq('id', id);
    router.push('/');
    router.refresh();
  };

  if (loading) return <div className="p-20 text-center font-bold text-blue-400 animate-pulse">同期中...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4">
      <header className="flex justify-between items-center border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">CHARACTER_EDITOR</h1>
        <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-white transition-all uppercase">戻る</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          
          {/* 名前入力 */}
          <section className="bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-700">
            <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">個体識別名</label>
            <input 
              className="bg-transparent text-5xl font-bold text-white w-full outline-none border-b-2 border-slate-800 focus:border-blue-500 pb-2 transition-all"
              value={name} onChange={e => setName(e.target.value)} 
            />
          </section>

          {/* プロフィール */}
          <section className="bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <TextAreaBlock label="性格・特徴" value={personality} onChange={setPersonality} placeholder="冷静沈着..." />
            <TextAreaBlock label="生い立ち" value={background} onChange={setBackground} placeholder="物語の始まり..." />
            <TextAreaBlock label="その他備考" value={memo} onChange={setMemo} placeholder="特殊な能力など..." />
          </section>

          {/* 能力値編集 */}
          <section className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">能力値パラメータ</h3>
              <div className="flex gap-2">
                <button onClick={applyStandardStats} className="text-[9px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 hover:text-white transition-all">標準セット</button>
                <button onClick={addCustomStat} className="text-[9px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all">+ 追加</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {Object.keys(stats).map(s => (
                <div key={s} className="space-y-4 p-4 rounded-2xl bg-slate-800/10 border border-slate-800/50">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 w-fit">{s}</span>
                      <input 
                        type="text" 
                        placeholder="備考(∞など)"
                        className="bg-transparent text-[10px] text-blue-400 outline-none w-24 border-b border-transparent focus:border-blue-500/30"
                        value={statNotes[s] || ''}
                        onChange={e => setStatNotes({...statNotes, [s]: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <input 
                        type="number" min="0" max="999"
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right w-20 text-blue-400 font-mono text-lg outline-none"
                        value={stats[s]} 
                        onChange={e => setStats({...stats, [s]: Math.max(0, Math.min(999, Number(e.target.value)))})} 
                      />
                      <button onClick={() => {
                        const ns = {...stats}; delete ns[s]; setStats(ns);
                      }} className="text-[8px] text-red-500/50 hover:text-red-500 uppercase font-bold">Delete</button>
                    </div>
                  </div>
                  <input type="range" min="0" max="999" className="w-full accent-blue-500" value={stats[s]} onChange={e => setStats({...stats, [s]: Number(e.target.value)})} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* サイドバー */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 space-y-6">
            <TagSelector label="世界観（自動インポート）" color="text-blue-500" options={allWorlds} selected={selectedWorlds} onToggle={handleWorldToggle} />
            <TagSelector label="所属組織" color="text-emerald-500" options={allOrgs} selected={selectedOrgs} onToggle={(oid: string) => setSelectedOrgs(prev => prev.includes(oid) ? prev.filter(i => i !== oid) : [...prev, oid])} />
            
            <div className="space-y-4 pt-6">
              <button onClick={handleSave} className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl hover:bg-blue-500 transition-all shadow-xl text-lg">保存する</button>
              <button onClick={handleDelete} className="w-full bg-transparent text-red-500 border border-red-500/20 py-3 rounded-2xl hover:bg-red-500/10 text-xs font-bold transition-all">キャラクターを削除</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 補助パーツ
// ----------------------------------------------------------------

function TextAreaBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <textarea 
        className="bg-slate-900/80 w-full rounded-2xl p-4 text-slate-200 outline-none h-28 border border-slate-800 focus:border-blue-500 transition-all resize-none text-sm leading-relaxed"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} 
      />
    </div>
  );
}

function TagSelector({ label, color, options, selected, onToggle }: any) {
  return (
    <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
      <h3 className={`text-[10px] font-black ${color} mb-4 uppercase tracking-widest`}>{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: any) => (
          <button 
            key={opt.id} type="button"
            onClick={() => onToggle(opt.id)} 
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${selected.includes(opt.id) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}