/*
  Warnings:

  - You are about to drop the column `category_name` on the `product_categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[external_order_id]` on the table `sales_records` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `product_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `product_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sales_records" ADD COLUMN "external_order_id" TEXT;

-- CreateTable
CREATE TABLE "ne_auth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "refreshes_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ne_shop_mappings" (
    "ne_shop_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channel_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ne_shop_mappings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "sales_channels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_product_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_product_categories" ("created_at", "id") SELECT "created_at", "id" FROM "product_categories";
DROP TABLE "product_categories";
ALTER TABLE "new_product_categories" RENAME TO "product_categories";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "sales_records_external_order_id_key" ON "sales_records"("external_order_id");
