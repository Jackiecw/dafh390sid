/*
  Warnings:

  - You are about to drop the column `adSpend` on the `SalesData` table. All the data in the column will be lost.
  - Added the required column `productId` to the `SalesData` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PROJECTOR', 'SCREEN', 'STAND', 'ACCESSORY', 'OTHER');

-- AlterTable
ALTER TABLE "SalesData" DROP COLUMN "adSpend",
ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" "ProductCategory" NOT NULL,
    "cost" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StoreProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoreProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "_StoreProducts_B_index" ON "_StoreProducts"("B");

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreProducts" ADD CONSTRAINT "_StoreProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreProducts" ADD CONSTRAINT "_StoreProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
