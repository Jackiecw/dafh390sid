// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod'); // ⬅️ 【新增】 导入 Zod

const router = express.Router();

// --- 辅助：Zod 验证模式 ---
const salesDataSchema = z.object({
  // ⬇️ 【修改】
  recordDate: z.string().date({ message: "日期格式无效 (应为 YYYY-MM-DD)" }), 
  // ⬆️ 【修改】
  storeId: z.string().min(1, "必须选择店铺"),
  productId: z.string().min(1, "必须选择商品"),
  salesVolume: z.coerce.number().int().min(0, "销量不能为负"),
  revenue: z.coerce.number().min(0, "销售额不能为负"),
  notes: z.string().nullable().optional(),
});


// ------------------------------------------
// --- 现有路由 (已修改) ---
// ------------------------------------------

// (不变) GET /api/reports
router.get('/reports', adminMiddleware, async (req, res) => {
  try {
    const reports = await prisma.weeklyReport.findMany({
      orderBy: { weekStartDate: 'desc' },
      include: { author: { select: { nickname: true } } }
    });
    res.json(reports);
  } catch (error) {
    console.error('获取周报列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (不变) GET /api/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const detailedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    });
    if (!detailedUser) {
      return res.status(404).json({ error: '用户未找到' });
    }
    res.json({
        id: detailedUser.id,
        username: detailedUser.username,
        nickname: detailedUser.nickname,
        role: detailedUser.role.name
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (修改) POST /api/sales (使用 Zod 验证)
router.post('/sales', authMiddleware, async (req, res) => {
  try {
    // ⬇️ 【修改】 使用 Zod 验证
    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    const { recordDate, storeId, productId, salesVolume, revenue, notes } = validation.data;
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
      data: {
        recordDate: new Date(recordDate), // ⬅️ new Date() 可以正确处理 'YYYY-MM-DD'
        salesVolume: salesVolume,
        revenue: revenue,
        notes: notes || null,
        enteredById: userId, 
        storeId: storeId,
        productId: productId, 
      }
    });
    res.status(201).json(newSalesData);
  } catch (error) {
    console.error('提交销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '提交失败：所选的店铺或商品无效' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (不变) POST /api/reports
router.post('/reports', authMiddleware, async (req, res) => {
  try {
    const { 
      weekStartDate, summaryThisWeek, planNextWeek, 
      problemsEncountered, other 
    } = req.body;

    if (!weekStartDate || !summaryThisWeek || !planNextWeek) {
      return res.status(400).json({ error: '周开始日期、本周总结和下周计划是必填项' });
    }
    const userId = req.user.userId;

    const newReport = await prisma.weeklyReport.create({
      data: {
        weekStartDate: new Date(weekStartDate),
        summaryThisWeek: summaryThisWeek,
        planNextWeek: planNextWeek,
        problemsEncountered: problemsEncountered || null,
        other: other || null,
        authorId: userId, 
      }
    });
    res.status(201).json(newReport);
  } catch (error) {
    console.error('提交周报失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (不变) GET /api/stores/:id/products
router.get('/stores/:id/products', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
      include: {
        products: {
          select: { id: true, sku: true, name: true },
          orderBy: { sku: 'asc' }
        }
      }
    });
    if (!store) return res.status(404).json({ error: '店铺未找到' });
    res.json(store.products);
  } catch (error) {
    res.status(500).json({ error: '获取店铺商品失败' });
  }
});


// ------------------------------------------
// --- ⬇️ 【(不变)】 销售数据管理 API ---
// ------------------------------------------

/**
 * 辅助函数：检查用户是否有权管理某条数据
 */
async function checkManagementPermission(userId, salesDataId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } }, supervisedCountries: { select: { code: true } } }
  });

  if (user.role.name === 'admin') {
    return { canManage: true, error: null };
  }
  
  const salesData = await prisma.salesData.findUnique({
    where: { id: salesDataId },
    include: { store: { select: { countryCode: true } } }
  });

  if (!salesData) {
    return { canManage: false, error: '数据未找到', status: 404 };
  }

  const supervisedCodes = user.supervisedCountries.map(c => c.code);
  if (supervisedCodes.includes(salesData.store.countryCode)) {
    return { canManage: true, error: null };
  }

  return { canManage: false, error: '您没有权限管理此条数据', status: 403 };
}


/**
 * GET /api/sales-data
 * 获取销售数据列表 (带权限和筛选)
 */
router.get('/sales-data', authMiddleware, async (req, res) => {
  try {
    const { role, operatedCountries, supervisedCountries } = req.user;
    
    // 1. (筛选) 从 req.query 获取筛选器
    const { 
      countryCode, platform, storeId, 
      startDate, endDate, 
      sortBy, sortOrder // e.g., sortBy='revenue', sortOrder='desc'
    } = req.query;

    // 2. (权限) 构建基础 Where 查询
    const where = {};

    if (role !== 'admin') {
      // (核心权限) 只能查看自己运营的国家
      where.store = { 
        countryCode: { in: operatedCountries }
      };
    }

    // 3. (筛选) 合并筛选条件
    if (countryCode) {
      where.store = { ...where.store, countryCode: countryCode };
    }
    if (platform) {
      where.store = { ...where.store, platform: platform };
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (startDate && endDate) {
      where.recordDate = { 
        gte: new Date(startDate), 
        // (修正) 确保 endDate 包含当天
        lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    } else if (startDate) {
      where.recordDate = { gte: new Date(startDate) };
    }

    // 4. (排序) 构建排序
    const orderBy = {};
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
      // (安全) 仅允许对特定字段排序
      const allowedSortBy = ['recordDate', 'salesVolume', 'revenue', 'createdAt'];
      if (allowedSortBy.includes(sortBy)) {
         orderBy[sortBy] = sortOrder;
      } else {
         orderBy.recordDate = 'desc';
      }
    } else {
      orderBy.recordDate = 'desc'; // 默认按日期倒序
    }

    // 5. (查询) 执行查询
    const salesData = await prisma.salesData.findMany({
      where: where,
      orderBy: orderBy,
      include: {
        store: { 
          include: { country: true } // (需要国家名称)
        }, 
        product: { // (需要商品 SKU 和名称)
          select: { sku: true, name: true }
        },
        enteredBy: { // (需要录入人昵称)
          select: { nickname: true }
        }
      }
    });

    // 6. (权限) 注入 'canManage' 标记
    const supervisedCodes = supervisedCountries || [];
    const isAdmin = role === 'admin';
    
    const response = salesData.map(row => ({
      ...row,
      // (核心逻辑) Admin可以管理，或者主管可以管理
      canManage: isAdmin || supervisedCodes.includes(row.store.countryCode)
    }));

    res.json(response);

  } catch (error) {
    console.error('获取销售数据列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/sales-data/:id
 * 修改单条销售数据
 */
router.put('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. (权限) 检查是否有权管理
    const { canManage, error, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    // 2. (验证) 验证输入数据
    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    const { recordDate, storeId, productId, salesVolume, revenue, notes } = validation.data;

    // 3. (执行) 更新数据
    const updatedSalesData = await prisma.salesData.update({
      where: { id: id },
      data: {
        recordDate: new Date(recordDate), // ⬅️ new Date() 可以正确处理 'YYYY-MM-DD'
        storeId: storeId,
        productId: productId,
        salesVolume: salesVolume,
        revenue: revenue,
        notes: notes || null,
      },
      // (返回完整数据，以便前端更新)
      include: {
        store: { include: { country: true } }, 
        product: { select: { sku: true, name: true } },
        enteredBy: { select: { nickname: true } }
      }
    });
    
    // 4. (返回) 返回带 canManage 标记的新数据
    res.json({
      ...updatedSalesData,
      canManage: true // (如果能执行到这里，canManage 必定为 true)
    });

  } catch (error) {
    console.error('更新销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '更新失败：所选的店铺或商品无效' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/sales-data/:id
 * 删除单条销售数据
 */
router.delete('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. (权限) 检查是否有权管理
    const { canManage, error, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    // 2. (执行) 删除数据
    await prisma.salesData.delete({
      where: { id: id },
    });

    res.status(204).send(); // 204 No Content (成功删除)

  } catch (error) {
    console.error('删除销售数据失败:', error);
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// ------------------------------------------
// --- ⬇️ 【修复】为非 Admin 用户新增的路由 ---
// ------------------------------------------

/**
 * 【新增】 GET /api/countries
 * (供“运营中心”使用，替代 /api/admin/countries)
 */
router.get('/countries', authMiddleware, async (req, res) => {
  try {
    const countries = await prisma.managedCountry.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(countries);
  } catch (error) {
    console.error('获取国家列表失败:', error);
    res.status(500).json({ error: '获取国家列表失败' });
  }
});

/**
 * 【新增】 GET /api/products-list
 * (供“在售商品”页面使用，替代 /api/admin/products-list)
 */
router.get('/products-list', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { sku: 'asc' },
      include: {
        listings: { 
          include: {
            store: { 
              include: {
                country: true 
              }
            }
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error("获取在售商品列表失败:", error);
    res.status(500).json({ error: '获取在售商品列表失败' });
  }
});

/**
 * 【新增】 Zod 验证 (用于价格同步)
 */
const priceSyncSchema = z.object({
  currentPrice: z.coerce.number().min(0, "价格不能为负数")
});

/**
 * 【新增】 PUT /api/listings/:id
 * (供“在售商品”页面 - 价格同步 使用，替代 /api/admin/listings/:id)
 */
router.put('/listings/:id', authMiddleware, async (req, res) => {
  try {
    const { id: listingId } = req.params;
    // 从 authMiddleware 获取 req.user
    const { role, supervisedCountries } = req.user; 

    // 1. 验证输入
    const validation = priceSyncSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { currentPrice } = validation.data;

    // 2. (权限) 检查权限
    const listing = await prisma.storeProductListing.findUnique({
      where: { id: listingId },
      include: { store: { select: { countryCode: true } } }
    });

    if (!listing) {
      return res.status(404).json({ error: '未找到该商品的上架信息' });
    }
    
    const isAdmin = role === 'admin';
    // (安全) 确保 supervisedCountries 是一个数组
    const isSupervisor = Array.isArray(supervisedCountries) && supervisedCountries.includes(listing.store.countryCode);
    
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ error: '权限不足：您不是该国家的主管' });
    }
    
    // 3. (执行) 更新价格
    const updatedListing = await prisma.storeProductListing.update({
      where: { id: listingId },
      data: {
        currentPrice: currentPrice,
      },
      include: {
        store: { include: { country: true } }
      }
    });
    
    res.json(updatedListing);

  } catch (error)
 {
    console.error('价格同步失败:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '未找到该上架信息' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});


module.exports = router;