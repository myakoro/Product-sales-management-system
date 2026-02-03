/*
  Warnings:

  - A unique constraint covering the columns `[product_code,sample_sku]` on the table `new_product_candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[asin]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "import_histories" ADD COLUMN "data_source" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "asin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "new_product_candidates_product_code_sample_sku_key" ON "new_product_candidates"("product_code", "sample_sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_asin_key" ON "products"("asin");
