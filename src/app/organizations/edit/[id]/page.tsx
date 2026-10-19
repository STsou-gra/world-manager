// src/app/organizations/edit/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { RelationRow, saveRelationRows } from '../../../../lib/relationRows';
import RelationRowsEditor from '../../../../components/domain/RelationRowsEditor';

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

export default function EditOrgPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [history, setHistory] = useState('');
  const [worldId, setWorldId] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  
  // 組織独自の固有変数
  const [orgSpecificSchema, setOrgSpecificSchema] = useState<StatSchemaItem[]>([]);
  
  // マスタデータ
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  // 保存時の差分計算用（読み込み時点のメンバー）
  const [initialMembers, setInitialMembers] = useState<string[]>([]);

  // 他組織との関係
  const [otherOrgs, setOtherOrgs] = useState<{ id: string; name: string }[]>([]);
  const [orgRelations, setOrgRelations] = useState<RelationRow[]>([]);
  const [initialOrgRelations, setInitialOrgRelations] = useState<RelationRow[]>([]);

  // 世界観から継承された組織用変数
  const [inheritedWorldSchema, setInheritedWorldSchema] = useState<StatSchemaItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [oRes, wRes, cRes, mRes, otherOrgsRes, orgRelRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', id).single(),
        supabase.from('worlds').select('*'),
        supabase.from('characters').select('id, name, gender'),
        supabase.from('character_organizations').select('character_id').eq('org_id', id),
        supabase.from('organizations').select('id, name').neq('id', id),
        supabase.from('organization_relations').select('id, target_org_id, relation_name').eq('source_org_id', id)
      ]);

      setOtherOrgs(otherOrgsRes.data || []);
      const orgRelRows = (orgRelRes.data || []).map(r => ({ id: r.id, target_id: r.target_org_id, relation_name: r.relation_name }));
      setOrgRelations(orgRelRows);
      setInitialOrgRelations(orgRelRows);
      
      if (oRes.data) {
        setName(oRes.data.name);
        
        // description のパース（JSON構造と旧文字列の両方に対応）
        if (oRes.data.description) {
          try {
            const parsed = JSON.parse(oRes.data.description);
            if (typeof parsed === 'object' && parsed !== null) {
              setSummary(parsed.summary || '');
              setHistory(parsed.history || '');
            } else {
              setSummary(oRes.data.description);
            }
          } catch (e) {
            setSummary(oRes.data.description);
          }
        }

        setWorldId(oRes.data.world_id || '');
        setStats(oRes.data.stats || {});
        setOrgSpecificSchema(parseSchema(oRes.data.stats_schema));
        
        const world = wRes.data?.find((w: any) => w.id === oRes.data.world_id);
        setInheritedWorldSchema(parseSchema(world?.org_stats_schema));
      }

      setAllWorlds(wRes.data || []);
      setAllCharacters(cRes.data || []);
      const memberIds = (mRes.data || []).map((m: any) => m.character_id);
      setSelectedMembers(memberIds);
      setInitialMembers(memberIds);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const world = allWorlds.find((w: any) => w.id === worldId);
    setInheritedWorldSchema(parseSchema(world?.org_stats_schema));
  }, [worldId, allWorlds]);

  const toggleMemberSelect = (charId: string) => {
    setSelectedMembers(prev => 
      prev.includes(charId) ? prev.filter(i => i !== charId) : [...prev, charId]
    );
  };

  const handleUpdate = async () => {
    const descJson = JSON.stringify({ summary, history });

    const { error } = await supabase
      .from('organizations')
      .update({ 
        name, 
        description: descJson, 
        world_id: worldId || null, 
        stats,
        stats_schema: orgSpecificSchema
      })
      .eq('id', id);

    if (error) {
      console.error('Org update error:', error);
      alert('組織の更新に失敗しました。');
      return;
    }

    // 中間テーブル（メンバー紐付け）の更新
    // 全削除→再登録だとキャラ側で設定した役職(relation_name)が消えるため、増減分のみ反映する
    const removedMembers = initialMembers.filter(charId => !selectedMembers.includes(charId));
    const addedMembers = selectedMembers.filter(charId => !initialMembers.includes(charId));

    if (removedMembers.length > 0) {
      const { error: removeError } = await supabase
        .from('character_organizations')
        .delete()
        .eq('org_id', id)
        .in('character_id', removedMembers);
      if (removeError) {
        console.error('Org member remove error:', removeError);
        alert(`メンバーの解除に失敗しました:\n${removeError.message}\n\n組織情報は保存済みです。ページを再読み込みして内容を確認してください。`);
        return;
      }
    }
    if (addedMembers.length > 0) {
      const { error: addError } = await supabase.from('character_organizations').insert(
        addedMembers.map(charId => ({ character_id: charId, org_id: id }))
      );
      if (addError) {
        console.error('Org member add error:', addError);
        alert(`メンバーの追加に失敗しました:\n${addError.message}\n\n組織情報は保存済みです。ページを再読み込みして内容を確認してください。`);
        return;
      }
    }

    const relError = await saveRelationRows({
      table: 'organization_relations',
      ownerColumn: 'source_org_id',
      ownerId: id as string,
      targetColumn: 'target_org_id',
      initial: initialOrgRelations,
      current: orgRelations,
    });
    if (relError) {
      console.error('Org relation save error:', relError);
      alert(`他組織との関係の保存に失敗しました:\n${relError.message}\n\n組織情報は保存済みです。ページを再読み込みして内容を確認してください。`);
      return;
    }

    router.push('/organizations');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('この組織を削除しますか？')) return;
    await supabase.from('organizations').delete().eq('id', id);
    router.push('/organizations');
    router.refresh();
  };

  if (loading) return <div className="p-20 text-center text-emerald-400 font-bold">同期中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 pb-20">
      <header className="flex justify-between items-center border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white italic">組織設定の修正</h1>
        <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-white transition-all uppercase">戻る</button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">所属世界観</label>
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
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">組織名</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:border-emerald-500 transition-all text-lg" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
          </section>

          {/* 概要欄と歴史欄 */}
          <section className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">組織の概要・理念</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 h-28 outline-none focus:border-emerald-500 transition-all resize-none text-xs" 
                value={summary} 
                onChange={e => setSummary(e.target.value)} 
                placeholder="組織の目的、主な活動など..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">組織の歴史・沿革</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 h-36 outline-none focus:border-emerald-500 transition-all resize-none text-xs" 
                value={history} 
                onChange={e => setHistory(e.target.value)} 
                placeholder="設立の理由、事件、歴史の深まりなど..."
              />
            </div>
          </section>

          {/* 1. 世界観から継承された組織用変数 */}
          {inheritedWorldSchema.length > 0 && (
            <section className="bg-blue-500/5 p-8 rounded-[2.5rem] border border-blue-500/20 space-y-6">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">世界観設定から継承されたパラメータ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inheritedWorldSchema.map(s => (
                  <StatInput key={s.name} label={`${s.name} (${s.type === 'string' ? '文字列' : '数値'})`} value={stats[s.name] || 0} onChange={(val: number) => setStats({...stats, [s.name]: val})} color="blue" />
                ))}
              </div>
            </section>
          )}

          {/* 2. 組織「固有」の変数（型選択付きタグ編集） */}
          <section className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/20 space-y-6">
            <TypedSchemaEditor
              label="組織固有のステータス"
              schema={orgSpecificSchema}
              onChange={setOrgSpecificSchema}
            />
          </section>

          {/* 3. 他組織との関係 */}
          <RelationRowsEditor
            title="他組織との関係"
            description="この組織から見た、他の組織との関係（相関図に矢印で表示されます）"
            theme="amber"
            targetLabel="相手の組織"
            targetPlaceholder="組織を選択..."
            namePlaceholder="例: 同盟、敵対、下部組織..."
            emptyMessage="他組織との関係はまだ設定されていません。「+ 関係を追加」ボタンから定義できます。"
            options={otherOrgs}
            rows={orgRelations}
            onChange={setOrgRelations}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 space-y-6">
            
            {/* メンバー選択 */}
            <div className="bg-slate-800/20 p-6 rounded-3xl border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">所属メンバー編集</h3>
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
                onClick={handleUpdate} 
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl active:scale-95 text-base"
              >
                変更を保存
              </button>
              <button 
                onClick={handleDelete} 
                className="w-full bg-transparent text-red-500 border border-red-500/20 py-3 rounded-2xl hover:bg-red-500/10 text-xs font-bold transition-all"
              >
                組織を削除
              </button>
            </div>
          </div>
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
          className={`bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right w-16 ${textClass} font-mono text-xs`}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
      <input type="range" className={`w-full ${accentClass}`} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

// 型指定付きタグ編集コンポーネント
function TypedSchemaEditor({ 
  label, 
  schema, 
  onChange 
}: { 
  label: string; 
  schema: StatSchemaItem[]; 
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{label}</h3>
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          placeholder="変数名"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
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
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
        >
          + 追加
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
        {schema.length === 0 ? (
          <span className="text-[10px] text-slate-600 self-center">登録なし</span>
        ) : (
          schema.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs">
              <span className="text-slate-300 font-bold">{item.name}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.type === 'string' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
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