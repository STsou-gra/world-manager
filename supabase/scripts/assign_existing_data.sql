-- =========================================================
-- これまでのデータ（user_id が空の行）を、指定したアカウントのものにする
--
-- 使い方:
--   1. 下の 'you@example.com' を、自分のログイン用メールアドレスに書き換える
--   2. Supabase 管理画面の SQL Editor に貼り付けて実行する
--
-- 何度実行しても、すでに持ち主がいる行は変わらない。
-- =========================================================

do $$
declare
  target_email text := 'you@example.com';  -- ← ここを書き換える
  target_user uuid;
begin
  select id into target_user from auth.users where email = target_email;
  if target_user is null then
    raise exception 'アカウントが見つかりません: %（先にアプリで新規登録するか、管理画面の Authentication → Users で作成してください）', target_email;
  end if;

  update public.worlds                  set user_id = target_user where user_id is null;
  update public.organizations           set user_id = target_user where user_id is null;
  update public.characters              set user_id = target_user where user_id is null;
  update public.character_worlds        set user_id = target_user where user_id is null;
  update public.character_organizations set user_id = target_user where user_id is null;
  update public.character_relations     set user_id = target_user where user_id is null;
end $$;
