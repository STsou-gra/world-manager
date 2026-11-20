-- =========================================================
-- 外部連携用の API トークン（Story-Manager などのアプリから、読み取り専用の API を呼ぶため）
--
-- ・トークンの平文は保存しない。SHA-256（16 進）だけを token_hash に保存し、照合はサーバーで行う
-- ・本人だけが一覧・発行・失効できる（他のテーブルと同じ owner_only）
-- ・revoked_at が入っているトークンは無効
-- ・外部 API（/api/ext/v1/*）はサーバー専用の service role キーで照合・読み取りを行う
--
-- 何度流しても安全な書き方にしている
-- =========================================================

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,                    -- 用途のメモ（例: Story-Manager）
  token_hash text not null unique,       -- トークンの SHA-256（16 進）
  token_prefix text not null,            -- 一覧表示用の先頭 12 文字（wmpat_xxxxxx）
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_tokens_user_id_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

drop policy if exists owner_only on public.api_tokens;
create policy owner_only on public.api_tokens for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.api_tokens from anon;
grant select, insert, update, delete on public.api_tokens to authenticated;
