/*
  Warnings:

  - A unique constraint covering the columns `[platformOrderId]` on the table `SalesData` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SalesData" ADD COLUMN     "orderStatus" TEXT,
ADD COLUMN     "platformOrderId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ListingMapping" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalTitle" TEXT,
    "externalSku" TEXT,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingMapping_platform_externalTitle_idx" ON "ListingMapping"("platform", "externalTitle");

-- CreateIndex
CREATE INDEX "ListingMapping_platform_externalSku_idx" ON "ListingMapping"("platform", "externalSku");

-- CreateIndex
CREATE UNIQUE INDEX "SalesData_platformOrderId_key" ON "SalesData"("platformOrderId");

-- CreateIndex
CREATE INDEX "SalesData_platformOrderId_idx" ON "SalesData"("platformOrderId");

-- AddForeignKey
ALTER TABLE "ListingMapping" ADD CONSTRAINT "ListingMapping_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "StoreProductListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
