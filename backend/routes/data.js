// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod'); 
const axios = require('axios'); 

const router = express.Router();


// ------------------------------------------
// --- ⬇️ 仪表盘 API (Dashboard) - 真实实现 ---
// ------------------------------------------

// (Zod 验证)
const todoSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  isCompleted: z.boolean().optional(),
});

const recurringTaskSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

// --- 汇率缓存 (不变) ---
let ratesCache = {
  data: null,
  lastFetched: 0,
};
const CACHE_DURATION = 1000 * 60 * 60; // 1 小时

// (货币符号映射 - 不变)
const currencySymbols = {
  CNY: '¥',
  USD: '$',
  IDR: 'Rp',
  VND: '₫',
  THB: '฿',
  MYR: 'RM',
  PHP: '₱',
  SGD: 'S$'
};

// (国家货币映射 - 不变)
const countryCurrencyMap = {
  ID: 'IDR',
  VN: 'VND',
  TH: 'THB',
  MY: 'MYR',
  PH: 'PHP',
  SG: 'SGD',
};

// --- 日期辅助函数 (东八区 - 不变) ---
const getTimeZoneDate = () => {
  return new Date();
};
const getStartOfToday = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const getStartOfWeek = () => {
  const now = getStartOfToday();
  const day = now.getDay(); 
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  return new Date(now.setDate(diff));
};
const getStartOfMonth = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};
// ---

/**
 * 【辅助函数】获取并缓存汇率 (不变)
 */
async function getRates() {
  const now = Date.now();
  if (ratesCache.data && (now - ratesCache.lastFetched < CACHE_DURATION)) {
    return ratesCache.data;
  }
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new Error('未配置汇率 API 密钥');
    }
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`);
    
    if (response.data && response.data.result === 'success') {
      const rates = response.data.conversion_rates;
      ratesCache.data = {
        CNY_USD: rates.USD,
        CNY_IDR: rates.IDR,
        CNY_VND: rates.VND,
        CNY_THB: rates.THB,
        CNY_MYR: rates.MYR,
        CNY_PHP: rates.PHP,
        CNY_SGD: rates.SGD,
      };
      ratesCache.lastFetched = now;
      console.log('汇率缓存已更新');
      return ratesCache.data;
    } else {
      throw new Error('汇率 API 响应失败');
    }
  } catch (error) {
    console.error('获取汇率失败:', error.message);
    return {}; 
  }
}

/**
 * 【GET /api/rates】 (不变)
 */
router.get('/rates', authMiddleware, async (req, res) => {
  try {
    const rates = await getRates(); 
    res.json(rates);
  } catch (error) {
     res.status(500).json({ error: '获取汇率失败' });
  }
});


/**
 * 【GET /api/dashboard/summary】 (不变)
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

    const latestReport = await prisma.weeklyReport.findFirst({
      where: { authorId: userId },
      orderBy: { weekStartDate: 'desc' },
      select: { planNextWeek: true }
    });
    
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
        planNextWeek: latestReport?.planNextWeek || '您尚未填写上周周报的“下周计划”。'
      }
    });

  } catch (error) {
    console.error('获取 GMV 摘要失败:', error);
    res.status(500).json({ error: '获取 GMV 摘要失败' });
  }
});

/**
 * 【GET /api/dashboard/filter-options】 (不变)
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


// --- ⬇️ 【修改】 待办事项 (Todo) API (实现) ---

// GET /api/todos
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

// POST /api/todos
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

// PUT /api/todos/:id (用于切换状态)
router.put('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const validation = todoSchema.safeParse(req.body); // (期望 { isCompleted: true/false })
    
    if (!validation.success || typeof validation.data.isCompleted !== 'boolean') {
      return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTodo = await prisma.todo.update({
      where: { 
        id: id,
        authorId: userId // (安全) 确保用户只能修改自己的
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

// DELETE /api/todos/:id
router.delete('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await prisma.todo.delete({
      where: { 
        id: id,
        authorId: userId // (安全) 确保用户只能删除自己的
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


// --- ⬇️ 【修改】 周期任务 (Recurring Task) API (实现) ---

// GET /api/recurring-tasks
router.get('/recurring-tasks', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    // (逻辑：自动重置)
    // 1. 找出需要重置的任务
    const todayStart = getStartOfToday();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // (重置 DAILY 任务)
    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'DAILY',
        lastCompletedAt: { lt: todayStart }
      },
      data: { lastCompletedAt: null }
    });
    // (重置 WEEKLY 任务)
    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'WEEKLY',
        lastCompletedAt: { lt: weekStart }
      },
      data: { lastCompletedAt: null }
    });
    // (重置 MONTHLY 任务)
    await prisma.recurringTask.updateMany({
      where: {
        authorId: userId,
        period: 'MONTHLY',
        lastCompletedAt: { lt: monthStart }
      },
      data: { lastCompletedAt: null }
    });

    // 2. 返回所有任务 (包括刚重置的)
    const tasks = await prisma.recurringTask.findMany({
      where: { authorId: userId },
      orderBy: { period: 'asc' } // (让 DAILY, WEEKLY, MONTHLY 排序)
    });
    res.json(tasks);
  } catch (error) {
    console.error('获取周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/recurring-tasks
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

// PUT /api/recurring-tasks/:id/toggle (用于勾选/取消勾选)
router.put('/recurring-tasks/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { isCompleted } = req.body; // (期望 { isCompleted: true/false })

    if (typeof isCompleted !== 'boolean') {
       return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTask = await prisma.recurringTask.update({
      where: { 
        id: id,
        authorId: userId 
      },
      data: {
        // 如果勾选为 "完成"，则记录时间；如果 "取消完成"，则设为 null
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

// DELETE /api/recurring-tasks/:id (新增，用于删除)
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
// --- ⬇️ (不变) 现有 API ---
// ------------------------------------------

// (... 此处省略不变的 /reports, /me, /sales, /reports (POST), /stores/:id/products, 
//    /sales-data, /sales-data/:id, /sales-data/:id (DELETE), 
//    /countries, /products-list, /listings/:id, /links ...)
// (保持您上一版本中这些函数的实现不变)

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

// (不变) POST /api/sales
router.post('/sales', authMiddleware, async (req, res) => {
  try {
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
        recordDate: new Date(recordDate), 
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


// (不变) 销售数据管理 API...
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
    
    const { recordDate, storeId, productId, salesVolume, revenue, notes } = validation.data;

    const updatedSalesData = await prisma.salesData.update({
      where: { id: id },
      data: {
        recordDate: new Date(recordDate),
        storeId: storeId,
        productId: productId,
        salesVolume: salesVolume,
        revenue: revenue,
        notes: notes || null,
      },
      include: {
        store: { include: { country: true } }, 
        product: { select: { sku: true, name: true } },
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
      return res.status(400).json({ error: '更新失败：所选的店铺或商品无效' });
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


// (不变) 非 Admin 路由...
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
    console.error("获取在售商品列表失败:", error);
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

// (不变) 常用链接 (公共读取)
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


module.exports = router;