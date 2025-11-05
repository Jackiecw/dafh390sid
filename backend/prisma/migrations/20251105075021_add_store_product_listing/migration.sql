/*
  Warnings:

  - You are about to drop the `_StoreProducts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_StoreProducts" DROP CONSTRAINT "_StoreProducts_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_StoreProducts" DROP CONSTRAINT "_StoreProducts_B_fkey";

-- DropTable
DROP TABLE "public"."_StoreProducts";

-- CreateTable
CREATE TABLE "StoreProductListing" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "StoreProductListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductListing_storeId_productId_key" ON "StoreProductListing"("storeId", "productId");

-- AddForeignKey
ALTER TABLE "StoreProductListing" ADD CONSTRAINT "StoreProductListing_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductListing" ADD CONSTRAINT "StoreProductListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
