// 「相手 + 関係名」の行（組織→組織、キャラ→組織の関係）の保存処理
import { supabase } from './supabase';

// id は保存済みの行のみ持つ（画面で追加した行は未設定）
export type RelationRow = {
  id?: string;
  target_id: string;
  relation_name: string;
};

// 相手と関係名の両方が入力された行だけを返す
export function validRelationRows(rows: RelationRow[]) {
  return rows.filter(r => r.target_id && r.relation_name.trim() !== '');
}

// 読み込み時点の行と比べて、削除・追加・更新する行を求める（入力が空の行は削除扱い）
export function diffRelationRows(initial: RelationRow[], current: RelationRow[]) {
  const valid = validRelationRows(current);
  const keptIds = valid.flatMap(r => (r.id ? [r.id] : []));
  return {
    toDelete: initial.flatMap(r => (r.id && !keptIds.includes(r.id) ? [r.id] : [])),
    toInsert: valid.filter(r => !r.id),
    toUpdate: valid.filter(r => {
      const before = initial.find(i => i.id === r.id);
      return before && (before.target_id !== r.target_id || before.relation_name !== r.relation_name.trim());
    }),
  };
}

// 変更分だけを保存する。失敗したらそこで止めてエラーを返す
export async function saveRelationRows({
  table,
  ownerColumn,
  ownerId,
  targetColumn,
  initial,
  current,
}: {
  table: string;
  ownerColumn: string;
  ownerId: string;
  targetColumn: string;
  initial: RelationRow[];
  current: RelationRow[];
}): Promise<{ message: string } | null> {
  const { toDelete, toInsert, toUpdate } = diffRelationRows(initial, current);

  if (toDelete.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', toDelete);
    if (error) return error;
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from(table).insert(
      toInsert.map(r => ({ [ownerColumn]: ownerId, [targetColumn]: r.target_id, relation_name: r.relation_name.trim() }))
    );
    if (error) return error;
  }
  for (const r of toUpdate) {
    const { error } = await supabase
      .from(table)
      .update({ [targetColumn]: r.target_id, relation_name: r.relation_name.trim() })
      .eq('id', r.id);
    if (error) return error;
  }
  return null;
}
