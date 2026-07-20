// src/app/worlds/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export type StatSchemaItem = {
  name: string;
  type: 'number' | 'string';
};

export default function NewWorldPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  // キャラクター用＆組織用の固有ステータスタグ
  const [charSchema, setCharSchema] = useState<StatSchemaItem[]>([]);
  const [orgSchema, setOrgSchema] = useState<StatSchemaItem[]>([]);

  // 新規タグ入力用のローカルステート
  const [newCharStatName, setNewCharStatName] = useState('');
  const [newCharStatType, setNewCharStatType] = useState<'number' | 'string'>('number');

  const [newOrgStatName, setNewOrgStatName] = useState('');
  const [newOrgStatType, setNewOrgStatType] = useState<'number' | 'string'>('number');

  // キャラクター用ステータスタグの追加
  const addCharStat = () => {
    if (!newCharStatName.trim()) return;
    const trimmed = newCharStatName.trim();
    if (!charSchema.some(s => s.name === trimmed)) {
      setCharSchema([...charSchema, { name: trimmed, type: newCharStatType }]);
    }
    setNewCharStatName('');
  };

  // 組織用ステータスタグの追加
  const addOrgStat = () => {
    if (!newOrgStatName.trim()) return;
    const trimmed = newOrgStatName.trim();
    if (!orgSchema.some(s => s.name === trimmed)) {
      setOrgSchema([...orgSchema, { name: trimmed, type: newOrgStatType }]);
    }
    setNewOrgStatName('');
  };

  // 保存処理
  const handleCreate = async () => {
    if (!name.trim()) {
      alert('世界観の名称を入力してください');
      return;
    }

    const { error } = await supabase.from('worlds').insert([{
      name: name.trim(),
      description: desc.trim(),
      char_stats_schema: charSchema,
      org_stats_schema: orgSchema,
      stats_schema: charSchema
    }]);

    if (error) {
      console.error('World creation error:', error);
      alert('世界観の保存に失敗しました。');
      return;
    }

    router.push('/worlds');
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-slate-800/20 rounded-[3rem] border border-slate-700 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">新しい世界観を構築</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">舞台設定と固有パラメータの定義</p>
      </header>

      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">世界観の名称 *</label>
          <input 
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-slate-700" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="例：サイバーパンク東京、幻想大陸エーテリア..." 
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">世界の説明・背景設定</label>
          <textarea 
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-300 h-32 outline-none focus:border-blue-500 transition-all resize-none placeholder:text-slate-700 text-xs" 
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            placeholder="世界の物理法則、歴史、魔法の有無など..." 
          />
        </div>

        {/* キャラクター用固有ステータスタグ設定 */}
        <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">キャラクター固有ステータス</h3>
              <p className="text-[10px] text-slate-500">この世界観のキャラ作成時に展開される固有変数（数値・文字列）</p>
            </div>
          </div>

          {/* タグ追加フォーム */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="変数名（例: 魔力, 属性, 信仰心）"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-blue-500"
              value={newCharStatName}
              onChange={e => setNewCharStatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCharStat(); } }}
            />
            <select
              value={newCharStatType}
              onChange={e => setNewCharStatType(e.target.value as 'number' | 'string')}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500 font-bold"
            >
              <option value="number">数値型 (0-999)</option>
              <option value="string">文字列型 (タグ選択)</option>
            </select>
            <button 
              type="button"
              onClick={addCharStat}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md"
            >
              + 追加
            </button>
          </div>

          {/* タグチップ一覧 */}
          <div className="flex flex-wrap gap-2 min-h-[48px] p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            {charSchema.length === 0 ? (
              <span className="text-[10px] text-slate-600 self-center">登録されている固有ステータスはありません</span>
            ) : (
              charSchema.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs shadow-sm">
                  <span className="font-bold text-slate-200">{item.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.type === 'string' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                    {item.type === 'string' ? '文字列' : '数値'}
                  </span>
                  <button 
                    onClick={() => setCharSchema(charSchema.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-red-400 font-bold text-xs ml-1"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 組織用固有ステータスタグ設定 */}
        <section className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">組織用固有ステータス</h3>
              <p className="text-[10px] text-slate-500">この世界観の組織作成時に定義される固有パラメータ</p>
            </div>
          </div>

          {/* タグ追加フォーム */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="変数名（例: 資金力, 政治的影響力）"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
              value={newOrgStatName}
              onChange={e => setNewOrgStatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOrgStat(); } }}
            />
            <select
              value={newOrgStatType}
              onChange={e => setNewOrgStatType(e.target.value as 'number' | 'string')}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 font-bold"
            >
              <option value="number">数値型 (0-999)</option>
              <option value="string">文字列型 (タグ選択)</option>
            </select>
            <button 
              type="button"
              onClick={addOrgStat}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md"
            >
              + 追加
            </button>
          </div>

          {/* タグチップ一覧 */}
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

        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleCreate} 
            className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl text-base"
          >
            世界観を保存する
          </button>
          <button 
            onClick={() => router.back()} 
            className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 text-xs transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}