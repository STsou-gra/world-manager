'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function EditOrgPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [worldId, setWorldId] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  
  // 組織「独自」の変数（旧 stats_schema）
  const [orgSpecificSchema, setOrgSpecificSchema] = useState<string[]>([]);
  
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  // 「世界観」から引き継いだ組織用変数
  const [inheritedWorldSchema, setInheritedWorldSchema] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [oRes, wRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', id).single(),
        supabase.from('worlds').select('*')
      ]);
      
      if (oRes.data) {
        setName(oRes.data.name);
        setDescription(oRes.data.description || '');
        setWorldId(oRes.data.world_id || '');
        setStats(oRes.data.stats || {});
        setOrgSpecificSchema(oRes.data.stats_schema || []); // 組織自体の変数をセット
        
        // 【修正ポイント】世界観テーブルの「org_stats_schema」を参照する
        const world = wRes.data?.find(w => w.id === oRes.data.world_id);
        setInheritedWorldSchema(world?.org_stats_schema || []);
      }
      setAllWorlds(wRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // 所属世界が変わったら表示する変数を更新
  useEffect(() => {
    const world = allWorlds.find(w => w.id === worldId);
    // 【修正ポイント】ここも org_stats_schema に書き換え
    setInheritedWorldSchema(world?.org_stats_schema || []);
  }, [worldId, allWorlds]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        name, 
        description, 
        world_id: worldId || null, 
        stats,
        stats_schema: orgSpecificSchema // 組織自身の変数リストも保存
      })
      .eq('id', id);
    if (!error) {
      router.push('/organizations');
      router.refresh();
    }
  };

  const addSpecificField = () => {
    const field = prompt('この組織固有の新しい能力値名を入力してください');
    if (field) setOrgSpecificSchema([...orgSpecificSchema, field]);
  };

  if (loading) return <div className="p-20 text-center text-emerald-400 font-bold">同期中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 pb-20">
      <h1 className="text-3xl font-black text-white italic">組織設定の修正</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">所属世界観</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all" value={worldId} onChange={e => setWorldId(e.target.value)}>
                <option value="">無所属・独立</option>
                {allWorlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">組織名</label>
              <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:border-emerald-500 transition-all" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">組織概要</label>
              <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 h-40 outline-none focus:border-emerald-500 transition-all resize-none" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </section>

          {/* 1. 世界観から継承された組織用変数 */}
          {inheritedWorldSchema.length > 0 && (
            <section className="bg-blue-500/5 p-8 rounded-[2.5rem] border border-blue-500/20 space-y-6">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">世界観設定から継承されたパラメータ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inheritedWorldSchema.map(s => (
                  <StatInput key={s} label={s} value={stats[s] || 0} onChange={(val) => setStats({...stats, [s]: val})} color="blue" />
                ))}
              </div>
            </section>
          )}

          {/* 2. 組織「固有」の変数 */}
          <section className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/20 space-y-6">
            <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">組織固有のパラメータ</h3>
              <button onClick={addSpecificField} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">+ 変数を追加</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orgSpecificSchema.map((s, i) => (
                <div key={s} className="space-y-2">
                  <StatInput label={s} value={stats[s] || 0} onChange={(val) => setStats({...stats, [s]: val})} color="emerald" />
                  <button onClick={() => setOrgSpecificSchema(orgSpecificSchema.filter((_, idx) => idx !== i))} className="text-[9px] text-red-500 hover:underline">変数を削除</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <button onClick={handleUpdate} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl active:scale-95">変更を保存</button>
          <button onClick={() => router.back()} className="w-full bg-slate-800 text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-700 transition-all">キャンセル</button>
        </aside>
      </div>
    </div>
  );
}

// 数値入力用の共通コンポーネント
function StatInput({ label, value, onChange, color }: any) {
  const accentClass = color === 'blue' ? 'accent-blue-500' : 'accent-emerald-500';
  const textClass = color === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded">{label}</span>
        <input 
          type="number" 
          className={`bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right w-16 ${textClass} font-mono`}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
      <input type="range" className={`w-full ${accentClass}`} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}