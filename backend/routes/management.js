// ./backend/routes/management.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const { Platform, StoreStatus } = require('@prisma/client');

const router = express.Router();
router.use(adminMiddleware); // (关键) 只有 Admin 可以访问这些接口

// --- Zod 验证模式 (不变) ---

const storeSchema = z.object({
  name: z.string().min(1, "店铺名称不能为空"),
  platform: z.nativeEnum(Platform),
  countryCode: z.string().min(1, "必须选择一个国家"),
  status: z.nativeEnum(StoreStatus),
  platformStoreId: z.string().optional().nullable(),
  registeredAt: z.string().datetime().optional().nullable(),
});

// (不变) "国家" 验证模式
const countrySchema = z.object({
  code: z.string().min(2, "国家代码 (Code) 至少需要2个字符").max(10),
  name: z.string().min(1, "国家名称不能为空"),
  establishedAt: z.string().datetime().optional().nullable(),
});


// --- 辅助接口 (用于填充下拉菜单) ---

// (GET /api/admin/management-options) (不变)
router.get('/management-options', (req, res) => {
  res.json({
    platforms: Object.values(Platform),
    storeStatuses: Object.values(StoreStatus),
  });
});

// --- 店铺 (Store) CRUD ---

// (GET /api/admin/stores) (简单修改)
// ⬇️ 【修改】: 我们不再需要 include 'listings' 或 'products'。
//           主列表页只需要店铺的基本信息。
router.get('/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
       orderBy: { name: 'asc' },
       include: {
         country: true, // (保持) 仍然需要国家名称
         // (移除 'listings' and 'products' 的 include)
       }
    });
    
    // (不再需要格式化)
    res.json(stores); 
    
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    res.status(500).json({ error: '获取店铺列表失败' });
  }
});
// ⬆️ 【修改】

// (POST /api/admin/stores) (不变)
router.post('/stores', async (req, res) => {
  try {
    const { registeredAt, ...rest } = req.body;
    
    // ⬇️ 【修改】 Zod schema 现在是 storeSchema (它不包含 productIds)
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
     if (error.code === 'P2003') return res.status(400).json({ error: '选择的国家 (Country Code) 无效' });
    console.error('创建店铺失败:', error);
    res.status(500).json({ error: '创建店铺失败' });
  }
});

// (GET /api/admin/stores/:id) (简单修改)
// (这个接口现在只用于 "编辑店铺" 弹窗，不再需要返回 'listings')
router.get('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
      // ⬇️ 【修改】 移除 include
    });
    if (!store) {
      return res.status(404).json({ error: '店铺未找到' });
    }
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: '获取店铺详情失败' });
  }
});

// (PUT /api/admin/stores/:id) (不变)
router.put('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { registeredAt, ...rest } = req.body;
    // ⬇️ 【修改】 Zod schema 现在是 storeSchema (它不包含 productIds)
    const validation = storeSchema.safeParse(rest);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }

    const updatedStore = await prisma.store.update({
      where: { id: id },
      data: {
        ...validation.data,
        registeredAt: registeredAt ? new Date(registeredAt) : null,
      },
    });
    res.json(updatedStore);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: '此店铺名称 (name) 已被占用' });
    if (error.code === 'P2003') return res.status(400).json({ error: '选择的国家 (Country Code) 无效' });
    if (error.code === 'P2025') return res.status(404).json({ error: '店铺未找到' });
    console.error('更新店铺失败:', error);
    res.status(500).json({ error: '更新店铺失败' });
  }
});

// DELETE /api/admin/stores/:id (不变)
router.delete('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.store.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '店铺未找到' });
    }

    // (Prisma 的 onDelete: Cascade 会自动删除所有关联的 StoreProductListing)
    // (我们仍然需要手动处理 SalesData 和 Expense)
    await prisma.$transaction([
      // 1. (自动) StoreProductListing 被级联删除
      // 2. (手动) 删除关联的销售数据
      prisma.salesData.deleteMany({ where: { storeId: id } }),
      // 3. (手动) 将支出的关联设为 null
      prisma.expense.updateMany({
        where: { storeId: id },
        data: { storeId: null },
      }),
      // 4. (手动) 删除店铺
      prisma.store.delete({ where: { id } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('删除店铺失败:', error);
    res.status(500).json({ error: '删除店铺失败' });
  }
});

// --- (不变) 国家 (ManagedCountry) CRUD ---
router.get('/countries', async (req, res) => {
  try {
    const countries = await prisma.managedCountry.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: '获取国家列表失败' });
  }
});
router.post('/countries', async (req, res) => {
  try {
    const { establishedAt, ...rest } = req.body;
    const validation = countrySchema.safeParse(rest);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const newCountry = await prisma.managedCountry.create({
      data: {
        ...validation.data,
        establishedAt: establishedAt ? new Date(establishedAt) : null,
      },
    });
    res.status(201).json(newCountry);
  } catch (error) {
     if (error.code === 'P2002') return res.status(400).json({ error: '此国家代码 (Code) 已被占用' });
    console.error('创建国家失败:', error);
    res.status(500).json({ error: '创建国家失败' });
  }
});
router.put('/countries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { establishedAt, ...rest } = req.body;
    const validation = countrySchema.safeParse(rest);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const updatedCountry = await prisma.managedCountry.update({
      where: { id: id },
      data: {
        ...validation.data,
        establishedAt: establishedAt ? new Date(establishedAt) : null,
      },
    });
    res.json(updatedCountry);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: '此国家代码 (Code) 已被占用' });
    if (error.code === 'P2025') return res.status(404).json({ error: '国家未找到' });
    console.error('更新国家失败:', error);
    res.status(500).json({ error: '更新国家失败' });
  }
});


// --- (已删除) 店铺-商品 关联 ---
// ⬇️ 【修改】 
// (原 PUT /api/admin/stores/:id/products 接口已删除)
// ⬆️ 【修改】

module.exports = router;