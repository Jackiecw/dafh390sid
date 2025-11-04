/*
  Warnings:

  - You are about to drop the column `country` on the `SalesData` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `SalesData` table. All the data in the column will be lost.
  - You are about to drop the column `productSku` on the `SalesData` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `SalesData` table. All the data in the column will be lost.
  - Added the required column `storeId` to the `SalesData` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SHOPEE', 'TIKTOK_SHOP', 'LAZADA', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('ID', 'TH', 'VN', 'MY', 'PH', 'SG', 'OTHER');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PROJECTOR', 'SCREEN', 'STAND', 'ACCESSORY', 'OTHER');

-- AlterTable
ALTER TABLE "SalesData" DROP COLUMN "country",
DROP COLUMN "platform",
DROP COLUMN "productSku",
DROP COLUMN "storeName",
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "storeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "volumeM3" DOUBLE PRECISION,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "country" "Country" NOT NULL,
    "platformStoreId" TEXT,
    "status" "StoreStatus" NOT NULL,
    "registeredAt" TIMESTAMP(3),

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
