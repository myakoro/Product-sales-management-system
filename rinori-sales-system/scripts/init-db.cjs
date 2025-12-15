const fs = require("fs");
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

console.log("========================================");
console.log("🚀 Starting database initialization check");
console.log("========================================");

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";

console.log(`📍 DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`📂 Resolved DB path: ${dbPath}`);

// Check if parent directory exists
const parentDir = require("path").dirname(dbPath);
console.log(`📁 Parent directory: ${parentDir}`);

try {
    const dirExists = fs.existsSync(parentDir);
    console.log(`✓ Parent directory exists: ${dirExists}`);

    if (!dirExists) {
        console.error(`❌ ERROR: Parent directory ${parentDir} does not exist!`);
        console.error(`This means the Persistent Disk is not mounted at the expected location.`);
        process.exit(1);
    }
} catch (error) {
    console.error(`❌ ERROR checking parent directory:`, error.message);
    process.exit(1);
}

// Check if database needs initialization
let needsInit = false;

if (!fs.existsSync(dbPath)) {
    console.log("🔧 Database file not found. Will initialize.");
    needsInit = true;
} else {
    console.log("📄 Database file exists. Checking if tables exist...");

    // Check if tables exist by trying to query
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
    console.log("🔧 Initializing database...");

    try {
        console.log("📝 Running: npx prisma db push");
        execSync("npx prisma db push", { stdio: "inherit" });
        console.log("✅ Database schema created successfully");

        console.log("📝 Running: node prisma/seed.js");
        execSync("node prisma/seed.js", { stdio: "inherit" });
        console.log("✅ Database seeded successfully");

        console.log("🎉 Database initialization complete!");
    } catch (error) {
        console.error("❌ Database initialization failed:", error.message);
        process.exit(1);
    }
}

console.log("========================================");
console.log("✓ Database check complete");
console.log("========================================");
