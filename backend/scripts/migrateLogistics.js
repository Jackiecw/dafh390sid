/**
 * 将旧的 LogisticsBatch / LogisticsEvent 数据迁移到新的
 * PurchaseOrder / Shipment / ShipmentItem / Inbound / ShipmentMilestone 结构。
 * 假设旧模型一条批次对应一条 PO + 一条 Shipment + 一条 ShipmentItem。
 * 迁移为幂等：如果目标 PO 或 Shipment 已存在则跳过该批次。
 */
const prisma = require('../prismaClient');

const statusToMilestone = {
  FACTORY: 'BOOKING',
  WAREHOUSE_READY: 'BOOKING',
  CONTAINER_LOADED: 'LOADING',
  EXPORT_CUSTOMS: 'EXPORT_CLEARANCE',
  SHIPPING: 'DEPARTED',
  IMPORT_CUSTOMS: 'IMPORT_CLEARANCE',
  LOCAL_DELIVERY: 'LAST_MILE',
  COMPLETED: 'WAREHOUSE_IN',
};

const mapPoStatus = (batchStatus) => {
  if (batchStatus === 'COMPLETED') return 'COMPLETED';
  if (['WAREHOUSE_READY', 'CONTAINER_LOADED', 'EXPORT_CUSTOMS', 'SHIPPING', 'IMPORT_CUSTOMS', 'LOCAL_DELIVERY'].includes(batchStatus)) {
    return 'PARTIAL_SHIPPED';
  }
  return 'IN_PRODUCTION';
};

async function migrateBatch(batch) {
  const poNumber = `PO-${batch.batchNumber}`;
  const shipmentNumber = `SHP-${batch.batchNumber}`;

  // 幂等：若 PO 已存在则跳过整个批次
  const existingPo = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
  if (existingPo) {
    console.log(`[skip] ${batch.batchNumber} 已迁移`);
    return { skipped: true };
  }

  const poStatus = mapPoStatus(batch.currentStatus);
  const shippedQuantity = poStatus === 'COMPLETED' ? batch.quantity : 0;

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      orderDate: batch.orderDate,
      exFactoryDate: batch.estimatedFactoryDate,
      quantity: batch.quantity,
      unitPrice: batch.unitPrice,
      shippedQuantity,
      status: poStatus,
      notes: batch.notes,
      productId: batch.productId,
      countryCode: batch.countryCode,
    },
  });

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber,
      countryCode: batch.countryCode,
      transportMode: 'SEA',
      forwarder: batch.freightForwarder || batch.logisticsProvider,
      eta: batch.estimatedWarehouseDate,
      notes: batch.notes,
      items: {
        create: {
          purchaseOrderId: po.id,
          productId: batch.productId,
          quantity: batch.quantity,
          totalCbm: batch.totalCbm,
          totalKg: batch.totalKg,
        },
      },
    },
    include: { items: true },
  });

  // 迁移事件为里程碑
  if (batch.events?.length) {
    const milestones = batch.events
      .map((ev) => {
        const type = statusToMilestone[ev.status];
        if (!type) return null;
        return {
          type,
          occurredAt: ev.eventDate,
          notes: ev.notes,
          shipmentId: shipment.id,
        };
      })
      .filter(Boolean);
    if (milestones.length) {
      await prisma.shipmentMilestone.createMany({ data: milestones });
    }
  }

  // 迁移完成态为入库记录
  if (batch.currentStatus === 'COMPLETED') {
    await prisma.inbound.create({
      data: {
        inboundDate: batch.estimatedWarehouseDate || batch.orderDate,
        quantity: batch.quantity,
        warehouse: null,
        countryCode: batch.countryCode,
        shipmentItemId: shipment.items[0].id,
      },
    });
  }

  return { poNumber, shipmentNumber };
}

async function main() {
  const batches = await prisma.logisticsBatch.findMany({
    include: {
      events: true,
    },
    orderBy: { orderDate: 'asc' },
  });
  console.log(`待迁移批次数: ${batches.length}`);
  let migrated = 0;
  for (const batch of batches) {
    const result = await migrateBatch(batch);
    if (!result.skipped) migrated += 1;
  }
  console.log(`迁移完成，新增 ${migrated} 条批次到新模型`);
}

main()
  .catch((err) => {
    console.error('迁移失败', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
