// キャラクターの「読み」と「別名・愛称」の整え方と上限（Story-Manager の入力上限に合わせる）

export const KANA_MAX_LENGTH = 200;
export const ALIAS_MAX_LENGTH = 50;
export const ALIAS_MAX_COUNT = 50;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
  : null;

/** 見た目の文字数（絵文字・結合文字も 1 文字） */
export function charLength(text: string): number {
  return segmenter ? Array.from(segmenter.segment(text)).length : [...text].length;
}

/** 前後の空白を除き、空・重複を除く（名前と同じものも除く） */
export function normalizeAliases(aliases: readonly string[], name = ''): string[] {
  const trimmedName = name.trim();
  const out: string[] = [];
  for (const raw of aliases) {
    const alias = raw.trim();
    if (alias === '' || alias === trimmedName || out.includes(alias)) continue;
    out.push(alias);
  }
  return out;
}

/** 保存前の検証。問題があればメッセージ、無ければ null */
export function validateNameReadings(kana: string, aliases: readonly string[]): string | null {
  if (charLength(kana.trim()) > KANA_MAX_LENGTH) return `読みは ${KANA_MAX_LENGTH} 文字以内にしてください`;
  if (aliases.length > ALIAS_MAX_COUNT) return `別名・愛称は ${ALIAS_MAX_COUNT} 個以内にしてください`;
  const tooLong = aliases.find((a) => charLength(a) > ALIAS_MAX_LENGTH);
  if (tooLong) return `別名・愛称は 1 つ ${ALIAS_MAX_LENGTH} 文字以内にしてください（「${tooLong.slice(0, 20)}…」）`;
  return null;
}

/** DB の aliases（jsonb）を文字列の配列として読む */
export function readAliases(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
