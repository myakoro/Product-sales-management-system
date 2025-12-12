-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "products" (
    "product_code" TEXT NOT NULL PRIMARY KEY,
    "product_name" TEXT NOT NULL,
    "sales_price_excl_tax" REAL NOT NULL,
    "cost_excl_tax" REAL NOT NULL,
    "product_type" TEXT NOT NULL,
    "management_status" TEXT NOT NULL,
    "category_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_code" TEXT NOT NULL,
    "period_ym" TEXT NOT NULL,
    "sales_date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sales_amount_excl_tax" REAL NOT NULL,
    "cost_amount_excl_tax" REAL NOT NULL,
    "gross_profit" REAL NOT NULL,
    "sales_channel_id" INTEGER,
    "import_history_id" INTEGER NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_records_product_code_fkey" FOREIGN KEY ("product_code") REFERENCES "products" ("product_code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_records_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "sales_channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_records_import_history_id_fkey" FOREIGN KEY ("import_history_id") REFERENCES "import_histories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_code" TEXT NOT NULL,
    "period_ym" TEXT NOT NULL,
    "budget_quantity" INTEGER NOT NULL,
    "budget_sales_excl_tax" REAL NOT NULL,
    "budget_cost_excl_tax" REAL NOT NULL,
    "budget_gross_profit" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "monthly_budgets_product_code_fkey" FOREIGN KEY ("product_code") REFERENCES "products" ("product_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "period_budgets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_code" TEXT NOT NULL,
    "start_ym" TEXT NOT NULL,
    "end_ym" TEXT NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "total_sales_excl_tax" REAL NOT NULL,
    "memo" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "period_budgets_product_code_fkey" FOREIGN KEY ("product_code") REFERENCES "products" ("product_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "period_budget_histories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "period_budget_id" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "start_ym" TEXT NOT NULL,
    "end_ym" TEXT NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "monthly_breakdown" TEXT NOT NULL,
    "saved_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "period_budget_histories_period_budget_id_fkey" FOREIGN KEY ("period_budget_id") REFERENCES "period_budgets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ad_expenses" (
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

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_ym" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sales_channels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "import_histories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "import_type" TEXT NOT NULL,
    "target_ym" TEXT,
    "import_mode" TEXT,
    "comment" TEXT,
    "sales_channel_id" INTEGER,
    "record_count" INTEGER NOT NULL,
    "imported_by_user_id" INTEGER NOT NULL,
    "imported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_histories_imported_by_user_id_fkey" FOREIGN KEY ("imported_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "import_histories_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "sales_channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "new_product_candidates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_code" TEXT NOT NULL,
    "sample_sku" TEXT NOT NULL,
    "product_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channels_name_key" ON "sales_channels"("name");
