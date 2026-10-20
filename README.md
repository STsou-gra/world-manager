キャラクター・組織・世界観ごと管理できる、キャラクター設定Webアプリケーション。

今後やること
・その他UIの乱れや新規作成時の変数追加不可などの修正

## セットアップ

### 1. 環境変数

プロジェクト直下の `.env.local` に、Supabase 管理画面の「Project Settings → API」にある値を設定します。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` でも動きます。

ログイン画面の「新規登録」ボタンは、初期状態では表示しません。自分以外の人にも登録してもらう場合だけ、`NEXT_PUBLIC_ALLOW_SIGNUP=true` を追加します（Supabase 側でも新規登録をオンにする必要があります）。

### 2. データベース

Supabase 管理画面の SQL Editor で、`supabase/migrations/` のファイルを**番号順に**実行します。
テーブルや列がすでにある場合は何もしないので、既存の DB に流しても安全です。

| ファイル | 内容 |
|---|---|
| `20261019000000_base_schema.sql` | 基本テーブル（世界観・組織・キャラ・各紐付け） |
| `20261019000100_auth_rls.sql` | ログインユーザーごとにデータを分ける設定（RLS） |
| `20261019000200_relations_and_layouts.sql` | 組織同士の関係、キャラ→組織の関係、相関図の配置 |

Supabase CLI を使う場合は `supabase db push` でも適用できます。

### 3. ログインの設定（自分だけで使う場合）

1. **自分のアカウントを作る**: Supabase 管理画面の「Authentication → Users → Add user → Create new user」で、メールアドレスとパスワードを入力し、「Auto Confirm User」にチェックを入れて作成します（確認メールなしで、すぐログインできます）
2. **新規登録を止める**: 「Authentication → Sign In / Providers」で「Allow new users to sign up」をオフにします。公開URLを知った人がアカウントを作れなくなります（すでにあるアカウントは、そのままログインできます）
3. **URL を登録する**: 「Authentication → URL Configuration」で次を設定します
   - Site URL: `http://localhost:3000`（Vercel で公開した場合は公開URL）
   - Redirect URLs: `http://localhost:3000/**`（公開した場合は `https://公開URL/auth/callback` も追加）

Supabase 標準のメール送信は、Supabase のチームメンバーのメールアドレスにしか届かず、送信数も少なく制限されています。アカウントは上の方法で、管理画面から作るのが確実です。

### 4. 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開くとログイン画面が表示されます。

## 既存のデータがある場合（ログイン機能を入れる前から使っている場合）

`20261019000100_auth_rls.sql` を実行すると、これまでのデータは持ち主が決まっていないため、アプリから見えなくなります。次の順番で移行してください。

1. 自分のアカウントを作る（上の「3. ログインの設定」の 1）
2. SQL Editor で `supabase/migrations/` のファイルを番号順に実行する
3. `supabase/scripts/assign_existing_data.sql` のメールアドレスを自分のものに書き換えて実行する
4. アプリにログインすると、これまでのデータが表示される

相関図の配置は、これまでブラウザに保存されていました。そのブラウザで初めて相関図を開いたときに、自動でアカウントに引き継がれます。

## Vercel で公開する

**公開する前に**、上の「2. データベース」と「既存のデータがある場合」の手順を済ませてください。Supabase の接続キーは公開ページから誰でも見られるため、RLS が設定されていないと、URL を知った人が全データを読み書きできてしまいます（管理画面の Table Editor で、各テーブルの RLS が有効になっていることを確認できます）。

1. https://vercel.com に「Continue with GitHub」で登録する（個人・非商用なら無料の Hobby プランで可）
2. 「Add New… → Project」でこのリポジトリを Import する（一覧に出ない場合は「Adjust GitHub App Permissions」でアクセスを許可）
3. Framework Preset が Next.js になっていることを確認し、「Environment Variables」に `.env.local` と同じ値を入れる
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 「Deploy」を押す。数分で `https://〇〇.vercel.app` の公開URLができる
5. Supabase 管理画面の「Authentication → URL Configuration」で、Site URL を公開URLにし、Redirect URLs に `https://公開URL/auth/callback` を追加する
6. 公開URLを開き、ログインしてデータが表示されることを確認する

公開後の注意:

- `main` に取り込むたびに、本番が自動で更新されます。PR ごとにプレビュー用のURLも作られますが、本番と同じデータベースを使います。プレビューでもログインしたい場合は、Redirect URLs に `https://*-<Vercelのアカウント名またはチーム名>.vercel.app/**` を追加します
- `NEXT_PUBLIC_` で始まる環境変数はビルド時に埋め込まれます。Vercel で値を変えたら、「Deployments」の「…」→「Redeploy」で再デプロイしてください


## Next.jsの開始手順
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
