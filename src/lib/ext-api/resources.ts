import 'server-only';
import { parseCharacterDescription, parseOrganizationDescription, numberRecord, stringRecord } from './description';
import { isUuid, parseListQuery } from './query';
import { jsonError, jsonOk } from './responses';
import type { ScopedTable, UserScopedDb } from './with-api-user';

// 外部 API の応答の組み立て（WmCharacter / WmWorld / WmOrganization。snake_case）。
// 埋め込みの世界観・組織も、持ち主がトークンのユーザーと一致するものだけを返す

type Named = { id: string; name: string; user_id: string | null };

type CharacterRow = {
  id: string;
  name: string;
  kana: string | null;
  aliases: unknown;
  gender: string | null;
  description: string | null;
  stats: unknown;
  stat_notes: unknown;
  created_at: string;
  character_worlds: Array<{ worlds: Named | null }> | null;
  character_organizations: Array<{ relation_name: string | null; organizations: Named | null }> | null;
};

type WorldRow = { id: string; name: string; description: string | null; created_at: string };

type OrganizationRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  worlds: Named | null;
};

const ownedBy = (userId: string) => (item: Named | null): item is Named => item !== null && item.user_id === userId;

function toWmCharacter(row: CharacterRow, userId: string) {
  const description = parseCharacterDescription(row.description);
  const columnNotes = stringRecord(row.stat_notes);
  return {
    id: row.id,
    name: row.name,
    kana: row.kana ?? '',
    aliases: Array.isArray(row.aliases) ? row.aliases.filter((a): a is string => typeof a === 'string') : [],
    gender: row.gender,
    personality: description.personality,
    background: description.background,
    memo: description.memo,
    string_attributes: description.string_attributes,
    stats: numberRecord(row.stats),
    // 列（stat_notes）を優先し、無ければ description 内の stat_notes（新規作成画面が両方に保存している）
    stat_notes: Object.keys(columnNotes).length > 0 ? columnNotes : description.stat_notes,
    worlds: (row.character_worlds ?? [])
      .map((cw) => cw.worlds)
      .filter(ownedBy(userId))
      .map((w) => ({ id: w.id, name: w.name })),
    organizations: (row.character_organizations ?? []).flatMap((co) => {
      const org = co.organizations;
      if (!ownedBy(userId)(org)) return [];
      return [{ id: org.id, name: org.name, role: co.relation_name && co.relation_name.trim() !== '' ? co.relation_name : null }];
    }),
    created_at: row.created_at,
  };
}

function toWmWorld(row: WorldRow) {
  return { id: row.id, name: row.name, description: row.description ?? '', created_at: row.created_at };
}

function toWmOrganization(row: OrganizationRow, userId: string) {
  const description = parseOrganizationDescription(row.description);
  const world = ownedBy(userId)(row.worlds) ? { id: row.worlds.id, name: row.worlds.name } : null;
  return {
    id: row.id,
    name: row.name,
    world,
    summary: description.summary,
    history: description.history,
    created_at: row.created_at,
  };
}

type ResourceDef = {
  table: ScopedTable;
  columns: string;
  toDto: (row: never, userId: string) => unknown;
};

export const RESOURCES = {
  characters: {
    table: 'characters',
    columns:
      'id, name, kana, aliases, gender, description, stats, stat_notes, created_at, ' +
      'character_worlds(worlds(id, name, user_id)), ' +
      'character_organizations(relation_name, organizations(id, name, user_id))',
    toDto: (row: CharacterRow, userId: string) => toWmCharacter(row, userId),
  },
  worlds: {
    table: 'worlds',
    columns: 'id, name, description, created_at',
    toDto: (row: WorldRow) => toWmWorld(row),
  },
  organizations: {
    table: 'organizations',
    columns: 'id, name, description, created_at, worlds(id, name, user_id)',
    toDto: (row: OrganizationRow, userId: string) => toWmOrganization(row, userId),
  },
} satisfies Record<string, ResourceDef>;

export type ResourceName = keyof typeof RESOURCES;

function mapRows(resource: ResourceName, rows: unknown[], userId: string): unknown[] {
  const def = RESOURCES[resource];
  return rows.map((row) => (def.toDto as (r: unknown, u: string) => unknown)(row, userId));
}

/** GET /api/ext/v1/<resource>（ids、または cursor + limit） */
export async function listResponse(db: UserScopedDb, resource: ResourceName, params: URLSearchParams): Promise<Response> {
  const def = RESOURCES[resource];
  const query = parseListQuery(params);
  if (query.kind === 'ids') {
    if (query.ids.length === 0) return jsonOk({ data: [], next_cursor: null });
    const { data, error } = await db.select(def.table, def.columns).in('id', query.ids);
    if (error) return dbError(error);
    return jsonOk({ data: mapRows(resource, data ?? [], db.userId), next_cursor: null });
  }
  // 1 件多く読んで次のページの有無を判定する。並び順は created_at → id（ページ送りが安定するように）
  const { data, error } = await db
    .select(def.table, def.columns)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(query.offset, query.offset + query.limit);
  if (error) return dbError(error);
  const rows = data ?? [];
  const hasNext = rows.length > query.limit;
  return jsonOk({
    data: mapRows(resource, rows.slice(0, query.limit), db.userId),
    next_cursor: hasNext ? String(query.offset + query.limit) : null,
  });
}

/** GET /api/ext/v1/<resource>/:id（他ユーザーの ID・UUID でない ID は 404） */
export async function detailResponse(db: UserScopedDb, resource: ResourceName, id: string): Promise<Response> {
  if (!isUuid(id)) return notFound();
  const def = RESOURCES[resource];
  const { data, error } = await db.select(def.table, def.columns).eq('id', id).maybeSingle();
  if (error) return dbError(error);
  if (!data) return notFound();
  return jsonOk(mapRows(resource, [data], db.userId)[0]);
}

function notFound(): Response {
  return jsonError('NOT_FOUND', '見つかりません');
}

function dbError(error: { message: string }): Response {
  console.error('[ext-api] query failed:', error.message);
  return jsonError('INTERNAL_ERROR', 'データを読み込めませんでした');
}
