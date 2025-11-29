/*
  Warnings:

  - You are about to drop the column `quantity` on the `SalesData` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `SalesData` table. All the data in the column will be lost.
  - Added the required column `platform` to the `SalesData` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'DIRECTOR_REVIEW', 'COMPLETED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "public"."SalesData" DROP CONSTRAINT "SalesData_productId_fkey";

-- DropIndex
DROP INDEX "public"."ListingMapping_platform_externalSku_idx";

-- DropIndex
DROP INDEX "public"."ListingMapping_platform_externalTitle_idx";

-- DropIndex
DROP INDEX "public"."SalesData_platformOrderId_idx";

-- DropIndex
DROP INDEX "public"."SalesData_recordDate_idx";

-- DropIndex
DROP INDEX "public"."SalesData_storeId_idx";

-- DropIndex
DROP INDEX "public"."SalesData_storeId_listingId_idx";

-- DropIndex
DROP INDEX "public"."SalesData_storeId_recordDate_idx";

-- AlterTable
ALTER TABLE "SalesData" DROP COLUMN "quantity",
DROP COLUMN "unitPrice",
ADD COLUMN     "currency" TEXT DEFAULT 'CNY',
ADD COLUMN     "externalSku" TEXT,
ADD COLUMN     "externalTitle" TEXT,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "platform" "Platform" NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT;

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedById" TEXT NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceTemplateItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "PerformanceTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "directorId" TEXT,
    "templateId" TEXT NOT NULL,
    "selfScoreTotal" DOUBLE PRECISION,
    "managerScoreTotal" DOUBLE PRECISION,
    "directorScoreTotal" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "summaryThisMonth" TEXT,
    "planNextMonth" TEXT,
    "companySuggestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReviewItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "selfScore" DOUBLE PRECISION,
    "selfComment" TEXT,
    "managerScore" DOUBLE PRECISION,
    "managerComment" TEXT,
    "directorScore" DOUBLE PRECISION,
    "directorComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_managerId_idx" ON "PerformanceReview"("managerId");

-- CreateIndex
CREATE INDEX "PerformanceReview_status_idx" ON "PerformanceReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReview_employeeId_month_templateId_key" ON "PerformanceReview"("employeeId", "month", "templateId");

-- CreateIndex
CREATE INDEX "ListingMapping_listingId_idx" ON "ListingMapping"("listingId");

-- CreateIndex
CREATE INDEX "ListingMapping_externalTitle_idx" ON "ListingMapping"("externalTitle");

-- CreateIndex
CREATE INDEX "ListingMapping_externalSku_idx" ON "ListingMapping"("externalSku");

-- CreateIndex
CREATE INDEX "SalesData_platform_externalTitle_idx" ON "SalesData"("platform", "externalTitle");

-- CreateIndex
CREATE INDEX "SalesData_platform_externalSku_idx" ON "SalesData"("platform", "externalSku");

-- CreateIndex
CREATE INDEX "SalesData_importBatchId_idx" ON "SalesData"("importBatchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTemplateItem" ADD CONSTRAINT "PerformanceTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PerformanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PerformanceTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReviewItem" ADD CONSTRAINT "PerformanceReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
