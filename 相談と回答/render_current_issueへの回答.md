# Render + Prisma + SQLite（Persistent Disk）初期化エラー対策メモ

対象：Render（Web Service）上で Next.js + Prisma + SQLite（Persistent Disk）を運用していて、ログイン後に seed が失敗し「`sales_channels` テーブルが無い」系のエラーが出るケース。

---

## 1. 起きていること（症状）

- デプロイ自体は成功し、ログインもできる
- しかしログイン後に以下のようなエラーが出る

```
Failed to seed data:
Invalid `prisma.salesChannel.upsert()` invocation:
The table `main.sales_channels` does not exist in the current database.
```

---

## 2. 問題の本質（なぜ起きるか）

### 2.1 「DBファイルがある」≠「テーブルがある」
SQLite は “空の DB ファイル” が存在してもおかしくありません。
Persistent Disk でも「ファイルはあるが中身は空（テーブル無し）」が起き得ます。

### 2.2 Prisma の `count()` / `findFirst()` を “テーブル存在チェック” に使うのは不安定
`prisma.user.count()` 等は本来「データ件数取得」であり、テーブル存在確認のための API ではありません。
環境や接続先のズレ等があると、**誤って「OK」と判定してしまったように見える**ことがあります。

### 2.3 いちばん疑うべき真因：**見ているDBがズレている**
今回のような「あるはずのテーブルが無い」系で、実務上もっとも多いのはこれです。

- init スクリプトが見ている DB パス
- Next.js（アプリ本体）が見ている DB パス

が違う。

ズレの典型原因：
- `DATABASE_URL` がプロセスごとに違う（Render の設定／起動方法／dotenv）
- 相対パス `./prisma/dev.db` が **実行時のカレントディレクトリ**の違いで別ファイルを指す
- `prisma db push` / `seed.js` / Next.js が参照する `DATABASE_URL` が一致していない

---

## 3. 最優先の確認（必須チェック）

### 3.1 init-db.cjs に「DBの同一性ログ」を追加する
最低限、以下を出す：

- `process.cwd()`
- `process.env.DATABASE_URL`
- DBファイルの **絶対パス**
- （可能なら）DBファイルのサイズ

> **init が触ったDBと、アプリが触っているDBが同じか**を、ログで証明できない限り、原因特定がブレます。

### 3.2 Next.js 側（サーバ起動時）にも同じログを出す
- 起動直後に同じ情報を出して、init 側と一致しているか確認する

---

## 4. 推奨の解決策（最も堅牢）

### 4.1 “テーブル存在チェック”は SQLite の `sqlite_master` を使う
`.tables` 相当の唯一の正解は `sqlite_master` です。

- Prisma を使う必要はありません（`sqlite3` で直接見る）
- Prisma を使う場合でも `$queryRaw` で `sqlite_master` を読むのが正道

### 4.2 チェックするテーブル名は「実テーブル名」を使う
- Prisma のモデル名 `User` などは、実テーブル名と一致しないことがある（`@@map` や命名規則）
- 今回のエラーに直結している `sales_channels` のように **実際に必要で、かつ名前が確実なもの**をキーにする

---

## 5. 実装例（推奨：sqlite3 で `sqlite_master` を確認）

> ここでは「`sales_channels` が存在しなければ初期化」という例。  
> seed が触るテーブルが複数ある場合は **必須テーブル群を全部チェック**するのがおすすめです。

### 5.1 scripts/init-db.cjs（堅牢版）

```js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sqlite3 = require("sqlite3").verbose();

function resolveDbPath(databaseUrl) {
  const raw = (databaseUrl || "").replace(/^file:/, "");
  const p = raw || "./prisma/dev.db";
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

(async () => {
  const dbPath = resolveDbPath(process.env.DATABASE_URL);

  console.log("================================");
  console.log("🔍 Database Initialization Check");
  console.log("================================");
  console.log(`📌 cwd: ${process.cwd()}`);
  console.log(`📌 DATABASE_URL: ${process.env.DATABASE_URL || "(undefined)"}`);
  console.log(`📍 dbPath(resolved): ${dbPath}`);
  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    console.log(`📦 db file size: ${stat.size} bytes`);
  }

  let needsInit = false;

  // 1) ファイルが無ければ初期化
  if (!fs.existsSync(dbPath)) {
    console.log("❌ Database file not found. Will initialize.");
    needsInit = true;
  } else {
    console.log("✅ Database file exists.");
    console.log("🔎 Checking table structure via sqlite_master...");

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("❌ Failed to open database:", err.message);
        needsInit = true;
      }
    });

    try {
      // 2) 必須テーブルの存在確認（例: sales_channels）
      const mustHaveTables = ["sales_channels"]; // seedが触るテーブルを必要に応じて追加
      const missing = [];

      for (const t of mustHaveTables) {
        const exists = await new Promise((resolve) => {
          db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [t],
            (err, row) => {
              if (err) {
                console.error("⚠️  Query error:", err.message);
                resolve(false);
              } else {
                resolve(!!row);
              }
            }
          );
        });
        if (!exists) missing.push(t);
      }

      if (missing.length === 0) {
        console.log("✅ Required tables exist. Skipping initialization.");
      } else {
        console.log(`❌ Missing tables: ${missing.join(", ")}`);
        needsInit = true;
      }
    } finally {
      db.close();
    }
  }

  // 3) 初期化が必要なら schema 作成 → seed
  if (needsInit) {
    console.log("\n🚀 Starting database initialization...");
    try {
      console.log("📝 Running prisma db push...");
      execSync("npx prisma db push", { stdio: "inherit" });

      console.log("🌱 Running seed...");
      execSync("node prisma/seed.js", { stdio: "inherit" });

      console.log("\n✅ Database initialization complete!");
    } catch (error) {
      console.error("\n❌ Initialization failed:");
      console.error(error?.message || error);
      process.exit(1);
    }
  }

  console.log("\n================================");
  console.log("✅ Database Ready. Starting app...");
  console.log("================================\n");
})();
```

### 5.2 package.json（例）

```json
{
  "dependencies": {
    "sqlite3": "^5.1.7",
    "@prisma/client": "5.22.0"
  },
  "devDependencies": {
    "prisma": "5.22.0"
  },
  "scripts": {
    "build": "prisma generate && next build",
    "start": "node scripts/init-db.cjs && next start"
  }
}
```

---

## 6. 代替案（次点：Prismaのエラーコード P2021 を捕捉）

依存追加を避けたい場合の次点。ただし **DBズレを見逃す可能性**があるため、ログで同一性確認は必須です。

```js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

function resolveDbPath(databaseUrl) {
  const raw = (databaseUrl || "").replace(/^file:/, "");
  const p = raw || "./prisma/dev.db";
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

(async () => {
  const dbPath = resolveDbPath(process.env.DATABASE_URL);
  console.log(`📍 dbPath(resolved): ${dbPath}`);

  let needsInit = false;

  if (!fs.existsSync(dbPath)) {
    needsInit = true;
  } else {
    const prisma = new PrismaClient();
    try {
      await prisma.salesChannel.findFirst(); // seedが触るモデルを使う
    } catch (error) {
      if (error?.code === "P2021") needsInit = true;
      else needsInit = true;
    } finally {
      await prisma.$disconnect();
    }
  }

  if (needsInit) {
    execSync("npx prisma db push", { stdio: "inherit" });
    execSync("node prisma/seed.js", { stdio: "inherit" });
  }
})();
```

---

## 7. 非推奨（毎回リセット）

`prisma db push --force-reset` は「毎起動で全消し」になりやすく、本番運用には不向きです。  
デバッグ用途以外は避けるのがおすすめです。

---

## 8. 仕上げの安全策（運用で壊れないために）

### 8.1 seed を冪等（idempotent）にする
可能なら `upsert` を使い、seed が二重実行されても壊れないようにしておくと強いです。

### 8.2 init と app の順序を固定する
`start: node scripts/init-db.cjs && next start` のように、必ず init を完了してから Next.js を起動する。

### 8.3 必須テーブルの網羅
`sales_channels` 以外にも seed が参照するテーブルがあるなら、`mustHaveTables` に追加して「欠けていたら初期化」にする。

---

## 9. 動作イメージ（Render）

**初回起動：**
1. Disk が `/var/data` にマウント
2. init-db.cjs  
   - DBが無い / テーブルが無い → `db push` → `seed`
3. Next.js 起動 → ダッシュボード表示

**再起動：**
1. Disk マウント
2. init-db.cjs  
   - 必須テーブルがある → スキップ
3. Next.js 起動（データ保持）

---

## 10. 次にやるべきこと（最短で直す手順）

1. init-db.cjs に「DB同一性ログ」を入れる（cwd / DATABASE_URL / resolved path）
2. `sqlite_master` チェックに切り替える（推奨）
3. 必須テーブル群をチェック対象に追加
4. seed を可能な範囲で冪等化（upsert）

これで「ログイン後に seed が落ちる」「テーブルが無い」系は安定して解消できるはずです。
