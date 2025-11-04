/*
  Warnings:

  - You are about to drop the column `productId` on the `SalesData` table. All the data in the column will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."SalesData" DROP CONSTRAINT "SalesData_productId_fkey";

-- AlterTable
ALTER TABLE "SalesData" DROP COLUMN "productId";

-- DropTable
DROP TABLE "public"."Product";

-- DropEnum
DROP TYPE "public"."ProductCategory";
