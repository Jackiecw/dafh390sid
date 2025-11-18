// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod'); 
const axios = require('axios'); 

const router = express.Router();


const { 
  getRates, 
  countryCurrencyMap, 
  currencySymbols,
  getStartOfToday,
  getStartOfWeek,
  getStartOfMonth,
  getPlanPreviewForWeek
} = require('./datahelpers');

// --- Zod 验证模式 (用于 sales-data) ---
const salesDataSchema = z.object({
  recordDate: z.string().date("日期格式无效"),
  storeId: z.string().min(1),
  productId: z.string().min(1),
  // ⬇️ 【新增】 Listing ID (可选，兼容旧数据)
  listingId: z.string().optional().nullable(),
  salesVolume: z.number().int().min(0),
  revenue: z.number().min(0),
  notes: z.string().optional().nullable(),
});

// --- 其他 Zod 验证 ---
const calendarEventSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  startAt: z.string().datetime("开始时间无效"),
  endAt: z.string().datetime("结束时间无效"),
  isAllDay: z.boolean().default(false),
  color: z.string().default('blue'),
});
const calendarEventUpdateSchema = z.object({
  title: z.string().min(1, "标题不能为空").optional(),
  startAt: z.string().datetime("开始时间无效").optional(),
  endAt: z.string().datetime("结束时间无效").optional(),
  isAllDay: z.boolean().optional(),
  color: z.string().optional(),
});
const weeklyFocusUpdateSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
});

// --- 下拉菜单辅助接口 ---

/**
 * GET /api/stores-list (获取所有店铺列表，用于下拉菜单)
 */
router.get('/stores-list', authMiddleware, async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      include: {
        country: {
          select: { code: true, name: true }
        }
      }
    });
    res.json(stores);
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/stores/:id/listings
 * (新增) 获取指定店铺的所有“在售链接”清单
 * 用于销售录入时的下拉菜单
 */
router.get('/stores/:id/listings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const listings = await prisma.storeProductListing.findMany({
      where: { storeId: id },
      include: {
        product: {
          select: { id: true, sku: true, name: true }
        }
      },
      // 按商品代码排序，方便查找
      orderBy: { productCode: 'asc' } 
    });
    res.json(listings);
  } catch (error) {
    console.error('获取店铺链接失败:', error);
    res.status(500).json({ error: '获取店铺链接失败' });
  }
});


// ------------------------------------------
// --- 仪表盘 API (Dashboard) ---
// ------------------------------------------

const todoSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  isCompleted: z.boolean().optional(),
});

const recurringTaskSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

/**
 * GET /api/dashboard/summary
 */
router.get('/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const { userId, role, operatedCountries } = req.user;
    const { countryCode, storeId } = req.query; 

    let baseWhere = {};
    if (role !== 'admin') {
      baseWhere['store'] = { countryCode: { in: operatedCountries } };
    }
    if (countryCode && countryCode !== 'ALL') {
      baseWhere['store'] = { ...baseWhere['store'], countryCode: countryCode };
    }
    if (storeId && storeId !== 'ALL') {
      baseWhere['storeId'] = storeId;
    }

    const todayStart = getStartOfToday();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [todayData, weekData, monthData] = await prisma.$transaction([
      prisma.salesData.aggregate({
        _sum: { revenue: true },
        where: { ...baseWhere, recordDate: { gte: todayStart, lt: tomorrowStart } },
      }),
      prisma.salesData.aggregate({
        _sum: { revenue: true },
        where: { ...baseWhere, recordDate: { gte: weekStart } },
      }),
      prisma.salesData.aggregate({
        _sum: { revenue: true },
        where: { ...baseWhere, recordDate: { gte: monthStart } },
      }),
    ]);

    const currentWeekStart = getStartOfWeek();
    const [personalPlan, teamFocusRecord] = await Promise.all([
      getPlanPreviewForWeek(userId, currentWeekStart),
      prisma.weeklyFocus.findUnique({
        where: { weekStartDate: currentWeekStart },
      }),
    ]);

    const planNextWeek = personalPlan || '暂无计划内容，请在周报中填写“下周计划”。';
    const teamFocusContent = teamFocusRecord?.content || '';
    
    let currency = 'CNY'; 
    let rateToCny = 1;
    const targetCountry = (countryCode && countryCode !== 'ALL') ? countryCode : (operatedCountries[0] || null);
    if (targetCountry && countryCurrencyMap[targetCountry]) {
      const targetCurrencyCode = countryCurrencyMap[targetCountry];
      currency = currencySymbols[targetCurrencyCode] || targetCurrencyCode;
      
      const currentRates = await getRates(); 
      const cnyRate = currentRates[`CNY_${targetCurrencyCode}`]; 
      if (cnyRate) {
        rateToCny = 1 / cnyRate; 
      }
    } else if (countryCode === 'ALL') {
      currency = 'CNY'; 
      rateToCny = 1;
    }
    
    const gmv = {
      today: todayData._sum.revenue || 0,
      thisWeek: weekData._sum.revenue || 0,
      thisMonth: monthData._sum.revenue || 0,
    };

    res.json({
      gmv: {
        ...gmv,
        currency: currency,
        cnyEquivalent: {
          today: gmv.today * rateToCny,
          thisWeek: gmv.thisWeek * rateToCny,
          thisMonth: gmv.thisMonth * rateToCny,
        }
      },
      schedule: {
        planNextWeek: planNextWeek,
        teamFocus: teamFocusContent,
      }
    });

  } catch (error) {
    console.error('获取 GMV 摘要失败:', error);
    res.status(500).json({ error: '获取 GMV 摘要失败' });
  }
});

/**
 * GET /api/dashboard/filter-options
 */
router.get('/dashboard/filter-options', authMiddleware, async (req, res) => {
  try {
    const { role, operatedCountries } = req.user;
    
    let countries = [];
    let stores = [];

    if (role === 'admin') {
      const [allCountries, allStores] = await prisma.$transaction([
        prisma.managedCountry.findMany({ orderBy: { code: 'asc' } }),
        prisma.store.findMany({ select: { id: true, name: true, countryCode: true }, orderBy: { name: 'asc' } })
      ]);
      countries = allCountries;
      stores = allStores;
    } else {
      const userCountries = await prisma.managedCountry.findMany({
        where: { code: { in: operatedCountries } },
        orderBy: { code: 'asc' }
      });
      const userStores = await prisma.store.findMany({
        where: { countryCode: { in: operatedCountries } },
        select: { id: true, name: true, countryCode: true },
        orderBy: { name: 'asc' }
      });
      countries = userCountries;
      stores = userStores;
    }
    
    res.json({ countries, stores });
  } catch (error) {
    console.error('获取筛选器选项失败:', error);
    res.status(500).json({ error: '获取筛选器选项失败' });
  }
});


// --- 待办事项 (Todo) API ---
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const todos = await prisma.todo.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(todos);
  } catch (error) {
    console.error('获取待办事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/todos', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const validation = todoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const newTodo = await prisma.todo.create({
      data: {
        content: validation.data.content,
        authorId: userId,
      }
    });
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('创建待办事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const validation = todoSchema.safeParse(req.body); 
    
    if (!validation.success || typeof validation.data.isCompleted !== 'boolean') {
      return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTodo = await prisma.todo.update({
      where: { 
        id: id,
        authorId: userId 
      },
      data: {
        isCompleted: validation.data.isCompleted,
      }
    });
    res.json(updatedTodo);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '待办事项未找到' });
    }
    console.error('更新待办事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await prisma.todo.delete({
      where: { 
        id: id,
        authorId: userId 
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '待办事项未找到' });
    }
    console.error('删除待办事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// --- 周期任务 (Recurring Task) API ---
router.get('/recurring-tasks', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const todayStart = getStartOfToday();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'DAILY',
        lastCompletedAt: { lt: todayStart }
      },
      data: { lastCompletedAt: null }
    });
    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'WEEKLY',
        lastCompletedAt: { lt: weekStart }
      },
      data: { lastCompletedAt: null }
    });
    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'MONTHLY',
        lastCompletedAt: { lt: monthStart }
      },
      data: { lastCompletedAt: null }
    });

    const tasks = await prisma.recurringTask.findMany({
      where: { authorId: userId },
      orderBy: { period: 'asc' } 
    });
    res.json(tasks);
  } catch (error) {
    console.error('获取周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/recurring-tasks', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const validation = recurringTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const newTask = await prisma.recurringTask.create({
      data: {
        ...validation.data,
        authorId: userId,
      }
    });
    res.status(201).json(newTask);
  } catch (error) {
    console.error('创建周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/recurring-tasks/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { isCompleted } = req.body; 

    if (typeof isCompleted !== 'boolean') {
       return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTask = await prisma.recurringTask.update({
      where: { 
        id: id,
        authorId: userId 
      },
      data: {
        lastCompletedAt: isCompleted ? new Date() : null,
      }
    });
    res.json(updatedTask);
  } catch (error) {
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '周期任务未找到' });
    }
    console.error('更新周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/recurring-tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await prisma.recurringTask.delete({
      where: { 
        id: id,
        authorId: userId 
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '周期任务未找到' });
    }
    console.error('删除周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ------------------------------------------
// --- 其他 API ---
// ------------------------------------------

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

router.delete('/reports/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.weeklyReport.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '周报未找到' });
    }
    console.error('删除周报失败', error);
    res.status(500).json({ error: '删除周报失败' });
  }
});

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

// POST /api/sales (录入销售数据 - 更新)
router.post('/sales', authMiddleware, async (req, res) => {
  try {
    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    // ⬇️ 【修改】支持 listingId
    const { recordDate, storeId, productId, listingId, salesVolume, revenue, notes } = validation.data;
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
      data: {
        recordDate: new Date(recordDate), 
        salesVolume: salesVolume,
        revenue: revenue,
        notes: notes || null,
        enteredById: userId, 
        storeId: storeId,
        productId: productId, 
        // ⬇️ 【新增】
        listingId: listingId || null, 
      }
    });
    res.status(201).json(newSalesData);
  } catch (error) {
    console.error('提交销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '提交失败：所选的店铺、商品或链接无效' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

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

// GET /api/stores/:id/products (获取店铺商品)
router.get('/stores/:id/products', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
      include: {
        listings: {
          include: {
            product: {
              select: { id: true, sku: true, name: true }
            }
          },
          orderBy: { product: { sku: 'asc' } }
        }
      }
    });
    if (!store) return res.status(404).json({ error: '店铺未找到' });
    
    // 将 listings 转换回 products 数组，保持 API 兼容性
    const products = store.listings.map(l => l.product);
    res.json(products);
    
  } catch (error) {
    res.status(500).json({ error: '获取店铺商品失败' });
  }
});


// GET /api/sales-data (销售数据管理 - 更新)
router.get('/sales-data', authMiddleware, async (req, res) => {
  try {
    const { role, operatedCountries, supervisedCountries } = req.user;
    
    const { 
      countryCode, platform, storeId, 
      startDate, endDate, 
      sortBy, sortOrder
    } = req.query;

    const where = {};
    if (role !== 'admin') {
      where.store = { 
        countryCode: { in: operatedCountries }
      };
    }

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
        lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    } else if (startDate) {
      where.recordDate = { gte: new Date(startDate) };
    }

    const orderBy = {};
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
      const allowedSortBy = ['recordDate', 'salesVolume', 'revenue', 'createdAt'];
      if (allowedSortBy.includes(sortBy)) {
         orderBy[sortBy] = sortOrder;
      } else {
         orderBy.recordDate = 'desc';
      }
    } else {
      orderBy.recordDate = 'desc'; 
    }

    const salesData = await prisma.salesData.findMany({
      where: where,
      orderBy: orderBy,
      include: {
        store: { 
          include: { country: true } 
        }, 
        product: { 
          select: { sku: true, name: true }
        },
        // ⬇️ 【新增】包含 listing 信息，以便显示商品代码
        listing: {
           select: { productCode: true, storeTitle: true }
        },
        enteredBy: { 
          select: { nickname: true }
        }
      }
    });

    const supervisedCodes = supervisedCountries || [];
    const isAdmin = role === 'admin';
    
    const response = salesData.map(row => ({
      ...row,
      canManage: isAdmin || supervisedCodes.includes(row.store.countryCode)
    }));

    res.json(response);
  } catch (error) {
    console.error('获取销售数据列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 辅助权限检查函数
async function checkManagementPermission(userId, salesDataId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } }, supervisedCountries: { select: { code: true } } }
  });

  if (user.role.name === 'admin') {
    return { canManage: true };
  }

  const data = await prisma.salesData.findUnique({
    where: { id: salesDataId },
    include: { store: { select: { countryCode: true } } }
  });

  if (!data) {
    return { canManage: false, error: '数据未找到', status: 404 };
  }

  const supervisedCodes = user.supervisedCountries.map(c => c.code);
  if (supervisedCodes.includes(data.store.countryCode)) {
    return { canManage: true };
  }
  
  return { canManage: false, error: '权限不足：您不是该国家的主管', status: 403 };
}

// PUT /api/sales-data/:id (更新)
router.put('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    // ⬇️ 【修改】支持 listingId
    const { recordDate, storeId, productId, listingId, salesVolume, revenue, notes } = validation.data;
    const updatedSalesData = await prisma.salesData.update({
      where: { id: id },
      data: {
        recordDate: new Date(recordDate),
        storeId: storeId,
        productId: productId,
        // ⬇️ 【新增】更新 listingId
        listingId: listingId || null,
        salesVolume: salesVolume,
        revenue: revenue,
        notes: notes || null,
      },
      include: {
        store: { include: { country: true } }, 
        product: { select: { sku: true, name: true } },
        // ⬇️ 【新增】返回 listing 信息
        listing: { select: { productCode: true, storeTitle: true } },
        enteredBy: { select: { nickname: true } }
      }
    });
    
    res.json({
      ...updatedSalesData,
      canManage: true
    });

  } catch (error) {
    console.error('更新销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '更新失败：所选的店铺、商品或链接无效' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    await prisma.salesData.delete({
      where: { id: id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('删除销售数据失败:', error);
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});


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
    console.error("获取在售商品列表(products-list)失败:", error);
    res.status(500).json({ error: '获取在售商品列表失败' });
  }
});

const priceSyncSchema = z.object({
  currentPrice: z.coerce.number().min(0, "价格不能为负数")
});

router.put('/listings/:id', authMiddleware, async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { role, supervisedCountries } = req.user; 

    const validation = priceSyncSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { currentPrice } = validation.data;
    const listing = await prisma.storeProductListing.findUnique({
      where: { id: listingId },
      include: { store: { select: { countryCode: true } } }
    });

    if (!listing) {
      return res.status(404).json({ error: '未找到该商品的上架信息' });
    }
    
    const isAdmin = role === 'admin';
    const isSupervisor = Array.isArray(supervisedCountries) && supervisedCountries.includes(listing.store.countryCode);
    
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ error: '权限不足：您不是该国家的主管' });
    }
    
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

router.get('/links', authMiddleware, async (req, res) => {
  try {
    const links = await prisma.commonLink.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(links);
  } catch (error) {
    console.error('获取常用链接失败:', error);
    res.status(500).json({ error: '获取链接列表失败' });
  }
});


// --- 工作日历 API (员工) ---

router.get('/calendar/events', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: '必须提供 start 和 end 查询参数' });
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        authorId: userId, // (关键) 只获取我自己的
        startAt: { lte: new Date(end) },
        endAt: { gte: new Date(start) }
      },
      orderBy: {
        startAt: 'asc'
      },
      include: {
        author: { select: { nickname: true } } // (为 FullCalendar 扩展属性)
      }
    });
    res.json(events);
  } catch (error) {
    console.error('获取日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/calendar/events', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const validation = calendarEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const newEvent = await prisma.calendarEvent.create({
      data: {
        ...validation.data,
        authorId: userId,
        createdByAdmin: false // (关键) 明确这是用户自己创建的
      }
    });
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('创建日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/calendar/events/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const validation = calendarEventUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    // (安全) 检查用户是否有权修改
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        authorId: userId,
      }
    });

    if (!event) {
      return res.status(404).json({ error: '事件未找到' });
    }

    if (event.createdByAdmin) {
      return res.status(403).json({ error: '权限不足：无法修改由管理员指派的日程' });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: id },
      data: validation.data
    });
    res.json(updatedEvent);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '事件未找到，或您无权修改此事件' });
    }
    console.error('更新日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/calendar/events/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    // (安全) 检查用户是否有权删除
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        authorId: userId,
      }
    });
    
    if (!event) {
      return res.status(404).json({ error: '事件未找到' });
    }

    if (event.createdByAdmin) {
      return res.status(403).json({ error: '权限不足：无法删除由管理员指派的日程' });
    }

    await prisma.calendarEvent.delete({
      where: { id: id }
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '事件未找到，或您无权删除此事件' });
    }
    console.error('删除日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// --- 每周重点 API (员工) ---

router.get('/calendar/weekly-focus', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { weekStartDate } = req.query;

    if (!weekStartDate) {
      return res.status(400).json({ error: '必须提供 weekStartDate 查询参数' });
    }

    const weekStart = new Date(weekStartDate);
    if (Number.isNaN(weekStart.getTime())) {
      return res.status(400).json({ error: 'weekStartDate 无效' });
    }

    const userPlan = await getPlanPreviewForWeek(userId, weekStart);

    let focus = await prisma.weeklyFocus.findUnique({
      where: { weekStartDate: weekStart },
    });

    if (!focus && role === 'admin') {
      focus = await prisma.weeklyFocus.create({
        data: {
          weekStartDate: weekStart,
          content: '',
          authorId: userId,
        },
      });
    }

    return res.json({
      focus,
      userPlan: userPlan || null,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const weekStart = new Date(req.query.weekStartDate);
      const [focus, userPlan] = await Promise.all([
        prisma.weeklyFocus.findUnique({ where: { weekStartDate: weekStart } }),
        getPlanPreviewForWeek(req.user.userId, weekStart),
      ]);
      return res.json({ focus, userPlan: userPlan || null });
    }
    console.error('获取每周重点失败', error);
    res.status(500).json({ error: '' });
  }
});

router.put('/calendar/weekly-focus/:id', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可以更新本周聚焦' });
    }
    const { id } = req.params;

    const validation = weeklyFocusUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const focus = await prisma.weeklyFocus.findUnique({ where: { id } });
    if (!focus) {
      return res.status(404).json({ error: '未找到该重点任务' });
    }

    const updatedFocus = await prisma.weeklyFocus.update({
      where: { id },
      data: {
        content: validation.data.content,
        authorId: userId,
      },
    });
    
    res.json(updatedFocus);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '未找到该重点任务' });
    }
    console.error('更新每周重点失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


router.get('/rates', authMiddleware, async (req, res) => {
  try {
    const rates = await getRates(); // (复用 datahelpers.js 中的函数)
    res.json(rates);
  } catch (error) {
    console.error('获取公开汇率失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/sales-data
router.get('/sales-data', authMiddleware, async (req, res) => {
  try {
    const { role, operatedCountries, supervisedCountries } = req.user;
    const { 
      countryCode, platform, storeId, startDate, endDate, 
      sortBy, sortOrder,
      // 分页参数
      page = 1, pageSize = 20 
    } = req.query;

    // (构建 where 条件，保持不变)
    const where = {};
    if (role !== 'admin') {
      where.store = { countryCode: { in: operatedCountries } };
    }
    if (countryCode) where.store = { ...where.store, countryCode: countryCode };
    if (platform) where.store = { ...where.store, platform: platform };
    if (storeId) where.storeId = storeId;
    if (startDate && endDate) {
      where.recordDate = { 
        gte: new Date(startDate), 
        lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    } else if (startDate) {
      where.recordDate = { gte: new Date(startDate) };
    }

    // (构建 orderBy，保持不变)
    const orderBy = {};
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
      const allowedSortBy = ['recordDate', 'salesVolume', 'revenue', 'createdAt'];
      if (allowedSortBy.includes(sortBy)) orderBy[sortBy] = sortOrder;
      else orderBy.recordDate = 'desc';
    } else {
      orderBy.recordDate = 'desc'; 
    }

    // 计算分页
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    const skip = (p - 1) * ps;

    // 使用事务查询总数和数据
    const [total, salesData] = await prisma.$transaction([
      prisma.salesData.count({ where }),
      prisma.salesData.findMany({
        where: where,
        orderBy: orderBy,
        skip: skip,
        take: ps,
        include: {
          store: { include: { country: true } }, 
          product: { select: { sku: true, name: true } },
          listing: { select: { productCode: true, storeTitle: true } },
          enteredBy: { select: { nickname: true } }
        }
      })
    ]);

    const supervisedCodes = supervisedCountries || [];
    const isAdmin = role === 'admin';
    
    const formattedData = salesData.map(row => ({
      ...row,
      canManage: isAdmin || supervisedCodes.includes(row.store.countryCode)
    }));

    // ⬇️ 返回分页结构
    res.json({
      data: formattedData,
      total,
      page: p,
      pageSize: ps
    });

  } catch (error) {
    console.error('获取销售数据列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;