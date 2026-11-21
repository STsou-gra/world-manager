-- =========================================================
-- キャラクターの「読み（ふりがな）」と「別名・愛称」
--
-- ・kana   : 読み。未入力は ''
-- ・aliases: 別名・愛称の配列（JSON の文字列の配列）。未入力は []
-- 既存の行は '' / [] になる。RLS は既存の owner_only がそのまま効く
--
-- 何度流しても安全な書き方にしている
-- =========================================================

alter table public.characters add column if not exists kana text not null default '';
alter table public.characters add column if not exists aliases jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_aliases_is_array'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_aliases_is_array check (jsonb_typeof(aliases) = 'array');
  end if;
end $$;
