'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function NewWorldPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [schemaInput, setSchemaInput] = useState('');

  const handleCreate = async () => {
    const schema = schemaInput.split(',').map(s => s.trim()).filter(s => s !== '');
    const { error } = await supabase.from('worlds').insert([{ name, description: desc, stats_schema: schema }]);
    if (!error) router.push('/worlds');
  };

  return (
    <div className="max-w-2xl mx-auto p-10 bg-slate-800/20 rounded-[3rem] border border-slate-700 space-y-8">
      <h1 className="text-2xl font-black text-white text-center">新しい世界を構築する</h1>
      <div className="space-y-6">
        <InputBlock label="世界観の名称" value={name} onChange={setName} placeholder="例：サイバーパンク東京、幻想大陸エーテリア" />
        <TextBlock label="世界の説明・備考" value={desc} onChange={setDesc} placeholder="世界の物理法則、歴史、魔法の有無など..." />
        <InputBlock label="固有ステータス（カンマ区切り）" value={schemaInput} onChange={setSchemaInput} placeholder="例：魔力, 汚染度, 信仰心" />
        <button onClick={handleCreate} className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
          世界観を保存する
        </button>
      </div>
    </div>
  );
}

function InputBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-2 block">{label}</label>
      <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextBlock({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 mb-2 block">{label}</label>
      <textarea className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-300 h-32 outline-none focus:border-blue-500 transition-all" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}