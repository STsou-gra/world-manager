-- =========================================================
-- 新しい関係テーブルと、相関図の配置
--
-- ・organization_relations : 組織 → 組織の関係（同盟、敵対、下部組織 など）
-- ・character_org_relations: キャラ → 組織の関係。所属とは別に持てる（復讐心、憧れ、潜入対象 など）
-- ・relation_layouts       : 相関図の配置（世界観ごと）。どのPC・ブラウザで開いても同じ配置になる
--
-- どれも 20261019000100_auth_rls.sql と同じく、作ったユーザー本人だけが読み書きできる
-- =========================================================

create table if not exists public.organization_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  source_org_id uuid not null references public.organizations(id) on delete cascade,
  target_org_id uuid not null references public.organizations(id) on delete cascade,
  relation_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.character_org_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  relation_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.relation_layouts (
  world_id uuid primary key references public.worlds(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  positions jsonb not null default '{}'::jsonb,   -- {"org-<id>" | "char-<id>": {x, y}}
  org_sizes jsonb not null default '{}'::jsonb,   -- {"org-<id>": {width, height}}
  updated_at timestamptz not null default now()
);

create index if not exists organization_relations_user_id_idx    on public.organization_relations (user_id);
create index if not exists organization_relations_source_idx     on public.organization_relations (source_org_id);
create index if not exists character_org_relations_user_id_idx   on public.character_org_relations (user_id);
create index if not exists character_org_relations_character_idx on public.character_org_relations (character_id);
create index if not exists relation_layouts_user_id_idx          on public.relation_layouts (user_id);

alter table public.organization_relations  enable row level security;
alter table public.character_org_relations enable row level security;
alter table public.relation_layouts        enable row level security;

drop policy if exists owner_only on public.organization_relations;
drop policy if exists owner_only on public.character_org_relations;
drop policy if exists owner_only on public.relation_layouts;
create policy owner_only on public.organization_relations  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.character_org_relations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.relation_layouts        for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.organization_relations, public.character_org_relations, public.relation_layouts from anon;
grant select, insert, update, delete on public.organization_relations, public.character_org_relations, public.relation_layouts to authenticated;
