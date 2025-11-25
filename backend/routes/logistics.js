// ./backend/routes/logistics.js
// 生产与物流管理：批次、订单、状态流、统计

const express = require('express');
const { z } = require('zod');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const {
  ProductionOrderStatus,
  LogisticsBillingMethod,
} = require('@prisma/client');

const router = express.Router();

const STATUS_FLOW = [
  ProductionOrderStatus.IN_PRODUCTION,
  ProductionOrderStatus.PRODUCTION_DONE,
  ProductionOrderStatus.SHIPPED_OUT,
  ProductionOrderStatus.CONTAINER_LOADED,
  ProductionOrderStatus.EXPORTED,
  ProductionOrderStatus.IN_TRANSIT,
  ProductionOrderStatus.IMPORTED,
  ProductionOrderStatus.DELIVERING,
  ProductionOrderStatus.WAREHOUSED,
];

const orderCreateSchema = z.object({
  orderDate: z.coerce.date({ message: '订单日期无效' }),
  productId: z.string().min(1, '必须选择产品'),
  skuName: z.string().min(1, 'SKU 名称必填'),
  productColor: z.string().min(1, '产品颜色必填'),
  productSpec: z.string().min(1, '产品规格必填'),
  salesRegion: z.string().min(1, '销售地必填'),
  plugSpec: z.string().min(1, '插头规格必填'),
  quantity: z.coerce.number().int().min(1, '数量必须大于 0'),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0),
  outboundDate: z.coerce.date().optional().nullable(),
  logisticsProvider: z.string().optional().nullable(),
  logisticsUnitPrice: z.coerce.number().min(0).optional().nullable(),
  warehousingProvider: z.string().optional().nullable(),
  cartonCount: z.coerce.number().int().min(0).optional().nullable(),
  totalCbm: z.coerce.number().min(0).optional().nullable(),
  totalKg: z.coerce.number().min(0).optional().nullable(),
  billingCbm: z.coerce.number().min(0).optional().nullable(),
  billingKg: z.coerce.number().min(0).optional().nullable(),
  billingMethod: z.nativeEnum(LogisticsBillingMethod).optional().nullable(),
  logisticsFee: z.coerce.number().min(0).optional().nullable(),
  warehouseDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const batchCreateSchema = z.object({
  countryCode: z.string().min(2, '销售国家代码必填'),
  notes: z.string().optional().nullable(),
  orders: z.array(orderCreateSchema).min(1, '至少需要 1 条订单'),
});

const appendOrderSchema = z.object({
  batchId: z.string().min(1, '必须选择批次'),
  orders: z.array(orderCreateSchema).min(1, '至少需要 1 条订单'),
});

const statusUpdateSchema = z.object({
  status: z.nativeEnum(ProductionOrderStatus),
  occurredAt: z.coerce.date({ message: '日期无效' }),
});

const orderUpdateSchema = z.object({
  logisticsProvider: z.string().optional().nullable(),
  logisticsUnitPrice: z.coerce.number().min(0).optional().nullable(),
  warehousingProvider: z.string().optional().nullable(),
  cartonCount: z.coerce.number().int().min(0).optional().nullable(),
  totalCbm: z.coerce.number().min(0).optional().nullable(),
  totalKg: z.coerce.number().min(0).optional().nullable(),
  billingCbm: z.coerce.number().min(0).optional().nullable(),
  billingKg: z.coerce.number().min(0).optional().nullable(),
  billingMethod: z.nativeEnum(LogisticsBillingMethod).optional().nullable(),
  logisticsFee: z.coerce.number().min(0).optional().nullable(),
  outboundDate: z.coerce.date().optional().nullable(),
  warehouseDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
});

const pad = (num = 0, width = 2) => num.toString().padStart(width, '0');

const isCompleted = (status) => status === ProductionOrderStatus.WAREHOUSED;

const roundPrice = (value = 0) => Math.round(Number(value || 0) * 100) / 100;

function calcTotalPrice(quantity, unitPrice) {
  return roundPrice(Number(quantity || 0) * Number(unitPrice || 0));
}

function calcLogisticsFee(input = {}) {
  const method = input.billingMethod;
  if (!method) return input.logisticsFee ?? null;
  if (method === LogisticsBillingMethod.FLAT_FEE) {
    return input.logisticsFee ?? null;
  }
  const unit = Number(input.logisticsUnitPrice || 0);
  if (!unit) return null;
  if (method === LogisticsBillingMethod.BY_CBM) {
    const base = Number(input.billingCbm ?? input.totalCbm ?? 0);
    return roundPrice(base * unit);
  }
  if (method === LogisticsBillingMethod.BY_WEIGHT) {
    const base = Number(input.billingKg ?? input.totalKg ?? 0);
    return roundPrice(base * unit);
  }
  return input.logisticsFee ?? null;
}

function summarizeOrders(orders = []) {
  return orders.reduce(
    (acc, order) => {
      acc.totalQuantity += Number(order.quantity || 0);
      acc.totalPrice += Number(order.totalPrice || 0);
      acc.totalCartons += Number(order.cartonCount || 0);
      acc.totalCbm += Number(order.totalCbm || 0);
      acc.totalBillingKg += Number(order.billingKg || 0);
      acc.totalBillingCbm += Number(order.billingCbm || 0);
      return acc;
    },
    {
      totalQuantity: 0,
      totalPrice: 0,
      totalCartons: 0,
      totalCbm: 0,
      totalBillingKg: 0,
      totalBillingCbm: 0,
    }
  );
}

function sortStatusEvents(events = []) {
  const orderMap = new Map(STATUS_FLOW.map((s, idx) => [s, idx]));
  return [...events].sort((a, b) => {
    const orderDiff = (orderMap.get(a.status) ?? 0) - (orderMap.get(b.status) ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
  });
}

function mapOrderListItem(order) {
  const batchCode = `${order.batch.countryCode}${pad(order.batch.batchSequence)}`;
  const statusEvent = order.statusEvents?.find((e) => e.status === order.status);
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderDate: order.orderDate,
    status: order.status,
    statusDate: statusEvent?.occurredAt || null,
    batchId: order.batchId,
    batchNumber: order.batch.batchNumber,
    batchCode,
    salesRegion: order.salesRegion,
    skuName: order.skuName,
    productName: order.product?.name || '',
    productColor: order.productColor,
    productSpec: order.productSpec,
    plugSpec: order.plugSpec,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalPrice: order.totalPrice,
    logisticsProvider: order.logisticsProvider,
    warehousingProvider: order.warehousingProvider,
    cartonCount: order.cartonCount,
    totalCbm: order.totalCbm,
  };
}

async function fetchOrderDetail(orderId) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: {
      batch: true,
      product: { select: { sku: true, name: true } },
      statusEvents: true,
    },
  });
  if (!order) {
    return null;
  }
  return {
    ...order,
    statusEvents: sortStatusEvents(order.statusEvents),
    batchCode: `${order.batch.countryCode}${pad(order.batch.batchSequence)}`,
  };
}

async function buildProductSnapshotMap(tx, productIds = []) {
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, name: true },
  });
  const map = new Map();
  products.forEach((p) => map.set(p.id, p));
  return map;
}

router.get('/production/batches', authMiddleware, async (req, res) => {
  try {
    const batches = await prisma.productionBatch.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        orders: {
          include: {
            product: { select: { sku: true, name: true } },
            statusEvents: true,
          },
        },
      },
    });
    const batchList = batches.map((batch) => {
      const stats = summarizeOrders(batch.orders);
      return {
        ...batch,
        batchCode: `${batch.countryCode}${pad(batch.batchSequence)}`,
        stats,
      };
    });
    const overall = summarizeOrders(batches.flatMap((b) => b.orders || []));
    res.json({ batches: batchList, overall });
  } catch (error) {
    console.error('获取批次列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/production/orders', authMiddleware, async (req, res) => {
  try {
    const view = (req.query.view || 'in-progress').toString();
    const where = {};
    if (view === 'in-progress') {
      where.status = { not: ProductionOrderStatus.WAREHOUSED };
    } else if (view === 'completed') {
      where.status = ProductionOrderStatus.WAREHOUSED;
    }
    const orders = await prisma.productionOrder.findMany({
      where,
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        batch: true,
        product: { select: { sku: true, name: true } },
        statusEvents: true,
      },
    });
    const summary = summarizeOrders(orders);
    const items = orders.map(mapOrderListItem);
    res.json({ orders: items, summary });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/production/orders/:id', authMiddleware, async (req, res) => {
  try {
    const detail = await fetchOrderDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: '订单不存在' });
    }
    res.json(detail);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/admin/production/batches', adminMiddleware, async (req, res) => {
  const parsed = batchCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const countryCode = payload.countryCode.toUpperCase();
      const productIds = [...new Set(payload.orders.map((o) => o.productId))];
      const productMap = await buildProductSnapshotMap(tx, productIds);
      if (productMap.size !== productIds.length) {
        const missing = productIds.filter((id) => !productMap.has(id));
        const err = new Error(`产品不存在: ${missing.join(',')}`);
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
      }

      const lastBatch = await tx.productionBatch.findFirst({
        where: { countryCode },
        orderBy: { batchSequence: 'desc' },
        select: { batchSequence: true },
      });
      const batchSequence = (lastBatch?.batchSequence || 0) + 1;
      const batchNumber = pad(batchSequence);

      const batch = await tx.productionBatch.create({
        data: {
          countryCode,
          batchSequence,
          batchNumber,
          notes: payload.notes || null,
        },
      });

      const createdOrders = [];
      for (let idx = 0; idx < payload.orders.length; idx += 1) {
        const input = payload.orders[idx];
        const product = productMap.get(input.productId);
        const orderSequence = idx + 1;
        const orderCode = `${countryCode}${batchNumber}${pad(orderSequence)}`;
        const totalPrice = calcTotalPrice(input.quantity, input.unitPrice);
        const logisticsFee = calcLogisticsFee(input);

        const order = await tx.productionOrder.create({
          data: {
            orderCode,
            orderSequence,
            orderDate: input.orderDate,
            status: ProductionOrderStatus.IN_PRODUCTION,
            productId: input.productId,
            skuName: product?.sku || input.skuName,
            productColor: input.productColor,
            productSpec: input.productSpec,
            salesRegion: input.salesRegion || countryCode,
            plugSpec: input.plugSpec,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            totalPrice,
            outboundDate: input.outboundDate || null,
            logisticsProvider: input.logisticsProvider || null,
            logisticsUnitPrice: input.logisticsUnitPrice ?? null,
            warehousingProvider: input.warehousingProvider || null,
            cartonCount: input.cartonCount ?? null,
            totalCbm: input.totalCbm ?? null,
            totalKg: input.totalKg ?? null,
            billingCbm: input.billingCbm ?? null,
            billingKg: input.billingKg ?? null,
            billingMethod: input.billingMethod || null,
            logisticsFee: logisticsFee ?? input.logisticsFee ?? null,
            warehouseDate: input.warehouseDate || null,
            notes: input.notes || null,
            batchId: batch.id,
            statusEvents: {
              create: {
                status: ProductionOrderStatus.IN_PRODUCTION,
                occurredAt: input.orderDate,
              },
            },
          },
          include: {
            product: { select: { sku: true, name: true } },
            statusEvents: true,
            batch: true,
          },
        });
        createdOrders.push(order);
      }

      return { batch, orders: createdOrders };
    });

    const stats = summarizeOrders(result.orders);
    res.status(201).json({
      batch: {
        ...result.batch,
        batchCode: `${result.batch.countryCode}${pad(result.batch.batchSequence)}`,
        stats,
      },
      orders: result.orders.map(mapOrderListItem),
    });
  } catch (error) {
    if (error.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '批次或订单编号重复，请重试' });
    }
    console.error('创建批次失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/admin/production/orders', adminMiddleware, async (req, res) => {
  const parsed = appendOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({
        where: { id: payload.batchId },
      });
      if (!batch) {
        const err = new Error('批次不存在');
        err.code = 'BATCH_NOT_FOUND';
        throw err;
      }

      const productIds = [...new Set(payload.orders.map((o) => o.productId))];
      const productMap = await buildProductSnapshotMap(tx, productIds);
      if (productMap.size !== productIds.length) {
        const missing = productIds.filter((id) => !productMap.has(id));
        const err = new Error(`产品不存在: ${missing.join(',')}`);
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
      }

      const lastOrder = await tx.productionOrder.findFirst({
        where: { batchId: payload.batchId },
        orderBy: { orderSequence: 'desc' },
        select: { orderSequence: true },
      });
      let cursor = lastOrder?.orderSequence || 0;

      const createdOrders = [];
      for (let idx = 0; idx < payload.orders.length; idx += 1) {
        cursor += 1;
        const input = payload.orders[idx];
        const product = productMap.get(input.productId);
        const orderCode = `${batch.countryCode}${batch.batchNumber}${pad(cursor)}`;
        const totalPrice = calcTotalPrice(input.quantity, input.unitPrice);
        const logisticsFee = calcLogisticsFee(input);

        const order = await tx.productionOrder.create({
          data: {
            orderCode,
            orderSequence: cursor,
            orderDate: input.orderDate,
            status: ProductionOrderStatus.IN_PRODUCTION,
            productId: input.productId,
            skuName: product?.sku || input.skuName,
            productColor: input.productColor,
            productSpec: input.productSpec,
            salesRegion: input.salesRegion || batch.countryCode,
            plugSpec: input.plugSpec,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            totalPrice,
            outboundDate: input.outboundDate || null,
            logisticsProvider: input.logisticsProvider || null,
            logisticsUnitPrice: input.logisticsUnitPrice ?? null,
            warehousingProvider: input.warehousingProvider || null,
            cartonCount: input.cartonCount ?? null,
            totalCbm: input.totalCbm ?? null,
            totalKg: input.totalKg ?? null,
            billingCbm: input.billingCbm ?? null,
            billingKg: input.billingKg ?? null,
            billingMethod: input.billingMethod || null,
            logisticsFee: logisticsFee ?? input.logisticsFee ?? null,
            warehouseDate: input.warehouseDate || null,
            notes: input.notes || null,
            batchId: batch.id,
            statusEvents: {
              create: {
                status: ProductionOrderStatus.IN_PRODUCTION,
                occurredAt: input.orderDate,
              },
            },
          },
          include: {
            product: { select: { sku: true, name: true } },
            statusEvents: true,
            batch: true,
          },
        });
        createdOrders.push(order);
      }

      return { batch, orders: createdOrders };
    });

    res.status(201).json({
      batch: {
        ...result.batch,
        batchCode: `${result.batch.countryCode}${pad(result.batch.batchSequence)}`,
      },
      orders: result.orders.map(mapOrderListItem),
    });
  } catch (error) {
    if (error.code === 'BATCH_NOT_FOUND') {
      return res.status(404).json({ error: '批次不存在' });
    }
    if (error.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '订单编号重复，请重试' });
    }
    console.error('批次新增订单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/admin/production/orders/:id/status', adminMiddleware, async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  try {
    const order = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
      include: { statusEvents: true },
    });
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const nextIdx = STATUS_FLOW.indexOf(payload.status);
    if (nextIdx === -1) {
      return res.status(400).json({ error: '不支持的状态' });
    }
    if (nextIdx < currentIdx) {
      return res.status(400).json({ error: '状态不可回退' });
    }

    const dataToUpdate = { status: payload.status };
    if (payload.status === ProductionOrderStatus.WAREHOUSED) {
      dataToUpdate.warehouseDate = payload.occurredAt;
    }
    await prisma.productionOrderStatusEvent.upsert({
      where: {
        orderId_status: {
          orderId: order.id,
          status: payload.status,
        },
      },
      update: { occurredAt: payload.occurredAt },
      create: {
        orderId: order.id,
        status: payload.status,
        occurredAt: payload.occurredAt,
      },
    });
    await prisma.productionOrder.update({
      where: { id: order.id },
      data: dataToUpdate,
    });

    const detail = await fetchOrderDetail(order.id);
    res.json(detail);
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.patch('/admin/production/orders/:id', adminMiddleware, async (req, res) => {
  const parsed = orderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  try {
    const order = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
    });
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const updates = { ...payload };
    const quantity = payload.quantity ?? order.quantity;
    const unitPrice = payload.unitPrice ?? order.unitPrice;
    if (payload.quantity !== undefined || payload.unitPrice !== undefined || payload.totalPrice !== undefined) {
      updates.totalPrice = payload.totalPrice ?? calcTotalPrice(quantity, unitPrice);
      updates.quantity = quantity;
      updates.unitPrice = unitPrice;
    }

    updates.logisticsFee = calcLogisticsFee({
      ...order,
      ...payload,
      billingMethod: payload.billingMethod ?? order.billingMethod,
    }) ?? payload.logisticsFee ?? order.logisticsFee ?? null;

    await prisma.productionOrder.update({
      where: { id: order.id },
      data: updates,
    });

    const detail = await fetchOrderDetail(order.id);
    res.json(detail);
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
