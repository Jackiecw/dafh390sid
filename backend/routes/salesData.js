// ./backend/routes/salesData.js

const express = require('express');
const { z } = require('zod');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');

const router = express.Router();

const salesDataSchema = z.object({
  recordDate: z.string().date('日期格式无效'),
  storeId: z.string().min(1),
  productId: z.string().min(1),
  listingId: z.string().optional().nullable(),
  salesVolume: z.number().int().min(0),
  revenue: z.number().min(0),
  currency: z.string().default('CNY'),
  notes: z.string().optional().nullable(),
  platformOrderId: z.string().optional().nullable(),
  orderStatus: z.string().optional().nullable(),
});

const SALES_SORTABLE_FIELDS = new Set(['recordDate', 'salesVolume', 'revenue', 'createdAt']);
const SALES_DATE_RANGE_BUFFER_DAYS = 1;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

const salesDataInclude = {
  store: { include: { country: true } },
  product: { select: { sku: true, name: true } },
  listing: { select: { productCode: true, storeTitle: true } },
  enteredBy: { select: { nickname: true } },
};

const asNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

function normalizePagination(query) {
  const page = Math.max(DEFAULT_PAGE, asNumber(query.page, DEFAULT_PAGE));
  const requestedSize = asNumber(query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedSize));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

function buildRecordDateFilter(startDate, endDate) {
  if (!startDate && !endDate) {
    return null;
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if ((startDate && Number.isNaN(start?.getTime())) || (endDate && Number.isNaN(end?.getTime()))) {
    return null;
  }

  if (start && end) {
    const endBoundary = new Date(end.getTime());
    endBoundary.setDate(endBoundary.getDate() + SALES_DATE_RANGE_BUFFER_DAYS);
    endBoundary.setHours(0, 0, 0, 0);
    return { gte: start, lt: endBoundary };
  }

  if (start) {
    return { gte: start };
  }

  const endBoundary = new Date(end.getTime());
  endBoundary.setDate(endBoundary.getDate() + SALES_DATE_RANGE_BUFFER_DAYS);
  endBoundary.setHours(0, 0, 0, 0);
  return { lt: endBoundary };
}

function buildSalesDataWhere(query, user) {
  const where = {};

  // 1. Base Permissions
  if (user.role !== 'admin') {
    const permissionConditions = [];

    // Rule 1: Managers can view all records for their supervised countries
    const supervisedCountries = user.supervisedCountries || [];
    if (supervisedCountries.length > 0) {
      // supervisedCountries is array of objects { code, name } usually, but let's check how it's passed.
      // In authMiddleware, it's attached. In salesImport.js I used { in: supervisedCountries }.
      // Let's assume it's an array of codes or objects.
      // In auth.js login: supervisedCountries = user.supervisedCountries (which is array of Country).
      // So it's array of objects. We need to map to codes if so.
      // Wait, in authMiddleware: req.user = user (payload).
      // In auth.js payload: supervisedCountries: supervisedCountries (which is mapped from user.supervisedCountries).
      // Let's check auth.js again.
      // It seems I didn't check auth.js payload construction deeply enough.
      // But in salesImport.js I used `user.supervisedCountries` directly as if it contains codes?
      // No, in salesImport.js I used `countryCode: { in: supervisedCountries }`.
      // If supervisedCountries is array of objects, this would fail.
      // Let's check `auth.js` payload.
      // Ah, I see in `auth.js` snippet I viewed earlier:
      // `supervisedCountries: supervisedCountries`
      // And `supervisedCountries` variable came from `user.supervisedCountries.map(c => c.country.code)`?
      // I need to be careful.
      // Let's assume `user.supervisedCountries` is array of strings (codes) for now, or I should verify.
      // Actually, looking at `salesData.js` line 165: `const supervisedCodes = user.supervisedCountries.map((c) => c.code);`
      // This implies `user.supervisedCountries` is an array of objects with a `code` property.

      const supervisedCodes = user.supervisedCountries.map(c => c.code);
      if (supervisedCodes.length > 0) {
        permissionConditions.push({
          store: { countryCode: { in: supervisedCodes } }
        });
      }
    }

    // Rule 2: View own records
    permissionConditions.push({
      enteredById: user.userId
    });

    // Combine with OR
    if (where.AND) {
      where.AND.push({ OR: permissionConditions });
    } else {
      where.AND = [{ OR: permissionConditions }];
    }
  }

  // 2. Apply Filters (on top of permissions)
  if (query.countryCode) {
    // We don't need to check permission here explicitly because the OR condition above handles it.
    // If user requests a country they don't supervise and have no records in, result is empty.
    // But to be nice, we could check, but simpler to just add to AND.
    // However, we must ensure `store` filter merges correctly.
    // Prisma `where` with relations can be tricky.
    // Let's use `AND` for filters.

    where.store = { ...where.store, countryCode: query.countryCode };
  }

  if (query.platform) {
    where.store = { ...where.store, platform: query.platform };
  }

  if (query.storeId) {
    where.storeId = query.storeId;
  }

  const recordDateFilter = buildRecordDateFilter(query.startDate, query.endDate);
  if (recordDateFilter) {
    where.recordDate = recordDateFilter;
  }

  return { where };
}

function buildSalesDataOrder(query) {
  const sortBy = query.sortBy && SALES_SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'recordDate';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { [sortBy]: sortOrder };
}

function appendManagePermission(rows, supervisedCountries = [], isAdmin = false) {
  const supervised = supervisedCountries || [];
  return rows.map((row) => ({
    ...row,
    canManage: isAdmin || supervised.includes(row.store.countryCode),
  }));
}

async function checkManagementPermission(userId, salesDataId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: { select: { name: true } },
      supervisedCountries: { select: { code: true } },
    },
  });

  if (!user) {
    return { canManage: false, error: '用户未找到', status: 404 };
  }

  if (user.role.name === 'admin') {
    return { canManage: true };
  }

  const data = await prisma.salesData.findUnique({
    where: { id: salesDataId },
    include: { store: { select: { countryCode: true } } },
  });

  if (!data) {
    return { canManage: false, error: '数据未找到', status: 404 };
  }

  // Rule 1: Manage own records
  if (data.enteredById === userId) {
    return { canManage: true };
  }

  // Rule 2: Manage supervised countries
  const supervisedCodes = user.supervisedCountries.map((c) => c.code);
  if (supervisedCodes.includes(data.store.countryCode)) {
    return { canManage: true };
  }

  return { canManage: false, error: '权限不足：您只能管理自己录入的数据或主管国家的数据', status: 403 };
}

router.post('/sales', authMiddleware, async (req, res) => {
  try {
    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: '输入数据无效',
        details: validation.error.errors,
      });
    }

    const { recordDate, storeId, productId, listingId, salesVolume, revenue, currency, notes, platformOrderId, orderStatus } = validation.data;
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
      data: {
        recordDate: new Date(recordDate),
        salesVolume,
        revenue,
        currency,
        notes: notes || null,
        platformOrderId: platformOrderId || null,
        orderStatus: orderStatus || null,
        enteredById: userId,
        storeId,
        productId,
        listingId: listingId || null,
      },
    });
    return res.status(201).json(newSalesData);
  } catch (error) {
    console.error('提交销售数据失败', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: '提交失败：所选的店铺、商品或链接无效' });
    }
    return res.status(500).json({ error: '服务器内部错误', message: error.message, stack: error.stack });
  }
});

router.get('/sales-data', authMiddleware, async (req, res) => {
  try {
    const { role, supervisedCountries = [] } = req.user;
    const { where, error } = buildSalesDataWhere(req.query, req.user);

    if (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }

    const orderBy = buildSalesDataOrder(req.query);
    const { page, pageSize, skip } = normalizePagination(req.query);

    const [total, salesData] = await prisma.$transaction([
      prisma.salesData.count({ where }),
      prisma.salesData.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: salesDataInclude,
      }),
    ]);

    const formattedData = appendManagePermission(salesData, supervisedCountries, role === 'admin');

    return res.json({
      data: formattedData,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取销售数据列表失败:', error);
    return res.status(500).json({ error: '服务器内部错误', message: error.message, stack: error.stack });
  }
});

router.put('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error: permissionError, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: permissionError });
    }

    const validation = salesDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: '输入数据无效',
        details: validation.error.errors,
      });
    }

    const { recordDate, storeId, productId, listingId, salesVolume, revenue, currency, notes, platformOrderId, orderStatus } = validation.data;
    const updatedSalesData = await prisma.salesData.update({
      where: { id },
      data: {
        recordDate: new Date(recordDate),
        storeId,
        productId,
        listingId: listingId || null,
        salesVolume,
        revenue,
        currency,
        notes: notes || null,
        platformOrderId: platformOrderId || null,
        orderStatus: orderStatus || null,
      },
      include: salesDataInclude,
    });

    return res.json({
      ...updatedSalesData,
      canManage: true,
    });
  } catch (error) {
    console.error('更新销售数据失败:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: '更新失败：所选的店铺、商品或链接无效' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    return res.status(500).json({ error: '服务器内部错误', message: error.message, stack: error.stack });
  }
});

router.delete('/sales-data/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { canManage, error: permissionError, status } = await checkManagementPermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: permissionError });
    }

    await prisma.salesData.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('删除销售数据失败:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '数据未找到' });
    }
    return res.status(500).json({ error: '服务器内部错误', message: error.message, stack: error.stack });
  }
});

module.exports = router;
module.exports.__testables = {
  buildRecordDateFilter,
  buildSalesDataWhere,
  buildSalesDataOrder,
  normalizePagination,
  appendManagePermission,
};
