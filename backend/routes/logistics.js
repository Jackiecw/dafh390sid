// ./backend/routes/logistics.js

const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const { LogisticsStatus } = require('@prisma/client');

const router = express.Router();

// --- Zod 验证模式 ---

// (用于创建批次)
const batchSchema = z.object({
  batchNumber: z.string().min(1, "批次号不能为空"),
  orderDate: z.string().date("订单日期无效"),
  productId: z.string().min(1, "必须选择一个产品"),
  productSpec: z.string().optional().nullable(),
  countryCode: z.string().min(1, "必须选择销售地"),
  quantity: z.coerce.number().int().min(1, "数量必须大于0"),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0),
  productionTimeDays: z.coerce.number().int().optional().nullable(),
  estimatedFactoryDate: z.string().date().optional().nullable(),
  logisticsProvider: z.string().optional().nullable(),
  freightForwarder: z.string().optional().nullable(),
  cartonCount: z.coerce.number().int().optional().nullable(),
  totalCbm: z.coerce.number().optional().nullable(),
  totalKg: z.coerce.number().optional().nullable(),
  estimatedWarehouseDate: z.string().date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// (用于更新批次状态)
const eventSchema = z.object({
  status: z.nativeEnum(LogisticsStatus),
  eventDate: z.string().date("事件日期无效"),
  notes: z.string().optional().nullable(),
});


// ------------------------------------------
// --- 公共路由 (运营/主管/Admin) ---
// ------------------------------------------

/**
 * GET /api/logistics/data
 * 获取所有物流批次数据 (用于表格和看板)
 */
router.get('/logistics/data', authMiddleware, async (req, res) => {
  try {
    const { role, operatedCountries } = req.user;
    const where = {};

    // 权限控制：非 Admin 只能看自己运营的国家
    if (role !== 'admin') {
      where.countryCode = { in: operatedCountries };
    }

    const batches = await prisma.logisticsBatch.findMany({
      where: where,
      orderBy: { orderDate: 'desc' },
      include: {
        product: { select: { sku: true, name: true } },
        country: { select: { name: true, code: true } },
        // (核心) 同时获取所有关联的事件，并按日期排序
        events: {
          orderBy: { eventDate: 'asc' },
          include: {
            createdBy: { select: { nickname: true } }
          }
        }
      }
    });
    res.json(batches);
  } catch (error) {
    console.error('获取物流数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ------------------------------------------
// --- 管理员路由 (Admin) ---
// ------------------------------------------

/**
 * POST /api/admin/logistics/batches
 * 创建一个新的物流批次
 */
router.post('/admin/logistics/batches', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const validation = batchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const data = validation.data;

    // (核心) 创建批次时，自动创建第一个 "生产中" 事件
    const newBatch = await prisma.logisticsBatch.create({
      data: {
        ...data,
        orderDate: new Date(data.orderDate),
        estimatedFactoryDate: data.estimatedFactoryDate ? new Date(data.estimatedFactoryDate) : null,
        estimatedWarehouseDate: data.estimatedWarehouseDate ? new Date(data.estimatedWarehouseDate) : null,
        currentStatus: 'FACTORY', // 默认状态
        // (自动创建第一个事件)
        events: {
          create: {
            status: 'FACTORY',
            eventDate: new Date(data.orderDate), // 默认使用订单日期
            notes: '创建生产批次',
            createdById: userId
          }
        }
      },
      include: { // (返回完整数据以便前端更新)
        product: { select: { sku: true, name: true } },
        country: { select: { name: true, code: true } },
        events: {
          orderBy: { eventDate: 'asc' },
          include: { createdBy: { select: { nickname: true } } }
        }
      }
    });
    
    res.status(201).json(newBatch);

  } catch (error) {
    if (error.code === 'P2002' && error.meta.target.includes('batchNumber')) {
      return res.status(400).json({ error: '此批次号已被占用' });
    }
    console.error('创建批次失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/admin/logistics/batches/:id/events
 * (核心) 为批次添加一个新的物流事件 (更新状态)
 */
router.post('/admin/logistics/batches/:id/events', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id: batchId } = req.params;
    
    const validation = eventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const data = validation.data;

    // (使用事务) 1. 创建新事件 2. 更新批次的主状态
    const [newEvent, updatedBatch] = await prisma.$transaction([
      // 1. 创建事件
      prisma.logisticsEvent.create({
        data: {
          batchId: batchId,
          status: data.status,
          eventDate: new Date(data.eventDate),
          notes: data.notes,
          createdById: userId
        }
      }),
      // 2. 更新批次的 `currentStatus`
      prisma.logisticsBatch.update({
        where: { id: batchId },
        data: {
          currentStatus: data.status
        }
      })
    ]);

    res.status(201).json(newEvent);

  } catch (error) {
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '批次未找到' });
    }
    console.error('更新物流状态失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


/**
 * DELETE /api/admin/logistics/batches/:id
 * 删除一个批次 (及其所有关联事件)
 */
router.delete('/admin/logistics/batches/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // (由于 schema 中设置了 onDelete: Cascade, prisma 会自动删除所有关联的 LogisticsEvent)
    await prisma.logisticsBatch.delete({
      where: { id: id }
    });
    
    res.status(204).send();
  } catch (error) {
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '批次未找到' });
    }
    console.error('删除批次失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (未来可以补充 PUT /admin/logistics/batches/:id 来修改批次详情)
// (未来可以补充 DELETE /admin/logistics/events/:id 来删除/回滚事件)

module.exports = router;