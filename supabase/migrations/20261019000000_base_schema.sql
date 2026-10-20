-- =========================================================
-- 基本テーブル（これまでのアプリが使っているテーブル）
--
-- アプリのコードから定義を起こしたもの。
-- テーブルや列が既にある場合は何もしないので、既存の DB に流しても安全。
-- =========================================================

-- 世界観
create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  stats_schema jsonb default '[]'::jsonb,       -- 旧形式。char_stats_schema と同じ内容を保存している
  char_stats_schema jsonb default '[]'::jsonb,  -- キャラ用の固有ステータス定義 [{name, type}]
  org_stats_schema jsonb default '[]'::jsonb,   -- 組織用の固有ステータス定義 [{name, type}]
  created_at timestamptz not null default now()
);
alter table public.worlds add column if not exists description text;
alter table public.worlds add column if not exists stats_schema jsonb default '[]'::jsonb;
alter table public.worlds add column if not exists char_stats_schema jsonb default '[]'::jsonb;
alter table public.worlds add column if not exists org_stats_schema jsonb default '[]'::jsonb;

-- 組織
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete set null,
  name text not null,
  description text,                              -- JSON 文字列 {summary, history}
  stats_schema jsonb default '[]'::jsonb,        -- 組織独自の固有ステータス定義
  stats jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.organizations add column if not exists description text;
alter table public.organizations add column if not exists stats_schema jsonb default '[]'::jsonb;
alter table public.organizations add column if not exists stats jsonb default '{}'::jsonb;

-- キャラクター
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text,
  description text,                              -- JSON 文字列 {personality, background, memo, string_attributes}
  stats jsonb default '{}'::jsonb,               -- 数値パラメータ {名前: 値}
  stat_notes jsonb default '{}'::jsonb,          -- パラメータの備考 {名前: 備考}
  created_at timestamptz not null default now()
);
alter table public.characters add column if not exists gender text;
alter table public.characters add column if not exists description text;
alter table public.characters add column if not exists stats jsonb default '{}'::jsonb;
alter table public.characters add column if not exists stat_notes jsonb default '{}'::jsonb;

-- キャラ ⇔ 世界観
create table if not exists public.character_worlds (
  character_id uuid not null references public.characters(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  primary key (character_id, world_id)
);

-- キャラ ⇔ 組織（所属と、組織内での役職）
create table if not exists public.character_organizations (
  character_id uuid not null references public.characters(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  relation_name text,                            -- 役職（隊長、元メンバーなど）
  primary key (character_id, org_id)
);
alter table public.character_organizations add column if not exists relation_name text;

-- キャラ → キャラの関係
create table if not exists public.character_relations (
  id uuid primary key default gen_random_uuid(),
  source_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  relation_name text not null,
  created_at timestamptz not null default now()
);
