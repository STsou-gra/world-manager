'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [worldId, setWorldId] = useState('');
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [schemaInput, setSchemaInput] = useState('');

  useEffect(() => {
    supabase.from('worlds').select('id, name').then(({ data }) => setAllWorlds(data || []));
  }, []);

  const handleCreate = async () => {
    const schema = schemaInput.split(',').map(s => s.trim()).filter(s => s !== '');
    const { error } = await supabase.from('organizations').insert([{ name, world_id: worldId || null, stats_schema: schema }]);
    if (!error) router.push('/organizations');
  };

  return (
    <div className="max-w-2xl mx-auto p-10 bg-slate-800/20 rounded-[3rem] border border-slate-700 space-y-8">
      <h1 className="text-2xl font-black text-white uppercase tracking-widest italic text-center">組織生成</h1>
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">結びついてる世界観</label>
          <select className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 transition-all" value={worldId} onChange={e => setWorldId(e.target.value)}>
            <option value="">無所属・独立</option>
            {allWorlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <InputBlock label="Org Name" value={name} onChange={setName} placeholder="e.g. Knights of Azure" />
        <InputBlock label="Org-Specific Parameters (Comma separated)" value={schemaInput} onChange={setSchemaInput} placeholder="e.g. Loyalty, Rank, Contribution" />
        <button onClick={handleCreate} className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest shadow-2xl">生成</button>
      </div>
    </div>
  );
}

function InputBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">{label}</label>
      <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 transition-all" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}