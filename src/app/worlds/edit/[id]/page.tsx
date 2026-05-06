'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function EditWorldPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // 変数管理を「キャラ用」と「組織用」に分離
  const [charSchema, setCharSchema] = useState<string[]>([]);
  const [orgSchema, setOrgSchema] = useState<string[]>([]);

  useEffect(() => {
    const fetchWorld = async () => {
      const { data } = await supabase.from('worlds').select('*').eq('id', id).single();
      if (data) {
        setName(data.name);
        setDescription(data.description || '');
        // 既存のデータをそれぞれのステートに格納
        setCharSchema(data.char_stats_schema || []);
        setOrgSchema(data.org_stats_schema || []);
      }
      setLoading(false);
    };
    fetchWorld();
  }, [id]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('worlds')
      .update({ 
        name, 
        description, 
        char_stats_schema: charSchema, // キャラ用を保存
        org_stats_schema: orgSchema    // 組織用を保存
      })
      .eq('id', id);
    if (!error) router.push('/worlds');
  };

  // 追加用の共通関数
  const addField = (target: 'char' | 'org') => {
    const field = prompt(`${target === 'char' ? 'キャラクター' : '組織'}用の新しい変数名を入力してください`);
    if (field) {
      if (target === 'char') setCharSchema([...charSchema, field]);
      else setOrgSchema([...orgSchema, field]);
    }
  };

  if (loading) return <div className="p-20 text-center text-blue-400 font-bold">ロード中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-black text-white italic">世界観設定の編集</h1>
      <div className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 space-y-8">
        {/* 基本情報 */}
        <section className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">世界名称</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">世界の説明</label>
            <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 h-32 outline-none focus:border-blue-500" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </section>

        {/* 変数生成セクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
          {/* キャラクター用 */}
          <SchemaEditor 
            label="キャラクター用追加変数" 
            schema={charSchema} 
            color="blue" 
            onAdd={() => addField('char')} 
            onRemove={(i) => setCharSchema(charSchema.filter((_, idx) => idx !== i))} 
          />
          {/* 組織用 */}
          <SchemaEditor 
            label="組織用追加変数" 
            schema={orgSchema} 
            color="emerald" 
            onAdd={() => addField('org')} 
            onRemove={(i) => setOrgSchema(orgSchema.filter((_, idx) => idx !== i))} 
          />
        </div>

        <div className="flex gap-4 pt-6">
          <button onClick={handleUpdate} className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl">設定を更新する</button>
          <button onClick={() => router.back()} className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl">戻る</button>
        </div>
      </div>
    </div>
  );
}

// 共通パーツ
function SchemaEditor({ label, schema, color, onAdd, onRemove }: any) {
  const colorClass = color === 'blue' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className={`text-[10px] font-black uppercase tracking-widest ${color === 'blue' ? 'text-blue-400' : 'text-emerald-400'}`}>{label}</label>
        <button onClick={onAdd} className={`${colorClass} px-3 py-1 rounded-lg text-[10px] font-bold border`}>+ 追加</button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
        {schema.map((s: string, i: number) => (
          <div key={i} className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
            <span className="text-xs text-slate-300">{s}</span>
            <button onClick={() => onRemove(i)} className="text-red-500 hover:text-red-400 text-xs">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}