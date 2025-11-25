-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('IN_PRODUCTION', 'PRODUCTION_DONE', 'SHIPPED_OUT', 'CONTAINER_LOADED', 'EXPORTED', 'IN_TRANSIT', 'IMPORTED', 'DELIVERING', 'WAREHOUSED');

-- CreateEnum
CREATE TYPE "LogisticsBillingMethod" AS ENUM ('BY_CBM', 'BY_WEIGHT', 'FLAT_FEE');

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "batchSequence" INTEGER NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "orderSequence" INTEGER NOT NULL,
    "orderDate" DATE NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'IN_PRODUCTION',
    "productId" TEXT NOT NULL,
    "skuName" TEXT NOT NULL,
    "productColor" TEXT NOT NULL,
    "productSpec" TEXT NOT NULL,
    "salesRegion" TEXT NOT NULL,
    "plugSpec" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "outboundDate" DATE,
    "logisticsProvider" TEXT,
    "logisticsUnitPrice" DOUBLE PRECISION,
    "warehousingProvider" TEXT,
    "cartonCount" INTEGER,
    "totalCbm" DOUBLE PRECISION,
    "totalKg" DOUBLE PRECISION,
    "billingCbm" DOUBLE PRECISION,
    "billingKg" DOUBLE PRECISION,
    "billingMethod" "LogisticsBillingMethod",
    "logisticsFee" DOUBLE PRECISION,
    "warehouseDate" DATE,
    "notes" TEXT,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrderStatusEvent" (
    "id" TEXT NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL,
    "occurredAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "ProductionOrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionBatch_countryCode_idx" ON "ProductionBatch"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_countryCode_batchSequence_key" ON "ProductionBatch"("countryCode", "batchSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_orderCode_key" ON "ProductionOrder"("orderCode");

-- CreateIndex
CREATE INDEX "ProductionOrder_batchId_idx" ON "ProductionOrder"("batchId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_salesRegion_idx" ON "ProductionOrder"("salesRegion");

-- CreateIndex
CREATE INDEX "ProductionOrderStatusEvent_orderId_status_idx" ON "ProductionOrderStatusEvent"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrderStatusEvent_orderId_status_key" ON "ProductionOrderStatusEvent"("orderId", "status");

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrderStatusEvent" ADD CONSTRAINT "ProductionOrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
