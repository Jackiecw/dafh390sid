// ./backend/routes/logistics.js
// 生产与物流管理：批次、订单、状态流、统计、导出、批量操作

const express = require('express');
const { z } = require('zod');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const xlsx = require('xlsx'); // 引入 xlsx 用于导出
const {
  ProductionOrderStatus,
  LogisticsBillingMethod,
} = require('@prisma/client');

const router = express.Router();

// --- 常量定义 ---
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

const STATUS_LABELS = {
  IN_PRODUCTION: '生产中',
  PRODUCTION_DONE: '生产完成',
  SHIPPED_OUT: '已出库',
  CONTAINER_LOADED: '已装柜',
  EXPORTED: '出口',
  IN_TRANSIT: '运输',
  IMPORTED: '进口',
  DELIVERING: '派送',
  WAREHOUSED: '已入仓',
};

// --- Zod Schema ---

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

// 批量更新状态 Schema
const batchStatusUpdateSchema = z.object({
  orderIds: z.array(z.string()).min(1, "至少选择一个订单"),
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

// --- 辅助函数 ---

const pad = (num = 0, width = 2) => num.toString().padStart(width, '0');
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
  const batchCode = order.batch ? `${order.batch.countryCode}${pad(order.batch.batchSequence)}` : 'N/A';
  // 获取最新状态时间
  const currentStatusEvent = order.statusEvents?.find(e => e.status === order.status);
  
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderDate: order.orderDate,
    status: order.status,
    statusDate: currentStatusEvent?.occurredAt || null,
    batchId: order.batchId,
    batchNumber: order.batch?.batchNumber,
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
    logisticsFee: order.logisticsFee,
  };
}

async function fetchOrderDetail(orderId) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: {
      batch: true,
      product: { select: { sku: true, name: true } },
      statusEvents: {
        include: { createdBy: { select: { nickname: true } } } // 包含操作人
      },
    },
  });
  if (!order) return null;
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

// --- 路由 ---

/**
 * GET /api/production/batches
 * 获取批次列表（带简单统计）
 */
router.get('/production/batches', authMiddleware, async (req, res) => {
  try {
    const batches = await prisma.productionBatch.findMany({
      where: { deletedAt: null }, // 软删除过滤
      orderBy: [{ createdAt: 'desc' }],
      include: {
        orders: {
          where: { deletedAt: null }, // 订单也过滤软删除
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

/**
 * GET /api/production/orders
 * 获取订单列表（支持分页、筛选、搜索）
 */
router.get('/production/orders', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, pageSize = 20, 
      view, // in-progress (默认) | completed | all
      keyword,
      startDate, endDate,
      countryCode,
      batchId
    } = req.query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    // 构建过滤条件
    const where = {
      deletedAt: null // 软删除过滤
    };

    // 视图筛选
    if (view === 'completed') {
      where.status = ProductionOrderStatus.WAREHOUSED;
    } else if (view === 'in-progress') {
      where.status = { not: ProductionOrderStatus.WAREHOUSED };
    }
    // 'all' 不加状态筛选

    // 搜索 (SKU, 订单号, 批次号)
    if (keyword) {
      where.OR = [
        { skuName: { contains: keyword, mode: 'insensitive' } },
        { orderCode: { contains: keyword, mode: 'insensitive' } },
        { product: { sku: { contains: keyword, mode: 'insensitive' } } },
        // 批次号关联查询
        { batch: { batchNumber: { contains: keyword, mode: 'insensitive' } } }
      ];
    }

    // 日期范围 (默认按 orderDate)
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    // 国家筛选
    if (countryCode) {
      where.salesRegion = countryCode;
    }

    // 批次筛选
    if (batchId) {
      where.batchId = batchId;
    }

    // 执行查询
    const [total, orders] = await prisma.$transaction([
      prisma.productionOrder.count({ where }),
      prisma.productionOrder.findMany({
        where,
        skip,
        take,
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          batch: true,
          product: { select: { sku: true, name: true } },
          statusEvents: true,
        },
      })
    ]);

    // 计算当前筛选条件下的总汇总（非分页）用于 Dashboard 展示
    const allOrdersForSummary = await prisma.productionOrder.findMany({
        where,
        select: {
            quantity: true, totalPrice: true, cartonCount: true, totalCbm: true, billingKg: true, billingCbm: true
        }
    });
    const summary = summarizeOrders(allOrdersForSummary);

    const items = orders.map(mapOrderListItem);
    
    res.json({ 
      data: items, 
      total, 
      page: Number(page), 
      pageSize: Number(take),
      summary 
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/admin/production/export
 * 导出订单为 Excel
 */
router.get('/admin/production/export', adminMiddleware, async (req, res) => {
  try {
    const { view, keyword, startDate, endDate, countryCode } = req.query;
    
    const where = { deletedAt: null };
    if (view === 'completed') where.status = ProductionOrderStatus.WAREHOUSED;
    else if (view === 'in-progress') where.status = { not: ProductionOrderStatus.WAREHOUSED };

    if (keyword) {
      where.OR = [
        { skuName: { contains: keyword, mode: 'insensitive' } },
        { orderCode: { contains: keyword, mode: 'insensitive' } },
        { product: { sku: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }
    if (countryCode) where.salesRegion = countryCode;

    const orders = await prisma.productionOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      include: {
        batch: true,
        product: { select: { sku: true } }
      }
    });

    // 准备 Excel 数据
    const data = orders.map(o => ({
      '批次号': o.batch?.batchNumber,
      '订单编号': o.orderCode,
      '下单日期': o.orderDate ? o.orderDate.toISOString().split('T')[0] : '',
      '状态': STATUS_LABELS[o.status] || o.status,
      '销售地': o.salesRegion,
      'SKU': o.product?.sku,
      '产品名称': o.skuName,
      '颜色': o.productColor,
      '数量': o.quantity,
      '单价': o.unitPrice,
      '总价': o.totalPrice,
      '物流商': o.logisticsProvider,
      '箱数': o.cartonCount,
      '体积(CBM)': o.totalCbm,
      '重量(KG)': o.totalKg,
      '物流费': o.logisticsFee,
      '预计出库': o.outboundDate ? o.outboundDate.toISOString().split('T')[0] : '',
      '入仓日期': o.warehouseDate ? o.warehouseDate.toISOString().split('T')[0] : '',
      '备注': o.notes
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '物流订单');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="logistics_export_${Date.now()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ error: '导出失败' });
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

/**
 * POST /admin/production/batches
 * 创建批次
 */
router.post('/admin/production/batches', adminMiddleware, async (req, res) => {
  const parsed = batchCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  const adminId = req.user.userId; // 获取操作人

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
                createdById: adminId, // 记录创建人
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

/**
 * POST /admin/production/orders
 * 追加订单到批次 (逻辑类似，省略部分重复细节，加上 createdById)
 */
router.post('/admin/production/orders', adminMiddleware, async (req, res) => {
  const parsed = appendOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  const payload = parsed.data;
  const adminId = req.user.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id: payload.batchId } });
      if (!batch) throw new Error('批次不存在');

      const productIds = [...new Set(payload.orders.map((o) => o.productId))];
      const productMap = await buildProductSnapshotMap(tx, productIds); // Reuse helper

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
            batchId: batch.id,
            statusEvents: {
              create: {
                status: ProductionOrderStatus.IN_PRODUCTION,
                occurredAt: input.orderDate,
                createdById: adminId,
              },
            },
          },
          include: { product: true, batch: true, statusEvents: true }
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
    console.error('追加订单失败', error);
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
});

/**
 * POST /admin/production/orders/:id/status
 * 更新单个订单状态
 */
router.post('/admin/production/orders/:id/status', adminMiddleware, async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const payload = parsed.data;
  const adminId = req.user.userId;

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
    if (nextIdx === -1) return res.status(400).json({ error: '不支持的状态' });
    if (nextIdx < currentIdx) return res.status(400).json({ error: '状态不可回退' });

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
      update: { 
        occurredAt: payload.occurredAt,
        createdById: adminId // 更新操作人
      },
      create: {
        orderId: order.id,
        status: payload.status,
        occurredAt: payload.occurredAt,
        createdById: adminId // 记录操作人
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

/**
 * POST /admin/production/orders/batch-status
 * 批量更新状态 (新增)
 */
router.post('/admin/production/orders/batch-status', adminMiddleware, async (req, res) => {
  const parsed = batchStatusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '输入无效', details: parsed.error.errors });
  }
  const { orderIds, status, occurredAt } = parsed.data;
  const adminId = req.user.userId;

  try {
    // 1. 查找所有目标订单
    const orders = await prisma.productionOrder.findMany({
      where: { id: { in: orderIds }, deletedAt: null },
      select: { id: true, status: true }
    });

    if (orders.length === 0) {
      return res.status(404).json({ error: '未找到有效订单' });
    }

    const targetIdx = STATUS_FLOW.indexOf(status);
    if (targetIdx === -1) return res.status(400).json({ error: '目标状态无效' });

    // 2. 过滤掉不能更新的订单 (回退检查)
    const validOrderIds = orders
      .filter(o => STATUS_FLOW.indexOf(o.status) <= targetIdx) // 允许原地更新日期或前进
      .map(o => o.id);

    if (validOrderIds.length === 0) {
      return res.status(400).json({ error: '所选订单的状态均高于目标状态，无法更新' });
    }

    // 3. 批量更新 (事务)
    await prisma.$transaction(async (tx) => {
      // 更新 Order 表
      const updateData = { status };
      if (status === ProductionOrderStatus.WAREHOUSED) {
        updateData.warehouseDate = occurredAt;
      }
      await tx.productionOrder.updateMany({
        where: { id: { in: validOrderIds } },
        data: updateData
      });

      // 插入/更新 Event 表 (由于 Prisma createMany 不支持 onConflict update，需用循环或 upsert)
      // 为了性能，这里用循环 upsert (数量通常不多，<100)
      for (const oid of validOrderIds) {
        await tx.productionOrderStatusEvent.upsert({
          where: { orderId_status: { orderId: oid, status } },
          update: { occurredAt, createdById: adminId },
          create: { orderId: oid, status, occurredAt, createdById: adminId }
        });
      }
    });

    res.json({ message: `成功更新 ${validOrderIds.length} 条订单状态` });

  } catch (error) {
    console.error('批量更新状态失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PATCH /admin/production/orders/:id
 * 修改订单详情 (增加锁定校验)
 */
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
    if (!order) return res.status(404).json({ error: '订单不存在' });

    // --- 锁定校验 ---
    const isWarehoused = order.status === ProductionOrderStatus.WAREHOUSED;
    const isSensitiveChange = 
      payload.quantity !== undefined || 
      payload.unitPrice !== undefined || 
      payload.totalPrice !== undefined ||
      payload.logisticsFee !== undefined;

    if (isWarehoused && isSensitiveChange) {
      return res.status(403).json({ error: '订单已入仓，禁止修改数量、单价或物流费用。' });
    }
    // ----------------

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

/**
 * DELETE /admin/production/orders/:id
 * 软删除
 */
router.delete('/admin/production/orders/:id', adminMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    await prisma.productionOrder.update({
      where: { id: orderId },
      data: { deletedAt: new Date() } // 软删除
    });
    
    // 可选：如果批次内所有订单都被删了，批次是否也要删？暂不处理
    res.status(204).send();
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

/**
 * DELETE /admin/production/batches/:id
 * 软删除整个批次
 */
router.delete('/admin/production/batches/:id', adminMiddleware, async (req, res) => {
  try {
    const batchId = req.params.id;
    const now = new Date();
    
    await prisma.$transaction([
      prisma.productionBatch.update({
        where: { id: batchId },
        data: { deletedAt: now }
      }),
      prisma.productionOrder.updateMany({
        where: { batchId: batchId },
        data: { deletedAt: now }
      })
    ]);
    res.status(204).send();
  } catch (error) {
    console.error('删除批次失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;