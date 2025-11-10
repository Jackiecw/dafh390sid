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
// ... (不变)
  content: z.string().min(1, "内容不能为空"),
  isCompleted: z.boolean().optional(),
});

const recurringTaskSchema = z.object({
// ... (不变)
  content: z.string().min(1, "内容不能为空"),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

// ... (
// ... (该文件 [data.js] 的其余所有代码保持不变) ...
// ...
// --- 汇率缓存 (不变) ---
let ratesCache = {
// ... (不变)
  data: null,
  lastFetched: 0,
};
const CACHE_DURATION = 1000 * 60 * 60; // 1 小时
// ... (不变)
const currencySymbols = {
  CNY: '¥', USD: '$', IDR: 'Rp', VND: '₫', THB: '฿', MYR: 'RM', PHP: '₱', SGD: 'S$'
};
const countryCurrencyMap = {
// ... (不变)
  ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD',
};

// --- 日期辅助函数 (东八区 - 不变) ---
// ... (不变)
const getTimeZoneDate = () => {
  return new Date();
};
// ... (不变)
const getStartOfToday = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
// ... (不变)
const getStartOfWeek = () => {
  const now = getStartOfToday();
  const day = now.getDay(); 
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  return new Date(now.setDate(diff));
};
// ... (不变)
const getStartOfMonth = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};
// ---

/**
 * 【辅助函数】获取并缓存汇率 (不变)
 */
async function getRates() {
// ... (不变)
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
// ... (不变)
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
// ... (不变)
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
// ... (不变)
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
// ... (不变)
    let planNextWeek = '加载中...';
    try {
      const currentWeekStart = getStartOfWeek(); // (使用辅助函数)
      
      let focus = await prisma.weeklyFocus.findFirst({
// ... (不变)
        where: { 
          weekStartDate: currentWeekStart, // 查找本周一的
          authorId: userId 
        },
      });

      if (focus) {
// ... (不变)
        planNextWeek = focus.content;
      } else {
        // (如果本周的 Focus 还没有，就从上周的 Report 里找)
// ... (不变)
        const prevWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const lastReport = await prisma.weeklyReport.findFirst({
// ... (不变)
          where: {
            authorId: userId,
            weekStartDate: {
              gte: prevWeekStart,
              lt: currentWeekStart
            }
          },
          orderBy: { createdAt: 'desc' },
          select: { planNextWeek: true }
        });

        const content = lastReport?.planNextWeek || '（暂无计划，请填写）';
        
        // (创建新的 Focus)
// ... (不变)
        const newFocus = await prisma.weeklyFocus.create({
          data: {
            weekStartDate: currentWeekStart,
            content: content,
            authorId: userId
          }
        });
        planNextWeek = newFocus.content;
      }
    } catch (e) {
// ... (不变)
      console.error("获取/创建每周重点失败:", e);
      planNextWeek = '获取计划失败';
    }
    // ⬆️ --- 【修改】 ---
    
// ... (不变)
    let currency = 'CNY'; 
    let rateToCny = 1;
    const targetCountry = (countryCode && countryCode !== 'ALL') ? countryCode : (operatedCountries[0] || null);
// ... (不变)

    if (targetCountry && countryCurrencyMap[targetCountry]) {
      const targetCurrencyCode = countryCurrencyMap[targetCountry];
// ... (不变)
      currency = currencySymbols[targetCurrencyCode] || targetCurrencyCode;
      
      const currentRates = await getRates(); 
// ... (不变)
      
      const cnyRate = currentRates[`CNY_${targetCurrencyCode}`]; 
      if (cnyRate) {
// ... (不变)
        rateToCny = 1 / cnyRate; 
      }
    } else if (countryCode === 'ALL') {
// ... (不变)
      currency = 'CNY'; 
      rateToCny = 1;
    }
    
    const gmv = {
// ... (不变)
      today: todayData._sum.revenue || 0,
      thisWeek: weekData._sum.revenue || 0,
      thisMonth: monthData._sum.revenue || 0,
    };

    res.json({
// ... (不变)
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
// ... (不变)
        planNextWeek: planNextWeek // ⬅️ 使用我们新逻辑的结果
      }
    });

  } catch (error) {
// ... (不变)
    console.error('获取 GMV 摘要失败:', error);
    res.status(500).json({ error: '获取 GMV 摘要失败' });
  }
});

/**
 * 【GET /api/dashboard/filter-options】 (不变)
 */
router.get('/dashboard/filter-options', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { role, operatedCountries } = req.user;
    
    let countries = [];
// ... (不变)
    let stores = [];

    if (role === 'admin') {
// ... (不变)
      const [allCountries, allStores] = await prisma.$transaction([
        prisma.managedCountry.findMany({ orderBy: { code: 'asc' } }),
        prisma.store.findMany({ select: { id: true, name: true, countryCode: true }, orderBy: { name: 'asc' } })
      ]);
      countries = allCountries;
      stores = allStores;
    } else {
// ... (不变)
      const userCountries = await prisma.managedCountry.findMany({
        where: { code: { in: operatedCountries } },
        orderBy: { code: 'asc' }
      });
      const userStores = await prisma.store.findMany({
// ... (不变)
        where: { countryCode: { in: operatedCountries } },
        select: { id: true, name: true, countryCode: true },
        orderBy: { name: 'asc' }
      });
      countries = userCountries;
      stores = userStores;
    }
    
    res.json({ countries, stores });
// ... (不变)

  } catch (error) {
    console.error('获取筛选器选项失败:', error);
// ... (不变)
    res.status(500).json({ error: '获取筛选器选项失败' });
  }
});


// --- (不变) 待办事项 (Todo) API ---
// ... (不变)

// GET /api/todos
router.get('/todos', authMiddleware, async (req, res) => {
// ... (不变)
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
// ... (不变)
  try {
    const { userId } = req.user;
    const validation = todoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const newTodo = await prisma.todo.create({
// ... (不变)
      data: {
        content: validation.data.content,
        authorId: userId,
      }
    });
    res.status(201).json(newTodo);
  } catch (error) {
// ... (不变)
    console.error('创建待办事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/todos/:id (用于切换状态)
router.put('/todos/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const validation = todoSchema.safeParse(req.body); // (期望 { isCompleted: true/false })
    
    if (!validation.success || typeof validation.data.isCompleted !== 'boolean') {
// ... (不变)
      return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTodo = await prisma.todo.update({
// ... (不变)
      where: { 
        id: id,
        authorId: userId // (安全) 确保用户只能修改自己的
      },
      data: {
// ... (不变)
        isCompleted: validation.data.isCompleted,
      }
    });
    res.json(updatedTodo);
  } catch (error) {
// ... (不变)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '待办事项未找到' });
    }
    console.error('更新待办事项失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/todos/:id
router.delete('/todos/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await prisma.todo.delete({
// ... (不变)
      where: { 
        id: id,
        authorId: userId // (安全) 确保用户只能删除自己的
      },
    });
    res.status(204).send();
  } catch (error) {
// ... (不变)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '待办事项未找到' });
    }
    console.error('删除待办事项失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// --- (不变) 周期任务 (Recurring Task) API ---
// ... (不变)

// GET /api/recurring-tasks
router.get('/recurring-tasks', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const todayStart = getStartOfToday();
// ... (不变)
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    await prisma.recurringTask.updateMany({
// ... (不变)
      where: {
        authorId: userId,
        period: 'DAILY',
        lastCompletedAt: { lt: todayStart }
      },
      data: { lastCompletedAt: null }
    });
    await prisma.recurringTask.updateMany({
// ... (不变)
      where: {
        authorId: userId,
        period: 'WEEKLY',
        lastCompletedAt: { lt: weekStart }
      },
      data: { lastCompletedAt: null }
    });
    await prisma.recurringTask.updateMany({
// ... (不变)
      where: {
        authorId: userId,
        period: 'MONTHLY',
        lastCompletedAt: { lt: monthStart }
      },
      data: { lastCompletedAt: null }
    });

    const tasks = await prisma.recurringTask.findMany({
// ... (不变)
      where: { authorId: userId },
      orderBy: { period: 'asc' } 
    });
    res.json(tasks);
  } catch (error) {
// ... (不变)
    console.error('获取周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/recurring-tasks
router.post('/recurring-tasks', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const validation = recurringTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const newTask = await prisma.recurringTask.create({
// ... (不变)
      data: {
        ...validation.data,
        authorId: userId,
      }
    });
    res.status(201).json(newTask);
  } catch (error) {
// ... (不变)
    console.error('创建周期任务失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/recurring-tasks/:id/toggle
router.put('/recurring-tasks/:id/toggle', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { isCompleted } = req.body; 

    if (typeof isCompleted !== 'boolean') {
// ... (不变)
       return res.status(400).json({ error: '输入无效: 必须提供 isCompleted 字段' });
    }

    const updatedTask = await prisma.recurringTask.update({
// ... (不变)
      where: { 
        id: id,
        authorId: userId 
      },
      data: {
// ... (不变)
        lastCompletedAt: isCompleted ? new Date() : null,
      }
    });
    res.json(updatedTask);
  } catch (error) {
// ... (不变)
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '周期任务未找到' });
    }
    console.error('更新周期任务失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/recurring-tasks/:id
router.delete('/recurring-tasks/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await prisma.recurringTask.delete({
// ... (不变)
      where: { 
        id: id,
        authorId: userId 
      },
    });
    res.status(204).send();
  } catch (error) {
// ... (不变)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '周期任务未找到' });
    }
    console.error('删除周期任务失败:', error);
// ... (不变)
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
// ... (不变)
  try {
    const reports = await prisma.weeklyReport.findMany({
      orderBy: { weekStartDate: 'desc' },
      include: { author: { select: { nickname: true } } }
    });
    res.json(reports);
  } catch (error) {
// ... (不变)
    console.error('获取周报列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/me (不变)
router.get('/me', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const userId = req.user.userId;
    const detailedUser = await prisma.user.findUnique({
// ... (不变)
        where: { id: userId },
        include: { role: true }
    });
    if (!detailedUser) {
// ... (不变)
      return res.status(404).json({ error: '用户未找到' });
    }
    res.json({
// ... (不变)
        id: detailedUser.id,
        username: detailedUser.username,
        nickname: detailedUser.nickname,
        role: detailedUser.role.name
    });
  } catch (error) {
// ... (不变)
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/sales (不变)
router.post('/sales', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
// ... (不变)
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    const { recordDate, storeId, productId, salesVolume, revenue, notes } = validation.data;
// ... (不变)
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
// ... (不变)
      data: {
        recordDate: new Date(recordDate), 
        salesVolume: salesVolume,
// ... (不变)
        revenue: revenue,
        notes: notes || null,
        enteredById: userId, 
// ... (不变)
        storeId: storeId,
        productId: productId, 
      }
    });
    res.status(201).json(newSalesData);
  } catch (error) {
// ... (不变)
    console.error('提交销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '提交失败：所选的店铺或商品无效' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/reports (不变)
router.post('/reports', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { 
      weekStartDate, summaryThisWeek, planNextWeek, 
// ... (不变)
      problemsEncountered, other 
    } = req.body;

    if (!weekStartDate || !summaryThisWeek || !planNextWeek) {
// ... (不变)
      return res.status(400).json({ error: '周开始日期、本周总结和下周计划是必填项' });
    }
    const userId = req.user.userId;
// ... (不变)

    const newReport = await prisma.weeklyReport.create({
      data: {
// ... (不变)
        weekStartDate: new Date(weekStartDate),
        summaryThisWeek: summaryThisWeek,
        planNextWeek: planNextWeek,
// ... (不变)
        problemsEncountered: problemsEncountered || null,
        other: other || null,
        authorId: userId, 
      }
    });
    res.status(201).json(newReport);
  } catch (error) {
// ... (不变)
    console.error('提交周报失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/stores/:id/products (不变)
router.get('/stores/:id/products', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { id } = req.params;
    // 修正：我们现在用 listings
// ... (不变)
    const store = await prisma.store.findUnique({
      where: { id: id },
      include: {
// ... (不变)
        listings: {
          include: {
            product: {
// ... (不变)
              select: { id: true, sku: true, name: true }
            }
          },
          orderBy: { product: { sku: 'asc' } }
        }
      }
    });
    if (!store) return res.status(404).json({ error: '店铺未找到' });
    
    // 将 listings 转换回 products 数组，保持 API 兼容性
// ... (不变)
    const products = store.listings.map(l => l.product);
    res.json(products);
    
  } catch (error) {
// ... (不变)
    res.status(500).json({ error: '获取店铺商品失败' });
  }
});


// (不变) 销售数据管理 API...
router.get('/sales-data', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { role, operatedCountries, supervisedCountries } = req.user;
    
    const { 
// ... (不变)
      countryCode, platform, storeId, 
      startDate, endDate, 
      sortBy, sortOrder
// ... (不变)
    } = req.query;

    const where = {};
// ... (不变)

    if (role !== 'admin') {
      where.store = { 
// ... (不变)
        countryCode: { in: operatedCountries }
      };
    }

    if (countryCode) {
// ... (不变)
      where.store = { ...where.store, countryCode: countryCode };
    }
    if (platform) {
// ... (不变)
      where.store = { ...where.store, platform: platform };
    }
    if (storeId) {
// ... (不变)
      where.storeId = storeId;
    }
    if (startDate && endDate) {
// ... (不变)
      where.recordDate = { 
        gte: new Date(startDate), 
        lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    } else if (startDate) {
// ... (不变)
      where.recordDate = { gte: new Date(startDate) };
    }

    const orderBy = {};
// ... (不变)
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
      const allowedSortBy = ['recordDate', 'salesVolume', 'revenue', 'createdAt'];
// ... (不变)
      if (allowedSortBy.includes(sortBy)) {
         orderBy[sortBy] = sortOrder;
      } else {
// ... (不变)
         orderBy.recordDate = 'desc';
      }
    } else {
      orderBy.recordDate = 'desc'; 
    }

    const salesData = await prisma.salesData.findMany({
// ... (不变)
      where: where,
      orderBy: orderBy,
      include: {
// ... (不变)
        store: { 
          include: { country: true } 
        }, 
        product: { 
// ... (不变)
          select: { sku: true, name: true }
        },
        enteredBy: { 
// ... (不变)
          select: { nickname: true }
        }
      }
    });

    const supervisedCodes = supervisedCountries || [];
// ... (不变)
    const isAdmin = role === 'admin';
    
    const response = salesData.map(row => ({
// ... (不变)
      ...row,
      canManage: isAdmin || supervisedCodes.includes(row.store.countryCode)
    }));

    res.json(response);
// ... (不变)

  } catch (error) {
    console.error('获取销售数据列表失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (辅助函数，不变)
async function checkManagementPermission(userId, salesDataId) {
// ... (不变)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } }, supervisedCountries: { select: { code: true } } }
  });

  if (user.role.name === 'admin') {
// ... (不变)
    return { canManage: true };
  }

  const data = await prisma.salesData.findUnique({
// ... (不变)
    where: { id: salesDataId },
    include: { store: { select: { countryCode: true } } }
  });

  if (!data) {
// ... (不变)
    return { canManage: false, error: '数据未找到', status: 404 };
  }

  const supervisedCodes = user.supervisedCountries.map(c => c.code);
// ... (不变)
  if (supervisedCodes.includes(data.store.countryCode)) {
    return { canManage: true };
  }
  
  return { canManage: false, error: '权限不足：您不是该国家的主管', status: 403 };
// ... (不变)
}

router.put('/sales-data/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error, status } = await checkManagementPermission(userId, id);
// ... (不变)
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    const validation = salesDataSchema.safeParse(req.body);
// ... (不变)
    if (!validation.success) {
      return res.status(400).json({ 
        error: '输入数据无效', 
        details: validation.error.errors 
      });
    }
    
    const { recordDate, storeId, productId, salesVolume, revenue, notes } = validation.data;
// ... (不变)

    const updatedSalesData = await prisma.salesData.update({
      where: { id: id },
// ... (不变)
      data: {
        recordDate: new Date(recordDate),
        storeId: storeId,
// ... (不变)
        productId: productId,
        salesVolume: salesVolume,
        revenue: revenue,
// ... (不变)
        notes: notes || null,
      },
      include: {
// ... (不变)
        store: { include: { country: true } }, 
        product: { select: { sku: true, name: true } },
        enteredBy: { select: { nickname: true } }
      }
    });
    
    res.json({
// ... (不变)
      ...updatedSalesData,
      canManage: true
    });

  } catch (error) {
// ... (不变)
    console.error('更新销售数据失败:', error);
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '更新失败：所选的店铺或商品无效' });
    }
    if (error.code === 'P2025') {
// ... (不变)
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/sales-data/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error, status } = await checkManagementPermission(userId, id);
// ... (不变)
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    await prisma.salesData.delete({
// ... (不变)
      where: { id: id },
    });

    res.status(204).send();
// ... (不变)

  } catch (error) {
    console.error('删除销售数据失败:', error);
// ... (不变)
     if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// (不变) 非 Admin 路由...
router.get('/countries', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const countries = await prisma.managedCountry.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(countries);
  } catch (error) {
// ... (不变)
    console.error('获取国家列表失败:', error);
    res.status(500).json({ error: '获取国家列表失败' });
  }
});

router.get('/products-list', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const products = await prisma.product.findMany({
      orderBy: { sku: 'asc' },
// ... (不变)
      include: {
        listings: { 
// ... (不变)
          include: {
            store: { 
// ... (不变)
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
// ... (不变)
    console.error("获取在售商品列表失败:", error);
    res.status(500).json({ error: '获取在售商品列表失败' });
  }
});

const priceSyncSchema = z.object({
// ... (不变)
  currentPrice: z.coerce.number().min(0, "价格不能为负数")
});

router.put('/listings/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { id: listingId } = req.params;
    const { role, supervisedCountries } = req.user; 

    const validation = priceSyncSchema.safeParse(req.body);
// ... (不变)
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { currentPrice } = validation.data;
// ... (不变)

    const listing = await prisma.storeProductListing.findUnique({
      where: { id: listingId },
// ... (不变)
      include: { store: { select: { countryCode: true } } }
    });

    if (!listing) {
// ... (不变)
      return res.status(404).json({ error: '未找到该商品的上架信息' });
    }
    
    const isAdmin = role === 'admin';
// ... (不变)
    const isSupervisor = Array.isArray(supervisedCountries) && supervisedCountries.includes(listing.store.countryCode);
    
    if (!isAdmin && !isSupervisor) {
// ... (不变)
      return res.status(403).json({ error: '权限不足：您不是该国家的主管' });
    }
    
    const updatedListing = await prisma.storeProductListing.update({
// ... (不变)
      where: { id: listingId },
      data: {
        currentPrice: currentPrice,
// ... (不变)
      },
      include: {
        store: { include: { country: true } }
      }
    });
    
    res.json(updatedListing);
// ... (不变)

  } catch (error)
 {
// ... (不变)
    console.error('价格同步失败:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '未找到该上架信息' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (不变) 常用链接 (公共读取)
router.get('/links', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const links = await prisma.commonLink.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(links);
  } catch (error) {
// ... (不变)
    console.error('获取常用链接失败:', error);
    res.status(500).json({ error: '获取链接列表失败' });
  }
});


// ⬇️ --- 【新增】 工作日历 API (员工) ---
// ------------------------------------------

// GET /api/calendar/events?start=...&end=... (获取“我的”日历)
router.get('/calendar/events', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { start, end } = req.query;

    if (!start || !end) {
// ... (不变)
      return res.status(400).json({ error: '必须提供 start 和 end 查询参数' });
    }

    const events = await prisma.calendarEvent.findMany({
// ... (不变)
      where: {
        authorId: userId, // (关键) 只获取我自己的
        startAt: { lte: new Date(end) },
        endAt: { gte: new Date(start) }
      },
      orderBy: {
// ... (不变)
        startAt: 'asc'
      },
      include: {
// ... (不变)
        author: { select: { nickname: true } } // (为 FullCalendar 扩展属性)
      }
    });
    res.json(events);
  } catch (error) {
// ... (不变)
    console.error('获取日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/calendar/events (员工创建自己的)
router.post('/calendar/events', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const validation = calendarEventSchema.safeParse(req.body);
    if (!validation.success) {
// ... (不变)
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const newEvent = await prisma.calendarEvent.create({
// ... (不变)
      data: {
        ...validation.data,
        authorId: userId,
        createdByAdmin: false // (关键) 明确这是用户自己创建的
      }
    });
    res.status(201).json(newEvent);
  } catch (error) {
// ... (不变)
    console.error('创建日历事件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/calendar/events/:id (员工修改自己的)
router.put('/calendar/events/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const validation = calendarEventUpdateSchema.safeParse(req.body);
// ... (不变)
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    // (安全) 检查用户是否有权修改
// ... (不变)
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        authorId: userId,
      }
    });

    if (!event) {
// ... (不变)
      return res.status(404).json({ error: '事件未找到' });
    }

    if (event.createdByAdmin) {
// ... (不变)
      return res.status(403).json({ error: '权限不足：无法修改由管理员指派的日程' });
    }

    const updatedEvent = await prisma.calendarEvent.update({
// ... (不变)
      where: { id: id },
      data: validation.data
    });
    res.json(updatedEvent);
  } catch (error) {
// ... (不变)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '事件未找到，或您无权修改此事件' });
    }
    console.error('更新日历事件失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/calendar/events/:id (员工删除自己的)
router.delete('/calendar/events/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;

    // (安全) 检查用户是否有权删除
// ... (不变)
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        authorId: userId,
      }
    });
    
    if (!event) {
// ... (不变)
      return res.status(404).json({ error: '事件未找到' });
    }

    if (event.createdByAdmin) {
// ... (不变)
      return res.status(403).json({ error: '权限不足：无法删除由管理员指派的日程' });
    }

    await prisma.calendarEvent.delete({
// ... (不变)
      where: { id: id }
    });
    res.status(204).send();
  } catch (error) {
// ... (不变)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '事件未找到，或您无权删除此事件' });
    }
    console.error('删除日历事件失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ⬇️ --- 【新增】 每周重点 API (员工) ---
// ------------------------------------------

// GET /api/calendar/weekly-focus?weekStartDate=... (获取或创建每周重点)
router.get('/calendar/weekly-focus', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { weekStartDate } = req.query; // 期望 'YYYY-MM-DD' (周一)
    
    if (!weekStartDate) {
// ... (不变)
      return res.status(400).json({ error: '必须提供 week (周一) 查询参数' });
    }
    
    const weekStart = new Date(weekStartDate);

    // 1. (使用 findFirst 替代 findUnique)
// ... (不变)
    let focus = await prisma.weeklyFocus.findFirst({
      where: {
        weekStartDate: weekStart,
        authorId: userId
      }
    });
    
    if (focus) {
// ... (不变)
      return res.json(focus);
    }
    
    // 2. 如果没找到，从上周的报告中创建
// ... (不变)
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const lastReport = await prisma.weeklyReport.findFirst({
// ... (不变)
      where: {
        authorId: userId,
        weekStartDate: {
          gte: prevWeekStart,
          lt: weekStart
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { planNextWeek: true }
    });

    const content = lastReport?.planNextWeek || '（暂无计划，请填写）';
    
    // 3. 创建新的 (使用 create，因为我们已用 findFirst 检查过)
// ... (不变)
    const newFocus = await prisma.weeklyFocus.create({
      data: {
        weekStartDate: weekStart,
        content: content,
        authorId: userId
      }
    });

    res.status(201).json(newFocus);
// ... (不变)

  } catch (error) {
    // (处理并发创建时的唯一约束冲突)
// ... (不变)
    if (error.code === 'P2002') {
      // (如果发生冲突，说明刚刚被创建，再次查询)
// ... (不变)
      const focus = await prisma.weeklyFocus.findFirst({
        where: {
          weekStartDate: new Date(weekStartDate),
          authorId: req.user.userId
        }
      });
      return res.json(focus);
    }
    console.error('获取每周重点失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/calendar/weekly-focus/:id (更新每周重点)
router.put('/calendar/weekly-focus/:id', authMiddleware, async (req, res) => {
// ... (不变)
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const validation = weeklyFocusUpdateSchema.safeParse(req.body);
// ... (不变)
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const updatedFocus = await prisma.weeklyFocus.update({
// ... (不变)
      where: {
        id: id,
        authorId: userId // (安全) 只能改自己的
      },
      data: {
// ... (不变)
        content: validation.data.content
      }
    });
    
    res.json(updatedFocus);
// ... (不变)

  } catch (error) {
    if (error.code === 'P2025') {
// ... (不变)
      return res.status(404).json({ error: '未找到该重点任务，或无权限修改' });
    }
    console.error('更新每周重点失败:', error);
// ... (不变)
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ⬆️ --- 【新增】 ---

module.exports = router;