const fs = require("fs");
const { execSync } = require("child_process");

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";

console.log(`🔍 Checking database at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.log("🔧 Database not found. Initializing...");

    try {
        execSync("npx prisma db push", { stdio: "inherit" });
        console.log("✅ Database schema created successfully");

        execSync("node prisma/seed.js", { stdio: "inherit" });
        console.log("✅ Database seeded successfully");

        console.log("🎉 Database initialization complete!");
    } catch (error) {
        console.error("❌ Database initialization failed:", error.message);
        process.exit(1);
    }
} else {
    console.log("✅ Database already exists. Skipping initialization.");
}
