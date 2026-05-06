'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function NewCharacterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>([]);
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('worlds').select('*').then(({ data }) => setAllWorlds(data || []));
  }, []);

  const handleWorldToggle = (wId: string) => {
    const isSelecting = !selectedWorlds.includes(wId);
    setSelectedWorlds(prev => isSelecting ? [...prev, wId] : prev.filter(i => i !== wId));

    if (isSelecting) {
      const world = allWorlds.find(w => w.id === wId);
      if (world?.char_stats_schema) {
        const ns = { ...stats };
        world.char_stats_schema.forEach((s: string) => { if (ns[s] === undefined) ns[s] = 0; });
        setStats(ns);
      }
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    const { data: char } = await supabase.from('characters').insert([{ 
      name, 
      stats, 
      description: JSON.stringify({ personality: '', background: '', memo: '' }) 
    }]).select().single();

    if (char && selectedWorlds.length > 0) {
      await supabase.from('character_worlds').insert(selectedWorlds.map(id => ({ character_id: char.id, world_id: id })));
    }
    router.push('/');
  };

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-12">
      <div className="max-w-2xl mx-auto bg-slate-800/20 rounded-[3rem] border border-slate-700 p-10 space-y-8">
        <h1 className="text-2xl font-black text-white text-center">新規キャラクター初期化</h1>
        <input 
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-3xl font-bold text-white text-center outline-none focus:border-blue-500 transition-all" 
          placeholder="名前を入力" 
          value={name} onChange={e => setName(e.target.value)} 
        />
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-500 block text-center uppercase tracking-widest">所属世界を選択（変数が展開されます）</label>
          <div className="flex flex-wrap justify-center gap-2">
            {allWorlds.map(w => (
              <button key={w.id} onClick={() => handleWorldToggle(w.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedWorlds.includes(w.id) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>{w.name}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800">
        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-8 text-center">初期パラメータ調整 (0-999)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.keys(stats).map(s => (
            <div key={s} className="space-y-4 p-4 rounded-2xl bg-slate-800/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">{s}</span>
                <input type="number" min="0" max="999" className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right w-20 text-blue-400 font-mono outline-none" value={stats[s]} onChange={e => setStats({...stats, [s]: Math.max(0, Math.min(999, Number(e.target.value)))})} />
              </div>
              <input type="range" min="0" max="999" className="w-full accent-blue-500" value={stats[s]} onChange={e => setStats({...stats, [s]: Number(e.target.value)})} />
            </div>
          ))}
        </div>
        <button onClick={handleCreate} className="w-full bg-white text-black font-black py-6 rounded-3xl mt-12 hover:bg-blue-600 hover:text-white transition-all text-xl shadow-2xl">キャラクターを生成</button>
      </section>
    </div>
  );
}