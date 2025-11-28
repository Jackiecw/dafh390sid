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
  const storeFilter = {};
  const operatedCountries = user.operatedCountries || [];

  if (user.role !== 'admin') {
    storeFilter.countryCode = { in: operatedCountries.length ? operatedCountries : [] };
  }

  if (query.countryCode) {
    if (user.role !== 'admin' && !operatedCountries.includes(query.countryCode)) {
      return {
        error: {
          status: 403,
          message: '权限不足：您无法查看该国家的销售数据',
        },
      };
    }
    storeFilter.countryCode = query.countryCode;
  }

  if (query.platform) {
    storeFilter.platform = query.platform;
  }

  if (Object.keys(storeFilter).length > 0) {
    where.store = storeFilter;
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

  const supervisedCodes = user.supervisedCountries.map((c) => c.code);
  if (supervisedCodes.includes(data.store.countryCode)) {
    return { canManage: true };
  }

  return { canManage: false, error: '权限不足：您不是该国家的主管', status: 403 };
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
