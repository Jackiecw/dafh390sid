-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('SEA', 'AIR', 'RAIL', 'TRUCK', 'EXPRESS');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING_PRODUCTION', 'IN_PRODUCTION', 'QC_PENDING', 'PARTIAL_SHIPPED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('BOOKING', 'LOADING', 'EXPORT_CLEARANCE', 'DEPARTED', 'ARRIVED', 'IMPORT_CLEARANCE', 'LAST_MILE', 'DELIVERED', 'WAREHOUSE_IN');

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "orderDate" DATE NOT NULL,
    "exFactoryDate" DATE,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING_PRODUCTION',
    "notes" TEXT,
    "isProductionLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "transportMode" "TransportMode" NOT NULL,
    "forwarder" TEXT,
    "blNo" TEXT,
    "containerNo" TEXT,
    "trackingNumber" TEXT,
    "etd" DATE,
    "eta" DATE,
    "atd" DATE,
    "ata" DATE,
    "freightCost" DOUBLE PRECISION,
    "duty" DOUBLE PRECISION,
    "otherCharges" DOUBLE PRECISION,
    "isDelayed" BOOLEAN NOT NULL DEFAULT false,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCbm" DOUBLE PRECISION,
    "totalKg" DOUBLE PRECISION,
    "freightShare" DOUBLE PRECISION,
    "dutyShare" DOUBLE PRECISION,
    "landedCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbound" (
    "id" TEXT NOT NULL,
    "inboundDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "warehouse" TEXT,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipmentItemId" TEXT NOT NULL,

    CONSTRAINT "Inbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentMilestone" (
    "id" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "occurredAt" DATE,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipmentId" TEXT NOT NULL,

    CONSTRAINT "ShipmentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_countryCode_status_idx" ON "PurchaseOrder"("countryCode", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_productId_idx" ON "PurchaseOrder"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_countryCode_eta_idx" ON "Shipment"("countryCode", "eta");

-- CreateIndex
CREATE INDEX "Shipment_isDelayed_idx" ON "Shipment"("isDelayed");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_purchaseOrderId_idx" ON "ShipmentItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ShipmentItem_productId_idx" ON "ShipmentItem"("productId");

-- CreateIndex
CREATE INDEX "Inbound_countryCode_inboundDate_idx" ON "Inbound"("countryCode", "inboundDate");

-- CreateIndex
CREATE INDEX "Inbound_shipmentItemId_idx" ON "Inbound"("shipmentItemId");

-- CreateIndex
CREATE INDEX "ShipmentMilestone_shipmentId_type_idx" ON "ShipmentMilestone"("shipmentId", "type");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbound" ADD CONSTRAINT "Inbound_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbound" ADD CONSTRAINT "Inbound_shipmentItemId_fkey" FOREIGN KEY ("shipmentItemId") REFERENCES "ShipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMilestone" ADD CONSTRAINT "ShipmentMilestone_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
