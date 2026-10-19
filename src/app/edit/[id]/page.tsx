// src/app/edit/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { RelationRow as TargetRelationRow, saveRelationRows } from '../../../lib/relationRows';
import RelationRowsEditor from '../../../components/domain/RelationRowsEditor';

const DEFAULT_GENDER_TAGS = ['未設定', '女性', '男性', 'アンドロイド', 'その他'];
const STORAGE_KEY_GENDER_TAGS = 'world_manager_custom_gender_tags';

export type StatSchemaItem = {
  name: string;
  type: 'number' | 'string';
};

// id は保存済みの行のみ持つ（画面で追加した行は未設定）
type RelationRow = {
  id?: string;
  target_character_id: string;
  relation_name: string;
};

function parseSchemaItems(schema: any): StatSchemaItem[] {
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

export default function EditCharacterPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  // フォームステート
  const [name, setName] = useState('');
  const [gender, setGender] = useState('未設定');
  const [genderTags, setGenderTags] = useState<string[]>(DEFAULT_GENDER_TAGS);
  const [personality, setPersonality] = useState('');
  const [background, setBackground] = useState('');
  const [memo, setMemo] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [statNotes, setStatNotes] = useState<Record<string, string>>({});
  const [stringAttributes, setStringAttributes] = useState<Record<string, string>>({});

  // マスタデータ
  const [allWorlds, setAllWorlds] = useState<any[]>([]);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);

  // 選択データと関係性
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [orgRelations, setOrgRelations] = useState<Record<string, string>>({});

  // 保存時の差分計算用（読み込み時点の紐付け）
  const [initialWorlds, setInitialWorlds] = useState<string[]>([]);
  const [initialOrgRelations, setInitialOrgRelations] = useState<Record<string, string>>({});
  const [initialRelations, setInitialRelations] = useState<RelationRow[]>([]);

  // 組織への関係（所属とは別）
  const [charOrgRelations, setCharOrgRelations] = useState<TargetRelationRow[]>([]);
  const [initialCharOrgRelations, setInitialCharOrgRelations] = useState<TargetRelationRow[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [wRes, oRes, cRes, allCharsRes, relRes, genderRes, charOrgRelRes] = await Promise.all([
          supabase.from('worlds').select('*'),
          supabase.from('organizations').select('*'),
          supabase.from('characters').select('*, character_worlds(world_id), character_organizations(org_id, relation_name)').eq('id', id).single(),
          supabase.from('characters').select('id, name').neq('id', id),
          supabase.from('character_relations').select('id, target_character_id, relation_name').eq('source_character_id', id),
          supabase.from('characters').select('gender'),
          supabase.from('character_org_relations').select('id, org_id, relation_name').eq('character_id', id)
        ]);

        const charOrgRows = (charOrgRelRes.data || []).map(r => ({ id: r.id, target_id: r.org_id, relation_name: r.relation_name }));
        setCharOrgRelations(charOrgRows);
        setInitialCharOrgRelations(charOrgRows);

        setAllWorlds(wRes.data || []);
        setAllOrgs(oRes.data || []);
        setAllCharacters(allCharsRes.data || []);
        setRelations(relRes.data || []);
        setInitialRelations(relRes.data || []);

        if (cRes.data) {
          setName(cRes.data.name);
          setGender(cRes.data.gender || '未設定');

          const desc = cRes.data.description ? JSON.parse(cRes.data.description) : {};
          setPersonality(desc.personality || '');
          setBackground(desc.background || '');
          setMemo(desc.memo || '');
          setStringAttributes(desc.string_attributes || {});

          setStats(cRes.data.stats || {});
          setStatNotes(cRes.data.stat_notes || {});
          const worldIds = cRes.data.character_worlds.map((w: any) => w.world_id);
          setSelectedWorlds(worldIds);
          setInitialWorlds(worldIds);
          setSelectedOrgs(cRes.data.character_organizations.map((o: any) => o.org_id));

          // 組織関係の初期化
          const orgRelsMap: Record<string, string> = {};
          cRes.data.character_organizations.forEach((co: any) => {
            orgRelsMap[co.org_id] = co.relation_name || '';
          });
          setOrgRelations(orgRelsMap);
          setInitialOrgRelations(orgRelsMap);
        }

        const dbGenders = (genderRes.data || [])
          .map((c: any) => c.gender)
          .filter((g: string | null): g is string => !!g && g.trim() !== '');

        let localTags: string[] = [];
        try {
          const stored = localStorage.getItem(STORAGE_KEY_GENDER_TAGS);
          if (stored) localTags = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to load local gender tags:', e);
        }

        const mergedTags = Array.from(new Set([...DEFAULT_GENDER_TAGS, ...dbGenders, ...localTags]));
        setGenderTags(mergedTags);
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // 新しい性別/属性タグの追加
  const addGenderTag = () => {
    const input = prompt('新しい性別 / 属性タグを入力してください（例: 龍族, 精霊, サイボーグ）');
    if (input && input.trim() !== '') {
      const newTag = input.trim();
      if (!genderTags.includes(newTag)) {
        const updated = [...genderTags, newTag];
        setGenderTags(updated);
        try {
          const stored = localStorage.getItem(STORAGE_KEY_GENDER_TAGS);
          const localTags = stored ? JSON.parse(stored) : [];
          if (!localTags.includes(newTag)) {
            localStorage.setItem(STORAGE_KEY_GENDER_TAGS, JSON.stringify([...localTags, newTag]));
          }
        } catch (e) {
          console.error('Failed to save custom gender tag:', e);
        }
      }
      setGender(newTag);
    }
  };

  // 世界観タグ切り替え時の自動インポート
  const handleWorldToggle = (wId: string) => {
    const isSelecting = !selectedWorlds.includes(wId);
    setSelectedWorlds(prev => isSelecting ? [...prev, wId] : prev.filter(i => i !== wId));

    if (isSelecting) {
      const world = allWorlds.find((w: any) => w.id === wId);
      if (world) {
        const rawSchemas = [
          ...(world.char_stats_schema || []),
          ...(world.stats_schema || [])
        ];
        const parsedItems = parseSchemaItems(rawSchemas);

        if (parsedItems.length > 0) {
          const newStats = { ...stats };
          const newAttr = { ...stringAttributes };

          parsedItems.forEach(item => {
            if (item.type === 'number') {
              if (newStats[item.name] === undefined) newStats[item.name] = 0;
            } else if (item.type === 'string') {
              if (newAttr[item.name] === undefined) newAttr[item.name] = '';
            }
          });

          setStats(newStats);
          setStringAttributes(newAttr);
        }
      }
    }
  };

  // 組織タグ選択の切り替え
  const handleOrgToggle = (oId: string) => {
    const isSelecting = !selectedOrgs.includes(oId);
    setSelectedOrgs(prev => isSelecting ? [...prev, oId] : prev.filter(i => i !== oId));

    if (isSelecting) {
      const org = allOrgs.find((o: any) => o.id === oId);
      if (org && org.stats_schema) {
        const parsedItems = parseSchemaItems(org.stats_schema);

        if (parsedItems.length > 0) {
          const newStats = { ...stats };
          const newAttr = { ...stringAttributes };

          parsedItems.forEach(item => {
            if (item.type === 'number') {
              if (newStats[item.name] === undefined) newStats[item.name] = 0;
            } else if (item.type === 'string') {
              if (newAttr[item.name] === undefined) newAttr[item.name] = '';
            }
          });

          setStats(newStats);
          setStringAttributes(newAttr);
        }
      }
    }
  };

  // 既存の値は上書きしない（新規作成画面と同じ挙動）
  const applyStandardStats = () => {
    setStats(prev => ({
      ...prev,
      'HP': prev['HP'] ?? 100,
      '攻撃力': prev['攻撃力'] ?? 10,
      '防御力': prev['防御力'] ?? 10
    }));
  };

  const addCustomStat = () => {
    const sName = prompt("変数名を入力（例：運、カリスマ）");
    if (sName && sName.trim() !== '') {
      const trimmed = sName.trim();
      setStats(prev => ({ ...prev, [trimmed]: prev[trimmed] ?? 0 }));
    }
  };

  // 変数と一緒に備考も削除する
  const deleteStat = (key: string) => {
    const ns = { ...stats };
    delete ns[key];
    setStats(ns);

    const nn = { ...statNotes };
    delete nn[key];
    setStatNotes(nn);
  };

  const handleSave = async () => {
    // 失敗した時点で中断し、成功したように一覧へ戻らない
    let partiallySaved = false;
    const check = (error: { message: string } | null, label: string) => {
      if (!error) return true;
      console.error(`${label} error:`, error);
      alert(
        `${label}に失敗しました:\n${error.message}` +
        (partiallySaved ? '\n\n一部の変更は保存済みです。ページを再読み込みして内容を確認してください。' : '')
      );
      return false;
    };

    const descJson = JSON.stringify({
      personality,
      background,
      memo,
      string_attributes: stringAttributes
    });

    // 基本情報の更新
    const { error: charError } = await supabase.from('characters').update({
      name,
      gender,
      description: descJson,
      stats,
      stat_notes: statNotes
    }).eq('id', id);
    if (!check(charError, 'キャラクター情報の保存')) return;
    partiallySaved = true;

    // 中間テーブルの更新
    // 全削除→再登録だと途中で失敗した際に紐付けが消えるため、変更分のみ反映する

    // 世界観
    const worldsToRemove = initialWorlds.filter(wId => !selectedWorlds.includes(wId));
    const worldsToAdd = selectedWorlds.filter(wId => !initialWorlds.includes(wId));
    if (worldsToRemove.length > 0) {
      const { error } = await supabase.from('character_worlds').delete().eq('character_id', id).in('world_id', worldsToRemove);
      if (!check(error, '世界観の紐付け解除')) return;
    }
    if (worldsToAdd.length > 0) {
      const { error } = await supabase.from('character_worlds').insert(worldsToAdd.map(wId => ({ character_id: id, world_id: wId })));
      if (!check(error, '世界観の紐付け')) return;
    }

    // 組織（役職のみ変更されたものは update）
    const initialOrgIds = Object.keys(initialOrgRelations);
    const orgsToRemove = initialOrgIds.filter(oId => !selectedOrgs.includes(oId));
    const orgsToAdd = selectedOrgs.filter(oId => !initialOrgIds.includes(oId));
    const orgsToUpdate = selectedOrgs.filter(
      oId => initialOrgIds.includes(oId) && (orgRelations[oId] || '') !== initialOrgRelations[oId]
    );
    if (orgsToRemove.length > 0) {
      const { error } = await supabase.from('character_organizations').delete().eq('character_id', id).in('org_id', orgsToRemove);
      if (!check(error, '組織の紐付け解除')) return;
    }
    if (orgsToAdd.length > 0) {
      const { error } = await supabase.from('character_organizations').insert(
        orgsToAdd.map(oId => ({
          character_id: id,
          org_id: oId,
          relation_name: orgRelations[oId] || null
        }))
      );
      if (!check(error, '組織の紐付け')) return;
    }
    for (const oId of orgsToUpdate) {
      const { error } = await supabase
        .from('character_organizations')
        .update({ relation_name: orgRelations[oId] || null })
        .eq('character_id', id)
        .eq('org_id', oId);
      if (!check(error, '組織内での役職の更新')) return;
    }

    // キャラクター間の関係（入力が空の行は削除扱い）
    const validRels = relations.filter(r => r.target_character_id && r.relation_name.trim() !== '');
    const keptRelIds = validRels.flatMap(r => (r.id ? [r.id] : []));
    const relIdsToDelete = initialRelations.flatMap(r => (r.id && !keptRelIds.includes(r.id) ? [r.id] : []));
    const relsToInsert = validRels.filter(r => !r.id);
    const relsToUpdate = validRels.filter(r => {
      const before = initialRelations.find(ir => ir.id === r.id);
      return before && (before.target_character_id !== r.target_character_id || before.relation_name !== r.relation_name.trim());
    });
    if (relIdsToDelete.length > 0) {
      const { error } = await supabase.from('character_relations').delete().in('id', relIdsToDelete);
      if (!check(error, '関係の削除')) return;
    }
    if (relsToInsert.length > 0) {
      const { error } = await supabase.from('character_relations').insert(
        relsToInsert.map(r => ({
          source_character_id: id,
          target_character_id: r.target_character_id,
          relation_name: r.relation_name.trim()
        }))
      );
      if (!check(error, '関係の追加')) return;
    }
    for (const r of relsToUpdate) {
      const { error } = await supabase
        .from('character_relations')
        .update({ target_character_id: r.target_character_id, relation_name: r.relation_name.trim() })
        .eq('id', r.id);
      if (!check(error, '関係の更新')) return;
    }

    // 組織への関係（所属とは別）
    const charOrgError = await saveRelationRows({
      table: 'character_org_relations',
      ownerColumn: 'character_id',
      ownerId: id as string,
      targetColumn: 'org_id',
      initial: initialCharOrgRelations,
      current: charOrgRelations,
    });
    if (!check(charOrgError, '組織への関係の保存')) return;

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

          {/* 名前＆性別/属性入力 */}
          <section className="bg-slate-800/20 p-8 rounded-[2.5rem] border border-slate-700 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">個体識別名 *</label>
              <input
                className="bg-transparent text-5xl font-bold text-white w-full outline-none border-b-2 border-slate-800 focus:border-blue-500 pb-2 transition-all placeholder:text-slate-700"
                placeholder="名前を入力..."
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>

            {/* 性別 / 属性 タグ選択 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">性別 / 属性 タグ</label>
                <button
                  onClick={addGenderTag}
                  className="text-[9px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 hover:text-white hover:bg-slate-700 transition-all"
                >
                  + タグを追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {genderTags.map(tag => {
                  const isSelected = gender === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setGender(tag)}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 世界観・組織固有の文字列型属性設定 */}
            {Object.keys(stringAttributes).length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <label className="text-[10px] font-black text-indigo-400 block uppercase tracking-widest">
                  固有の文字列属性・タグ
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(stringAttributes).map(attrName => (
                    <div key={attrName} className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-slate-300 block">{attrName}</span>
                      <input
                        type="text"
                        placeholder="例: 隊長, 光属性, ランクA..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-indigo-300 outline-none focus:border-indigo-500"
                        value={stringAttributes[attrName]}
                        onChange={e => setStringAttributes({ ...stringAttributes, [attrName]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                        onChange={e => setStatNotes({ ...statNotes, [s]: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <input
                        type="number" min="0" max="999"
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right w-20 text-blue-400 font-mono text-lg outline-none"
                        value={stats[s]}
                        onChange={e => setStats({ ...stats, [s]: Math.max(0, Math.min(999, Number(e.target.value))) })}
                      />
                      <button onClick={() => deleteStat(s)} className="text-[8px] text-red-500/50 hover:text-red-500 uppercase font-bold">Delete</button>
                    </div>
                  </div>
                  <input type="range" min="0" max="999" className="w-full accent-blue-500" value={stats[s]} onChange={e => setStats({ ...stats, [s]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
          </section>

          {/* 相関関係設定 */}
          <section className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">キャラクター相関関係設定</h3>
                <p className="text-[10px] text-slate-500">他キャラクターとの関係（矢印と説明ラベル）を定義します</p>
              </div>
              <button
                type="button"
                onClick={() => setRelations([...relations, { target_character_id: '', relation_name: '' }])}
                className="text-[9px] bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all font-bold"
              >
                + 関係を追加
              </button>
            </div>

            {relations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                相関関係はまだ設定されていません。「+ 関係を追加」ボタンから定義できます。
              </div>
            ) : (
              <div className="space-y-4">
                {relations.map((rel, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-800/10 p-4 rounded-2xl border border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase font-black">相手先</span>
                      <select
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        value={rel.target_character_id}
                        onChange={e => setRelations(relations.map((r, i) => i === idx ? { ...r, target_character_id: e.target.value } : r))}
                      >
                        <option value="">キャラクターを選択...</option>
                        {allCharacters.map(char => (
                          <option key={char.id} value={char.id}>{char.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                      <span className="text-[10px] text-slate-500 uppercase font-black">関係性</span>
                      <input
                        type="text"
                        placeholder="例: 親友、ライバル、宿敵..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 outline-none focus:border-indigo-500"
                        value={rel.relation_name}
                        onChange={e => setRelations(relations.map((r, i) => i === idx ? { ...r, relation_name: e.target.value } : r))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setRelations(relations.filter((_, i) => i !== idx))}
                      className="text-[10px] text-red-500/50 hover:text-red-500 font-bold px-2 py-1"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 組織への関係（所属とは別） */}
          <RelationRowsEditor
            title="組織への関係（所属以外）"
            description="所属していない組織への感情や関わり（相関図にキャラから組織への矢印で表示されます）"
            theme="rose"
            targetLabel="相手の組織"
            targetPlaceholder="組織を選択..."
            namePlaceholder="例: 復讐心、憧れ、潜入中..."
            emptyMessage="組織への関係はまだ設定されていません。「+ 関係を追加」ボタンから定義できます。"
            options={allOrgs}
            rows={charOrgRelations}
            onChange={setCharOrgRelations}
          />
        </div>

        {/* サイドバー */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 space-y-6">
            <TagSelector label="世界観（自動インポート）" color="text-blue-500" options={allWorlds} selected={selectedWorlds} onToggle={handleWorldToggle} />
            <TagSelector label="所属組織" color="text-emerald-500" options={allOrgs} selected={selectedOrgs} onToggle={handleOrgToggle} />

            {selectedOrgs.length > 0 && (
              <div className="bg-slate-800/20 p-6 rounded-3xl border border-slate-700 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">組織内での役職・関係性</h3>
                <div className="space-y-3">
                  {selectedOrgs.map(oId => {
                    const org = allOrgs.find(o => o.id === oId);
                    if (!org) return null;
                    return (
                      <div key={oId} className="flex flex-col gap-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-300">{org.name}</span>
                        <input
                          type="text"
                          placeholder="例: 隊長、元メンバー、潜入中..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 outline-none focus:border-emerald-500"
                          value={orgRelations[oId] || ''}
                          onChange={e => setOrgRelations({ ...orgRelations, [oId]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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