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

    console.log("========================================");
    console.log("🔍 Database Initialization Check");
    console.log("========================================");
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
            // 2) 必須テーブルの存在確認
            const mustHaveTables = ["sales_channels", "ad_categories", "users", "exclusion_keywords", "ad_budgets", "ne_auth"];
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

            // 3) V1.51マイグレーションチェック: products テーブルに asin カラムがあるか
            const hasAsinColumn = await new Promise((resolve) => {
                db.all(`PRAGMA table_info(products)`, [], (err, rows) => {
                    if (err) {
                        console.error("⚠️  Query error:", err.message);
                        resolve(false);
                    } else {
                        const asinCol = rows.find(r => r.name === 'asin');
                        resolve(!!asinCol);
                    }
                });
            });

            // 4) V1.55マイグレーションチェック: product_categories テーブルに name カラムがあるか
            const hasCategoryNameColumnV155 = await new Promise((resolve) => {
                db.all(`PRAGMA table_info(product_categories)`, [], (err, rows) => {
                    if (err) {
                        console.error("⚠️  Query error:", err.message);
                        resolve(false);
                    } else {
                        // 旧カラム categoryName が新カラム name に変更されたかチェック
                        const nameCol = rows.find(r => r.name === 'name');
                        resolve(!!nameCol);
                    }
                });
            });

            if (missing.length === 0 && hasAsinColumn && hasCategoryNameColumnV155) {
                console.log("✅ Required tables exist and schema is up-to-date. Skipping initialization.");
            } else {
                if (missing.length > 0) {
                    console.log(`❌ Missing tables: ${missing.join(", ")}`);
                }
                if (!hasAsinColumn) {
                    console.log(`❌ Schema outdated: 'products' table missing 'asin' column`);
                }
                if (!hasCategoryNameColumnV155) {
                    console.log(`❌ Schema outdated: 'product_categories' table missing 'name' column`);
                }
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
            execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });

            console.log("🌱 Running seed...");
            execSync("node prisma/seed.js", { stdio: "inherit" });

            console.log("\n✅ Database initialization complete!");
        } catch (error) {
            console.error("\n❌ Initialization failed:");
            console.error(error?.message || error);
            process.exit(1);
        }
    }

    console.log("\n========================================");
    console.log("✅ Database Ready. Starting app...");
    console.log("========================================\n");
})();
