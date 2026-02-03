-- CreateTable
CREATE TABLE "management_budgets" (
    "period_ym" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL
);
