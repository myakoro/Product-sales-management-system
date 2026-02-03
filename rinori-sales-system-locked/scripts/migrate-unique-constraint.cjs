const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = process.env.RUNTIME_DATABASE_URL?.replace("file:", "") ||
    process.env.DATABASE_URL?.replace("file:", "") ||
    "./prisma/dev.db";

const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

console.log(`📍 Applying migration to: ${resolvedPath}`);

const db = new sqlite3.Database(resolvedPath, (err) => {
    if (err) {
        console.error("❌ Failed to open database:", err.message);
        process.exit(1);
    }
});

// Remove duplicates
db.run(`
    DELETE FROM new_product_candidates
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM new_product_candidates
        GROUP BY product_code, sample_sku
    )
`, (err) => {
    if (err) {
        console.error("❌ Failed to remove duplicates:", err.message);
        db.close();
        process.exit(1);
    }
    console.log("✅ Removed duplicate rows");

    // Create unique index
    db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS "new_product_candidates_product_code_sample_sku_key" 
        ON "new_product_candidates"("product_code", "sample_sku")
    `, (err) => {
        if (err) {
            console.error("❌ Failed to create unique index:", err.message);
            db.close();
            process.exit(1);
        }
        console.log("✅ Created unique constraint");
        db.close();
        console.log("🎉 Migration complete!");
    });
});
