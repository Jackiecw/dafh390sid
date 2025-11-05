// ./backend/routes/management.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const { Platform, Country, StoreStatus } = require('@prisma/client');

const router = express.Router();
router.use(adminMiddleware); // (关键) 只有 Admin 可以访问这些接口

// --- Zod 验证模式 (用于创建/更新) ---

const storeSchema = z.object({
  name: z.string().min(1, "店铺名称不能为空"),
  platform: z.nativeEnum(Platform),
  // ⬇️ 【修改】 注意：这里的 "Country" 验证在第一步中已被删除
  //    我们应该验证 countryCode (一个字符串)
  //    让我们修正 storeSchema
  countryCode: z.string().min(1, "必须选择一个国家"),
  status: z.nativeEnum(StoreStatus),
  platformStoreId: z.string().optional().nullable(),
  registeredAt: z.string().datetime().optional().nullable(),
});

// ⬇️ 【新增】 "国家" 验证模式
const countrySchema = z.object({
  code: z.string().min(2, "国家代码 (Code) 至少需要2个字符").max(10),
  name: z.string().min(1, "国家名称不能为空"),
  establishedAt: z.string().datetime().optional().nullable(),
});


// --- 辅助接口 (用于填充下拉菜单) ---

// (GET /api/admin/management-options)
router.get('/management-options', (req, res) => {
  res.json({
    platforms: Object.values(Platform),
    // ⬇️ 【修改】 "Country" 枚举已不存在，所以我们删除这一行
    // countries: Object.values(Country), 
    storeStatuses: Object.values(StoreStatus),
  });
});

// --- 店铺 (Store) CRUD ---

// (GET /api/admin/stores)
router.get('/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      // ⬇️ 【新增】 包含关联的国家信息
      include: {
        country: true 
      }
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
    
    // ⬇️ 【修改】 修正验证
    // 我们期望的 payload 是 { name, platform, status, countryCode, ... }
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
    res.status(500).json({ error: '创建店铺失败' });
  }
});

// (GET /api/admin/stores/:id)
router.get('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
    });
    if (!store) {
      return res.status(404).json({ error: '店铺未找到' });
    }
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: '获取店铺详情失败' });
  }
});

// (PUT /api/admin/stores/:id)
router.put('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ⬇️ 【修改】 修正验证
    const { registeredAt, ...rest } = req.body;
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
    res.status(500).json({ error: '更新店铺失败' });
  }
});

// --- ⬇️ 【新增】 国家 (ManagedCountry) CRUD ---

// (GET /api/admin/countries)
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

// (POST /api/admin/countries)
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
    res.status(500).json({ error: '创建国家失败' });
  }
});

// (PUT /api/admin/countries/:id)
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
    res.status(500).json({ error: '更新国家失败' });
  }
});


module.exports = router;