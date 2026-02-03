-- DropIndex
DROP INDEX "new_product_candidates_product_code_sample_sku_key";

-- CreateTable
CREATE TABLE "ad_budgets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "period_ym" TEXT NOT NULL,
    "ad_category_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ad_budgets_ad_category_id_fkey" FOREIGN KEY ("ad_category_id") REFERENCES "ad_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ad_budgets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exclusion_keywords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword" TEXT NOT NULL,
    "match_type" TEXT NOT NULL DEFAULT 'startsWith',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_budgets_period_ym_ad_category_id_key" ON "ad_budgets"("period_ym", "ad_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "exclusion_keywords_keyword_key" ON "exclusion_keywords"("keyword");
