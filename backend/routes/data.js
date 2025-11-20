// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod'); 
const axios = require('axios'); 

const router = express.Router();
const logger = require('../logger');

const RATE_REFRESH_LIMIT = 3;
const rateRefreshTracker = new Map();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRateRefreshRecord(userId) {
  const todayKey = getTodayKey();
  const existing = rateRefreshTracker.get(userId);
  if (!existing || existing.date !== todayKey) {
    const freshRecord = { date: todayKey, count: 0 };
    rateRefreshTracker.set(userId, freshRecord);
    return freshRecord;
  }
  return existing;
}

function getRemainingRefreshes(user) {
  if (!user || user.role === 'admin') return null;
  const record = getRateRefreshRecord(user.userId);
  return Math.max(RATE_REFRESH_LIMIT - record.count, 0);
}


const { 
  getRates, 
  countryCurrencyMap, 
  currencySymbols,
  getStartOfToday,
  getStartOfWeek,
  getStartOfMonth,
  getPlanPreviewForWeek
} = require('./datahelpers');

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
      
      const { rates: currentRates } = await getRates(); 
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
    const { rates, lastFetched } = await getRates(); // (复用 datahelpers.js 中的函数)
    res.json({
      rates,
      updatedAt: lastFetched ? new Date(lastFetched).toISOString() : null,
      remainingRefreshes: getRemainingRefreshes(req.user),
    });
  } catch (error) {
    console.error('获取公开汇率失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/rates/refresh', authMiddleware, async (req, res) => {
  try {
    logger.info('手动刷新汇率请求', {
      userId: req.user.userId,
      role: req.user.role,
    });
    if (req.user.role !== 'admin') {
      const record = getRateRefreshRecord(req.user.userId);
      if (record.count >= RATE_REFRESH_LIMIT) {
        logger.warn('手动刷新次数已达上限', {
          userId: req.user.userId,
          date: record.date,
        });
        return res.status(429).json({ error: '今日刷新次数已用完，请明日再试' });
      }
      record.count += 1;
    }
    const { rates, lastFetched } = await getRates({ forceRefresh: true });
    logger.info('手动刷新汇率成功', {
      userId: req.user.userId,
      role: req.user.role,
      fetchedAt: new Date(lastFetched).toISOString(),
    });
    res.json({
      rates,
      updatedAt: lastFetched ? new Date(lastFetched).toISOString() : null,
      remainingRefreshes: getRemainingRefreshes(req.user),
    });
  } catch (error) {
    logger.error('手动刷新汇率失败', { message: error.message, stack: error.stack });
    res.status(500).json({ error: error?.message || '手动刷新汇率失败' });
  }
});

module.exports = router;
