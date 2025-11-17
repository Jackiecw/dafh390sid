-- CreateEnum
CREATE TYPE "LogisticsStatus" AS ENUM ('FACTORY', 'WAREHOUSE_READY', 'CONTAINER_LOADED', 'EXPORT_CUSTOMS', 'SHIPPING', 'IMPORT_CUSTOMS', 'LOCAL_DELIVERY', 'COMPLETED');

-- CreateTable
CREATE TABLE "LogisticsBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "orderDate" DATE NOT NULL,
    "productId" TEXT NOT NULL,
    "productSpec" TEXT,
    "countryCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "productionTimeDays" INTEGER,
    "estimatedFactoryDate" DATE,
    "logisticsProvider" TEXT,
    "freightForwarder" TEXT,
    "cartonCount" INTEGER,
    "totalCbm" DOUBLE PRECISION,
    "totalKg" DOUBLE PRECISION,
    "estimatedWarehouseDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStatus" "LogisticsStatus" NOT NULL DEFAULT 'FACTORY',

    CONSTRAINT "LogisticsBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsEvent" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "LogisticsStatus" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsBatch_batchNumber_key" ON "LogisticsBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "LogisticsBatch_countryCode_idx" ON "LogisticsBatch"("countryCode");

-- CreateIndex
CREATE INDEX "LogisticsBatch_productId_idx" ON "LogisticsBatch"("productId");

-- CreateIndex
CREATE INDEX "LogisticsBatch_currentStatus_idx" ON "LogisticsBatch"("currentStatus");

-- CreateIndex
CREATE INDEX "LogisticsEvent_batchId_idx" ON "LogisticsEvent"("batchId");

-- AddForeignKey
ALTER TABLE "LogisticsBatch" ADD CONSTRAINT "LogisticsBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsBatch" ADD CONSTRAINT "LogisticsBatch_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsEvent" ADD CONSTRAINT "LogisticsEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LogisticsBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsEvent" ADD CONSTRAINT "LogisticsEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
