/*
  Warnings:

  - You are about to drop the column `dimensionsMm` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `volumeM3` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OS_Type" AS ENUM ('LINUX', 'ANDROID_9', 'ANDROID_10', 'ANDROID_11', 'ANDROID_12', 'ANDROID_13', 'GOOGLE_TV', 'WHALE_OS', 'OTHER');

-- CreateEnum
CREATE TYPE "Focus_Method" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "Keystone_Method" AS ENUM ('AUTO', 'VERTICAL', 'NONE');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "dimensionsMm",
DROP COLUMN "volumeM3",
ADD COLUMN     "autoObstacle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoScreenFit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bluetoothVersion" TEXT,
ADD COLUMN     "brightnessAnsi" INTEGER,
ADD COLUMN     "brightnessUniformity" INTEGER,
ADD COLUMN     "chipset" TEXT,
ADD COLUMN     "contrastRatio" TEXT,
ADD COLUMN     "focusMethod" "Focus_Method",
ADD COLUMN     "hasGimbal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heightMm" INTEGER,
ADD COLUMN     "keystone" "Keystone_Method",
ADD COLUMN     "lengthMm" INTEGER,
ADD COLUMN     "lightSourceBrightness" INTEGER,
ADD COLUMN     "noiseDb" INTEGER,
ADD COLUMN     "os" "OS_Type",
ADD COLUMN     "projectionDistance" TEXT,
ADD COLUMN     "projectionSize" TEXT,
ADD COLUMN     "publicName" TEXT,
ADD COLUMN     "ramRom" TEXT,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "throwRatio" TEXT,
ADD COLUMN     "widthMm" INTEGER,
ADD COLUMN     "wifiVersion" TEXT;

-- AlterTable
ALTER TABLE "StoreProductListing" ADD COLUMN     "storeImageUrl" TEXT,
ADD COLUMN     "storeTitle" TEXT;
