// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod'); 
const axios = require('axios'); 

const router = express.Router();

// --- Zod 验证模式 (用于 sales-data) ---
const salesDataSchema = z.object({
  recordDate: z.string().date("日期格式无效"), // ⬅️ 【已修复】
  storeId: z.string().min(1),
  productId: z.string().min(1),
  salesVolume: z.number().int().min(0),
  revenue: z.number().min(0),
  notes: z.string().optional().nullable(),
});

// ⬇️ --- 【新增：Zod 验证 (保持不变)】 ---
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
// ⬆️ --- 【新增：Zod 验证 (保持不变)】 ---


// ⬇️ --- 【新增路由】 ---
/**
 * GET /api/stores-list (获取所有店铺列表，用于下拉菜单)
 * 这是一个新的、受 authMiddleware 保护（非 Admin）的路由
 * 供销售、财务等表单填充下拉框使用
 */
router.get('/stores-list', authMiddleware, async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      include: {
        // (我们只需要国家信息用于级联)
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
// ⬆️ --- 【新增路由】 ---


// ------------------------------------------
// --- ⬇️ (不变) 仪表盘 API (Dashboard) ---
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

// ... (
// ... (该文件 [data.js] 的其余所有代码保持不变) ...
// ...
// --- 汇率缓存 (不变) ---
let ratesCache = {
  data: null,
  lastFetched: 0,
};
const CACHE_DURATION = 1000 * 60 * 60; // 1 小时
const currencySymbols = {
  CNY: '¥', USD: '$', IDR: 'Rp', VND: '₫', THB: '฿', MYR: 'RM', PHP: '₱', SGD: 'S$'
};
const countryCurrencyMap = {
  ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD',
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

async function getPlanPreviewForWeek(userId, currentWeekStart) {
  const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastReport = await prisma.weeklyReport.findFirst({
    where: {
      authorId: userId,
      weekStartDate: {
        gte: previousWeekStart,
        lt: currentWeekStart,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { planNextWeek: true },
  });
  return lastReport?.planNextWeek || null;
}
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
 * 【GET /api/dashboard/summary】 (修改)
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

    // ⬇️ --- 【修改】 ---
    // (逻辑修改：获取或创建本周的 WeeklyFocus)
    const currentWeekStart = getStartOfWeek();
    const [personalPlan, teamFocusRecord] = await Promise.all([
      getPlanPreviewForWeek(userId, currentWeekStart),
      prisma.weeklyFocus.findUnique({
        where: { weekStartDate: currentWeekStart },
      }),
    ]);

    const planNextWeek = personalPlan || '暂无计划内容，请在周报中填写“下周计划”';
    const teamFocusContent = teamFocusRecord?.content || '';
    // ⬆️ --- 【修改】 ---
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


// --- (不变) 待办事项 (Todo) API ---
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


// --- (不变) 周期任务 (Recurring Task) API ---
// GET /api/recurring-tasks
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

// PUT /api/recurring-tasks/:id/toggle
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

// DELETE /api/recurring-tasks/:id
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

// (此处省略不变的 /reports, /me, /sales, /reports (POST), /stores/:id/products, 
//    /sales-data, /sales-data/:id, /sales-data/:id (DELETE), 
//    /countries, /products-list, /listings/:id, /links ...)

// GET /api/reports (不变)
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

// GET /api/me (不变)
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

// POST /api/sales (不变)
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

// POST /api/reports (不变)
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

// GET /api/stores/:id/products (不变)
router.get('/stores/:id/products', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // 修正：我们现在用 listings
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

// (辅助函数，不变)
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


// ⬇️ --- 【新增】 工作日历 API (员工) ---
// ------------------------------------------

// GET /api/calendar/events?start=...&end=... (获取“我的”日历)
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

// POST /api/calendar/events (员工创建自己的)
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

// PUT /api/calendar/events/:id (员工修改自己的)
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

// DELETE /api/calendar/events/:id (员工删除自己的)
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

// ⬇️ --- 【新增】 每周重点 API (员工) ---
// ------------------------------------------

// GET /api/calendar/weekly-focus?weekStartDate=... (获取或创建每周重点)
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

// PUT /api/calendar/weekly-focus/:id (更新每周重点)
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

// ⬆️ --- 【新增】 ---

module.exports = router;
