-- =========================================================
-- ログインユーザーごとにデータを分ける（RLS: 行レベルセキュリティ）
--
-- ・各テーブルに user_id（その行を作ったユーザー）を追加する。
--   行を作るとログイン中のユーザーが自動で入るので、アプリ側で指定する必要はない
-- ・これまでのポリシーはすべて削除し、「自分の行だけ読み書きできる」ポリシーに置き換える
--   （「誰でも読める」などのポリシーが残っていると、他人のデータが見えてしまうため）
-- ・ログインしていない人（anon）は何も読み書きできなくなる
--
-- 注意: これまでのデータは user_id が空なので、実行直後はアプリから見えなくなる。
--       supabase/scripts/assign_existing_data.sql で自分のアカウントに割り当てること
-- =========================================================

-- 所有者の列
alter table public.worlds                  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.organizations           add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.characters              add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.character_worlds        add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.character_organizations add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.character_relations     add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists worlds_user_id_idx                  on public.worlds (user_id);
create index if not exists organizations_user_id_idx           on public.organizations (user_id);
create index if not exists characters_user_id_idx              on public.characters (user_id);
create index if not exists character_worlds_user_id_idx        on public.character_worlds (user_id);
create index if not exists character_organizations_user_id_idx on public.character_organizations (user_id);
create index if not exists character_relations_user_id_idx     on public.character_relations (user_id);

-- これまでのポリシーをすべて削除
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('worlds', 'organizations', 'characters', 'character_worlds', 'character_organizations', 'character_relations')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- RLS を有効にして「自分の行だけ」のポリシーを作る
alter table public.worlds                  enable row level security;
alter table public.organizations           enable row level security;
alter table public.characters              enable row level security;
alter table public.character_worlds        enable row level security;
alter table public.character_organizations enable row level security;
alter table public.character_relations     enable row level security;

create policy owner_only on public.worlds                  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.organizations           for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.characters              for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.character_worlds        for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.character_organizations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_only on public.character_relations     for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ログインしていない人からは権限を外し、ログインした人には読み書きを許可する
revoke all on public.worlds, public.organizations, public.characters,
  public.character_worlds, public.character_organizations, public.character_relations
  from anon;
grant select, insert, update, delete on public.worlds, public.organizations, public.characters,
  public.character_worlds, public.character_organizations, public.character_relations
  to authenticated;
