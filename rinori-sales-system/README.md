# Rinori 売上管理システム V1.3

Next.js + Prisma + SQLiteで構築された売上管理システムです。

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. データベースの初期化:
```bash
npx prisma migrate dev --name init
```

3. 開発サーバーの起動:
```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite
- **ORM**: Prisma

## プロジェクト構造

```
src/
  app/          # App Router pages
  components/   # React components
  lib/          # Utilities (Prisma client等)
prisma/
  schema.prisma # Database schema
```

## 実装済み機能

- [x] プロジェクト初期化
- [x] データベーススキーマ定義（全11テーブル）
- [x] トップページ（ダッシュボード）
- [x] 商品マスタ管理
- [x] 売上CSV取込
- [x] 予算設定
- [x] PL画面
- [x] 広告費管理
- [x] ログイン・認証 (NextAuth)
- [x] 税率設定
