import 'server-only';

// world-manager の description（JSON 文字列）の解釈。JSON として読めない旧データは、
// キャラは memo、組織は summary にそのまま入れる。値が無い文字列は ""、オブジェクトは {}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

function parseObject(raw: string | null | undefined): Record<string, unknown> | 'invalid' | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : 'invalid';
  } catch {
    return 'invalid';
  }
}

/** 文字列の値だけを持つオブジェクト（数値・真偽値は文字列にする。それ以外は捨てる） */
export function stringRecord(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string') out[key] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[key] = String(v);
  }
  return out;
}

/** 数値の値だけを持つオブジェクト（数値の文字列は数値にする。それ以外は捨てる） */
export function numberRecord(value: unknown): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, v] of Object.entries(value)) {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

export type CharacterDescription = {
  personality: string;
  background: string;
  memo: string;
  string_attributes: Record<string, string>;
  stat_notes: Record<string, string>;
};

export function parseCharacterDescription(raw: string | null | undefined): CharacterDescription {
  const parsed = parseObject(raw);
  if (parsed === 'invalid') {
    return { personality: '', background: '', memo: raw ?? '', string_attributes: {}, stat_notes: {} };
  }
  const d = parsed ?? {};
  return {
    personality: str(d.personality),
    background: str(d.background),
    memo: str(d.memo),
    string_attributes: stringRecord(d.string_attributes),
    stat_notes: stringRecord(d.stat_notes),
  };
}

export type OrganizationDescription = { summary: string; history: string };

export function parseOrganizationDescription(raw: string | null | undefined): OrganizationDescription {
  const parsed = parseObject(raw);
  if (parsed === 'invalid') return { summary: raw ?? '', history: '' };
  const d = parsed ?? {};
  return { summary: str(d.summary), history: str(d.history) };
}
