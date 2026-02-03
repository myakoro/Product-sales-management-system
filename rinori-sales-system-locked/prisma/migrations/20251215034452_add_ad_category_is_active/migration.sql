/*
  Warnings:

  - You are about to drop the column `sales_channel_id` on the `ad_expenses` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ad_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ad_categories" ("category_name", "created_at", "id") SELECT "category_name", "created_at", "id" FROM "ad_categories";
DROP TABLE "ad_categories";
ALTER TABLE "new_ad_categories" RENAME TO "ad_categories";
CREATE TABLE "new_ad_expenses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "expense_date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "ad_category_id" INTEGER NOT NULL,
    "memo" TEXT,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_expenses_ad_category_id_fkey" FOREIGN KEY ("ad_category_id") REFERENCES "ad_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ad_expenses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ad_expenses" ("ad_category_id", "amount", "created_at", "created_by_user_id", "expense_date", "id", "memo") SELECT "ad_category_id", "amount", "created_at", "created_by_user_id", "expense_date", "id", "memo" FROM "ad_expenses";
DROP TABLE "ad_expenses";
ALTER TABLE "new_ad_expenses" RENAME TO "ad_expenses";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
