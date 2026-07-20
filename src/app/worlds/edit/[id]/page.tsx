// src/app/worlds/edit/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export type StatSchemaItem = {
  name: string;
  type: 'number' | 'string';
};

// スキーマパースヘルパー
function parseSchema(schema: any): StatSchemaItem[] {
  if (!Array.isArray(schema)) return [];
  return schema.map(item => {
    if (typeof item === 'string') {
      return { name: item, type: 'number' };
    }
    if (typeof item === 'object' && item !== null && item.name) {
      return { name: String(item.name), type: item.type === 'string' ? 'string' : 'number' };
    }
    return null;
  }).filter((item): item is StatSchemaItem => item !== null);
}

export default function EditWorldPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // 変数管理を「キャラ用」と「組織用」に分離
  const [charSchema, setCharSchema] = useState<StatSchemaItem[]>([]);
  const [orgSchema, setOrgSchema] = useState<StatSchemaItem[]>([]);

  useEffect(() => {
    const fetchWorld = async () => {
      const { data } = await supabase.from('worlds').select('*').eq('id', id).single();
      if (data) {
        setName(data.name);
        setDescription(data.description || '');
        setCharSchema(parseSchema(data.char_stats_schema || data.stats_schema));
        setOrgSchema(parseSchema(data.org_stats_schema));
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
        char_stats_schema: charSchema,
        org_stats_schema: orgSchema,
        stats_schema: charSchema
      })
      .eq('id', id);
    if (!error) {
      router.push('/worlds');
      router.refresh();
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
            <input 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">世界の説明</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 h-32 outline-none focus:border-blue-500 resize-none text-xs" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </section>

        {/* 変数生成セクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
          {/* キャラクター用 */}
          <TypedSchemaEditor 
            label="キャラクター用固有ステータス" 
            schema={charSchema} 
            color="blue" 
            onChange={setCharSchema} 
          />
          {/* 組織用 */}
          <TypedSchemaEditor 
            label="組織用固有ステータス" 
            schema={orgSchema} 
            color="emerald" 
            onChange={setOrgSchema} 
          />
        </div>

        <div className="flex gap-4 pt-6">
          <button 
            onClick={handleUpdate} 
            className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl"
          >
            設定を更新する
          </button>
          <button 
            onClick={() => router.back()} 
            className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}

// 型指定付きタグ編集コンポーネント
function TypedSchemaEditor({ 
  label, 
  schema, 
  color, 
  onChange 
}: { 
  label: string; 
  schema: StatSchemaItem[]; 
  color: 'blue' | 'emerald'; 
  onChange: (items: StatSchemaItem[]) => void; 
}) {
  const [inputName, setInputName] = useState('');
  const [inputType, setInputType] = useState<'number' | 'string'>('number');

  const addTag = () => {
    if (!inputName.trim()) return;
    const trimmed = inputName.trim();
    if (!schema.some(s => s.name === trimmed)) {
      onChange([...schema, { name: trimmed, type: inputType }]);
    }
    setInputName('');
  };

  const removeTag = (index: number) => {
    onChange(schema.filter((_, i) => i !== index));
  };

  const isBlue = color === 'blue';
  const labelColor = isBlue ? 'text-blue-400' : 'text-emerald-400';
  const buttonBg = isBlue ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500';

  return (
    <div className="space-y-4">
      <div>
        <label className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>{label}</label>
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          placeholder="変数名"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-slate-700"
          value={inputName}
          onChange={e => setInputName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        />
        <select
          value={inputType}
          onChange={e => setInputType(e.target.value as 'number' | 'string')}
          className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-slate-300 font-bold"
        >
          <option value="number">数値</option>
          <option value="string">文字列</option>
        </select>
        <button 
          type="button"
          onClick={addTag}
          className={`${buttonBg} text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all`}
        >
          + 追加
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
        {schema.length === 0 ? (
          <span className="text-[10px] text-slate-600 self-center">登録なし</span>
        ) : (
          schema.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-xs">
              <span className="text-slate-300 font-bold">{item.name}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.type === 'string' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {item.type === 'string' ? '文字列' : '数値'}
              </span>
              <button onClick={() => removeTag(i)} className="text-red-500 hover:text-red-400 text-xs ml-1">×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}