# Render デプロイ問題の相談内容

## 環境

- **プラットフォーム**: Render (Web Service)
- **フレームワーク**: Next.js 14.2.18
- **データベース**: SQLite (Prisma ORM使用)
- **Node.js**: 最新版（Renderデフォルト）
- **ストレージ**: Persistent Disk を `/var/data` にマウント設定済み

### 現在の設定

**Environment Variables (Render):**
```
DATABASE_URL=file:/var/data/dev.db
```

**Disk Configuration (Render):**
```
Mount Path: /var/data
Size: 1GB (最小サイズ)
```

**package.json (関連部分):**
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "mkdir -p /var/data && npx prisma db push && node prisma/seed.js && next start"
  }
}
```

---

## 現状（発生している問題）

### エラー内容

デプロイ時、**ビルドは成功するが、起動（Start）フェーズで失敗**する。

```
Error: Schema engine error:
Creating SQLite database parent directory.
Read-only file system (os error 30)
==> Build failed ❌
```

### エラー発生箇所

- **Build Phase**: ✅ 成功
- **Start Phase**: ❌ 失敗（`prisma db push` 実行時）

### 具体的な失敗タイミング

`start` スクリプトの以下のコマンド実行時：
```bash
npx prisma db push
```

Prismaが `/var/data/dev.db` を作成しようとして、親ディレクトリ `/var/data` を作成しようとするが、「Read-only file system」エラーで失敗。

---

## やりたいこと

1. **SQLiteデータベースをPersistent Disk上に永続化**
   - データが再起動で消えないようにする
   
2. **起動時に自動的にDB初期化**
   - テーブル作成（`prisma db push`）
   - 初期データ投入（`node prisma/seed.js`）
   - Adminユーザー作成を含む

3. **本番環境で安定稼働**
   - `admin` / `admin123` でログイン可能な状態にする

---

## これまでやってきたこと

### 試行錯誤の履歴

1. **`DATABASE_URL` の修正**
   - `file:./dev.db` → `file:/var/data/dev.db` に変更
   - 目的: 永続ディスク上にDB配置

2. **`start` スクリプトに自動初期化を追加**
   ```json
   "start": "npx prisma db push && node prisma/seed.js && next start"
   ```
   - 目的: 起動時にDB作成＋初期データ投入

3. **`prisma` を `dependencies` に移動**
   - `devDependencies` → `dependencies`
   - 目的: 本番環境で `prisma` CLI使用可能に

4. **ビルドスクリプトの調整**
   - 当初 `cross-env DATABASE_URL="file:./build.db"` を追加したが、不要と判明し削除
   - 最終的に `"build": "prisma generate && next build"` のみ

5. **ディレクトリ作成コマンド追加（最新）**
   ```json
   "start": "mkdir -p /var/data && npx prisma db push && ..."
   ```
   - 目的: `/var/data` が存在しない場合に作成を試みる
   - **結果**: 依然として「Read-only file system」エラー

---

## どうしてほしいか

### 質問・相談内容

1. **Renderの Persistent Disk は起動時にマウントされているのか？**
   - マウントタイミングの問題？
   - `start` スクリプト実行時点では未マウント？

2. **`/var/data` への書き込み権限はあるのか？**
   - Diskはマウントされているが、権限がない？
   - 確認方法は？

3. **`mkdir -p /var/data` は正しいアプローチか？**
   - マウントポイントをアプリ側から作成するのは適切？
   - それとも別の方法があるべき？

4. **SQLite + Render + Persistent Disk の正しい構成は？**
   - 同様の構成で成功している事例の設定方法
   - Renderの公式推奨パターンがあれば知りたい

5. **代替案はあるか？**
   - PostgreSQLなど外部DBサービスへの移行を検討すべき？
   - それともSQLiteで解決可能？

### 期待する回答

- エラーの根本原因の特定
- Render + SQLite + Persistent Disk での正しい設定手順
- 具体的な修正方法（コマンド、設定値など）

---

## 補足情報

- ローカル環境では正常に動作確認済み
- `admin` / `admin123` でログイン可能
- データベース操作も問題なし
