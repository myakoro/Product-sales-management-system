# Render デプロイ - テーブル作成問題

## 現状

- ✅ デプロイ成功
- ✅ ログイン成功 (`admin` / `admin`)
- ❌ ログイン後、エラーが表示される

## エラー内容

```
Failed to seed data:
Invalid `prisma.salesChannel.upsert()` invocation:
The table `main.sales_channels` does not exist in the current database.
```

## 環境

- **Platform**: Render (Web Service)
- **Node.js**: v22.16.0
- **Database**: SQLite on Persistent Disk (`/var/data/dev.db`)
- **Framework**: Next.js 14.2.18
- **ORM**: Prisma 5.22.0

## 実装した初期化ロジック

### `scripts/init-db.cjs`

```javascript
(async () => {
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";
    
    // Check if database needs initialization
    let needsInit = false;
    
    if (!fs.existsSync(dbPath)) {
        console.log("🔧 Database file not found. Will initialize.");
        needsInit = true;
    } else {
        console.log("📄 Database file exists. Checking if tables exist...");
        
        const prisma = new PrismaClient();
        try {
            await prisma.user.count();
            console.log("✅ Database tables exist. Skipping initialization.");
            await prisma.$disconnect();
        } catch (error) {
            console.log("⚠️  Database tables do not exist. Will initialize.");
            needsInit = true;
            await prisma.$disconnect();
        }
    }
    
    if (needsInit) {
        execSync("npx prisma db push", { stdio: "inherit" });
        execSync("node prisma/seed.js", { stdio: "inherit" });
    }
})();
```

### `package.json`

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "node scripts/init-db.cjs && next start"
  }
}
```

## 問題

1. **DBファイルは存在する**（前回の起動で作成済み）
2. **テーブルが存在しない**（`prisma db push` がスキップされている）
3. **Seed が実行され、テーブル不在エラーが発生**

## 推測される原因

### 可能性1: `prisma.user.count()` が成功してしまう
- 空のDBファイルに対して、Prismaが何らかの理由でエラーを投げない
- テーブルが無くても `count()` が成功する？

### 可能性2: Prisma Client のキャッシュ
- 以前の状態がキャッシュされている
- `$disconnect()` が不十分

### 可能性3: 非同期処理のタイミング
- `await prisma.user.count()` が正しく待機されていない
- エラーハンドリングが機能していない

## 試したこと

1. ✅ Build Command から `prisma db push` を削除（Build時はDisk未マウント）
2. ✅ `init-db.js` → `init-db.cjs` にリネーム（CommonJS対応）
3. ✅ async IIFE でラップ（top-level await 対応）
4. ✅ テーブル存在チェックロジックを実装

## 質問

1. **SQLiteでテーブル存在を確実にチェックする方法は？**
   - `prisma.user.count()` 以外の方法
   - SQLiteの `.tables` 相当のチェック

2. **Render環境特有の問題はあるか？**
   - Persistent Disk のマウントタイミング
   - Prisma Client の挙動

3. **より確実な初期化方法は？**
   - 毎回 `prisma db push --force-reset` を実行？
   - DBファイルを削除してから再作成？

## 期待する解決策

- ログイン後、エラーなくダッシュボードが表示される
- 販路・広告カテゴリなどのマスタデータが正常に登録される
