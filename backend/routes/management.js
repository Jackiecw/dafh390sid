// ./backend/routes/management.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
// ⬇️ (修改 1/3) 移除了 ProductCategory
const { Platform, Country, StoreStatus } = require('@prisma/client');

const router = express.Router();
router.use(adminMiddleware); // (关键) 只有 Admin 可以访问这些接口

// --- Zod 验证模式 (用于创建/更新) ---

const storeSchema = z.object({
  name: z.string().min(1, "店铺名称不能为空"),
  platform: z.nativeEnum(Platform),
  country: z.nativeEnum(Country),
  status: z.nativeEnum(StoreStatus),
  platformStoreId: z.string().optional().nullable(),
  registeredAt: z.string().datetime().optional().nullable(),
});

// ⬇️ (修改 2/3) 删除了 productSchema

// --- 辅助接口 (用于填充下拉菜单) ---

// (GET /api/admin/management-options)
router.get('/management-options', (req, res) => {
  res.json({
    platforms: Object.values(Platform),
    countries: Object.values(Country),
    storeStatuses: Object.values(StoreStatus),
    // ⬇️ (修改 3/3) 移除了 productCategories
  });
});

// --- 店铺 (Store) CRUD ---

// (GET /api/admin/stores)
router.get('/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: '获取店铺列表失败' });
  }
});

// (POST /api/admin/stores)
router.post('/stores', async (req, res) => {
  try {
    // registeredAt 可能为空, 单独处理
    const { registeredAt, ...rest } = req.body;
    const validation = storeSchema.safeParse(rest);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const newStore = await prisma.store.create({
      data: {
        ...validation.data,
        registeredAt: registeredAt ? new Date(registeredAt) : null,
      },
    });
    res.status(201).json(newStore);
  } catch (error) {
     if (error.code === 'P2002') return res.status(400).json({ error: '此店铺名称 (name) 已被占用' });
    res.status(500).json({ error: '创建店铺失败' });
  }
});

// --- 商品 (Product) CRUD ---
// ⬇️ (修改 4/4) 删除了所有 商品(Product) 相关的路由

module.exports = router;