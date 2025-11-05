// ./backend/routes/management.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const { Platform, StoreStatus } = require('@prisma/client'); // ⬅️ 移除了 Country

const router = express.Router();
router.use(adminMiddleware); // (关键) 只有 Admin 可以访问这些接口

// --- Zod 验证模式 (用于创建/更新) ---

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

// (GET /api/admin/management-options)
router.get('/management-options', (req, res) => {
  res.json({
    platforms: Object.values(Platform),
    storeStatuses: Object.values(StoreStatus),
  });
});

// --- 店铺 (Store) CRUD ---

// (GET /api/admin/stores)
// ⬇️ 【已修复】
router.get('/stores', async (req, res) => {
  try {
    // 
    // 【已删除】这里是原先导致崩溃的错误查询，已被移除
    // 
    
    // (这是正确的查询逻辑)
    const storesWithListings = await prisma.store.findMany({
       orderBy: { name: 'asc' },
       include: {
         country: true,
         listings: { // ⬅️ 读取我们新的 Listing 模型
           select: {
             product: { // ⬅️ 选择 Listing 关联的 Product
               select: { sku: true }
             }
           }
         }
       }
    });
    
    // (将 listings 转换回旧的 `products` 格式，以最小化前端改动)
    const formattedStores = storesWithListings.map(store => {
      const { listings, ...rest } = store;
      return {
        ...rest,
        products: listings.map(l => l.product) // ⬅️ 转换
      };
    });
    
    res.json(formattedStores); // ⬅️ 返回修正后的数据
    
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    res.status(500).json({ error: '获取店铺列表失败' });
  }
});
// ⬆️ 【已修复】

// (POST /api/admin/stores) (不变)
router.post('/stores', async (req, res) => {
  try {
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
     if (error.code === 'P2003') return res.status(400).json({ error: '选择的国家 (Country Code) 无效' });
    res.status(500).json({ error: '创建店铺失败' });
  }
});

// (GET /api/admin/stores/:id) (不变)
router.get('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
      include: { 
        listings: { 
          select: { 
            productId: true 
          } 
        } 
      } 
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
    res.status(500).json({ error: '更新国家失败' });
  }
});


// --- (不变) 店铺-商品 关联 ---
router.put('/stores/:id/products', async (req, res) => {
  try {
    const { id: storeId } = req.params;
    const { productIds } = req.body; // 期望: { productIds: ["id1", "id2"] }

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds 必须是一个数组' });
    }

    // 1. 获取当前该店铺所有的上架 (Listings)
    const currentListings = await prisma.storeProductListing.findMany({
      where: { storeId: storeId },
      select: { productId: true }
    });
    const currentProductIds = currentListings.map(l => l.productId);
    
    // 2. 找出需要删除的 (在当前列表，但不在新列表)
    const productIdsToDelete = currentProductIds.filter(
      pid => !productIds.includes(pid)
    );
    
    // 3. 找出需要新增的 (在新列表，但不在当前列表)
    const productIdsToCreate = productIds.filter(
      pid => !currentProductIds.includes(pid)
    );
    
    // 4. (核心) 在一个事务中执行删除和创建
    await prisma.$transaction([
      // (A) 删除
      prisma.storeProductListing.deleteMany({
        where: {
          storeId: storeId,
          productId: { in: productIdsToDelete }
        }
      }),
      // (B) 创建
      prisma.storeProductListing.createMany({
        data: productIdsToCreate.map(pid => ({
          storeId: storeId,
          productId: pid,
          currentPrice: 0 // (重要) 默认售价为 0
        })),
        skipDuplicates: true // (安全)
      })
    ]);

    res.json({ message: '商品分配更新成功' });

  } catch (error) {
    console.error('更新商品关联失败:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: '店铺未找到' });
    res.status(500).json({ error: '更新商品关联失败' });
  }
});

module.exports = router;