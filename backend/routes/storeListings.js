// backend/routes/storeListings.js

const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getRates, countryCurrencyMap } = require('./datahelpers');

const router = express.Router();

// ... (Multer 配置保持不变，请保留原有的 storage, fileFilter, upload 代码) ...
const uploadDir = path.join(__dirname, '..', 'uploads', 'listings');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // (修复：确保 storeId 和 productId 存在，即使在 PUT 请求中)
    // 这里为了安全，如果是 PUT 请求且没传 body，尝试从 req.listing 获取（在路由逻辑中注入）
    // 但由于 multer 在路由逻辑前执行，req.listing 可能还未注入。
    // 简单起见，直接用 timestamp 保证唯一性即可。
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `listing-${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
});

// ... (辅助函数 getAllowedCountries, ensureCountryAccess 等保持不变) ...
const getAllowedCountries = (req) => {
  const { role, operatedCountries = [] } = req.user || {};
  if (role === 'admin') return null;
  return operatedCountries;
};

const ensureCountryAccess = (countryCode, req) => {
  const allowedCountries = getAllowedCountries(req);
  if (!allowedCountries) return true;
  if (allowedCountries.includes(countryCode)) return true;
  return false;
};

const getStoreIdsForCountries = async (countryCodes) => {
  if (!countryCodes || countryCodes.length === 0) return null;
  const stores = await prisma.store.findMany({
    where: { countryCode: { in: countryCodes } },
    select: { id: true },
  });
  return stores.map((store) => store.id);
};

const resolveRateValue = (rates, currencyCode) => {
  if (!currencyCode || !rates) return null;
  return rates[`CNY_${currencyCode}`] ?? rates[currencyCode] ?? null;
};

// ... (Zod Schema 保持不变) ...
const createListingSchema = z.object({
  storeId: z.string().min(1, "storeId is required"),
  productId: z.string().min(1, "productId is required"),
  productCode: z.string().min(1, "productCode is required"),
  storeTitle: z.string().min(1, "storeTitle is required"),
  currentPrice: z.coerce.number().min(0, "currentPrice must be positive"),
  platformUrl: z.string().url("platformUrl must be a valid URL").optional().nullable().or(z.literal('')),
});

const updateListingSchema = z.object({
  storeTitle: z.string().min(1, "storeTitle is required").optional(),
  productCode: z.string().min(1, "productCode is required").optional(),
  currentPrice: z.coerce.number().min(0, "currentPrice must be positive").optional(),
  platformUrl: z.string().url("platformUrl must be a valid URL").optional().nullable().or(z.literal('')),
});

// ... (日期辅助函数 保持不变) ...
const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// ------------------------------------------
// --- API 路由 ---
// ------------------------------------------
router.use(authMiddleware);

/**
 * GET /api/admin/store-listings
 * (性能优化版) 分页获取 "店铺在售商品"，并按 Listing 聚合销售数据
 */
router.get('/store-listings', async (req, res) => {
  try {
    // 1. 分页参数
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    // 2. 权限过滤
    const allowedCountries = getAllowedCountries(req);
    const allowedStoreIds = allowedCountries
      ? await getStoreIdsForCountries(allowedCountries)
      : null;

    if (allowedCountries && (!allowedStoreIds || allowedStoreIds.length === 0)) {
      return res.json({ data: [], total: 0, page, pageSize });
    }

    const storeIdFilter = allowedStoreIds
      ? { storeId: { in: allowedStoreIds } }
      : {};

    // 3. 获取当前页的 Listings 和 总数
    const [total, listings] = await prisma.$transaction([
      prisma.storeProductListing.count({ where: storeIdFilter }),
      prisma.storeProductListing.findMany({
        where: storeIdFilter,
        skip: skip,
        take: pageSize,
        include: {
          product: { select: { sku: true, publicName: true, name: true } },
          store: { include: { country: true } }
        },
        orderBy: { store: { name: 'asc' } } // 或者按创建时间排序
      })
    ]);

    if (listings.length === 0) {
      return res.json({ data: [], total, page, pageSize });
    }

    // 4. 获取当前页 listing 的 ID 列表
    const listingIds = listings.map(l => l.id);
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();
    const { rates: rateMap } = await getRates();

    // 5. (数据库级聚合) 只聚合当前页 ID 的销量
    //    由于 Prisma groupBy 不支持在一次查询中对不同时间段做条件聚合 (Conditional Aggregation)，
    //    我们需要分三次查询，或者使用 rawQuery。为了代码清晰，这里用三次 groupBy (性能通常可接受，因为 listingIds 数量有限)。

    const [totalSalesAgg, monthSalesAgg, weekSalesAgg] = await prisma.$transaction([
      // 总销量
      prisma.salesData.groupBy({
        by: ['listingId'],
        _sum: { salesVolume: true },
        where: { listingId: { in: listingIds } }
      }),
      // 本月销量
      prisma.salesData.groupBy({
        by: ['listingId'],
        _sum: { salesVolume: true },
        where: { listingId: { in: listingIds }, recordDate: { gte: monthStart } }
      }),
      // 本周销量
      prisma.salesData.groupBy({
        by: ['listingId'],
        _sum: { salesVolume: true },
        where: { listingId: { in: listingIds }, recordDate: { gte: weekStart } }
      })
    ]);

    // 6. 将聚合结果转为 Map 方便查找
    const salesMap = new Map(); // Key: listingId, Value: { total, month, week }

    // 初始化 Map
    listingIds.forEach(id => salesMap.set(id, { total: 0, month: 0, week: 0 }));

    // 填充数据
    totalSalesAgg.forEach(item => {
      if (item.listingId) salesMap.get(item.listingId).total = item._sum.salesVolume || 0;
    });
    monthSalesAgg.forEach(item => {
      if (item.listingId) salesMap.get(item.listingId).month = item._sum.salesVolume || 0;
    });
    weekSalesAgg.forEach(item => {
      if (item.listingId) salesMap.get(item.listingId).week = item._sum.salesVolume || 0;
    });

    // 7. 组合最终数据
    const data = listings.map(listing => {
      const countryCode = listing.store.countryCode;
      const currencyCode = countryCurrencyMap[countryCode] || null;
      let priceRmb = null;
      const rate = resolveRateValue(rateMap, currencyCode);
      if (rate) {
        priceRmb = listing.currentPrice / rate;
      }

      const sales = salesMap.get(listing.id);

      return {
        ...listing,
        currencyCode,
        currentPriceRmb: priceRmb,
        lastWeekSales: sales.week,
        thisMonthSales: sales.month,
        totalSales: sales.total,
      };
    });

    res.json({
      data,
      total,
      page,
      pageSize
    });

  } catch (error) {
    console.error('获取店铺清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ... (POST, PUT, DELETE 路由保持不变) ...
// (为了节省篇幅，这里省略 create/update/delete 代码，请确保保留原文件中的这些部分)
// 下面仅列出 POST 的开头以确认位置
router.post('/store-listings', upload.single('storeImageUrl'), async (req, res) => {
  // ... (代码不变)
  // 1. 验证文本数据
  const validation = createListingSchema.safeParse(req.body);
  // ... (省略具体实现，请直接使用原文件代码)
  if (!validation.success) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
  }
  const data = validation.data;

  const targetStore = await prisma.store.findUnique({
    where: { id: data.storeId },
    select: { countryCode: true }
  });
  if (!targetStore) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: '目标店铺不存在' });
  }
  if (!ensureCountryAccess(targetStore.countryCode, req)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: '权限不足：无法在该国家的店铺上架' });
  }

  const { rates } = await getRates();
  const currencyCode = countryCurrencyMap[targetStore.countryCode] || null;

  const payload = {
    ...data,
    platformUrl: data.platformUrl || null
  };
  if (req.file) {
    payload.storeImageUrl = `/uploads/listings/${req.file.filename}`;
  }

  const newListing = await prisma.storeProductListing.create({
    data: payload,
    include: {
      product: { select: { sku: true, publicName: true, name: true } },
      store: { include: { country: true } }
    }
  });

  const conversionRate = resolveRateValue(rates, currencyCode);
  const convertedPrice = conversionRate ? newListing.currentPrice / conversionRate : null;

  res.status(201).json({
    ...newListing,
    currencyCode,
    currentPriceRmb: convertedPrice,
    lastWeekSales: 0,
    thisMonthSales: 0,
    totalSales: 0,
  });
});

router.get('/store-listings/options', async (req, res) => {
  // ... (代码不变)
  try {
    const allowedCountries = getAllowedCountries(req);
    const [countries, stores, products] = await Promise.all([
      prisma.managedCountry.findMany({
        where: allowedCountries ? { code: { in: allowedCountries } } : undefined,
        orderBy: { code: 'asc' },
      }),
      prisma.store.findMany({
        where: allowedCountries ? { countryCode: { in: allowedCountries } } : undefined,
        select: { id: true, name: true, countryCode: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        orderBy: { sku: 'asc' },
        select: { id: true, sku: true, name: true, publicName: true },
      }),
    ]);

    res.json({
      countries,
      stores,
      products,
      currencyMap: countryCurrencyMap,
    });
  } catch (error) {
    console.error('获取上架选项失败:', error);
    res.status(500).json({ error: '获取上架选项失败' });
  }
});

// ⬇️ 【新增】 获取指定店铺的所有 Listings (用于手动映射)
router.get('/store-listings/by-store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    // 权限检查
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ error: '店铺未找到' });
    if (!ensureCountryAccess(store.countryCode, req)) {
      return res.status(403).json({ error: '权限不足' });
    }

    const listings = await prisma.storeProductListing.findMany({
      where: { storeId },
      select: {
        id: true,
        storeTitle: true,
        productCode: true,
        storeImageUrl: true, // Added
        product: {
          select: {
            sku: true,
            name: true,
            publicName: true
          }
        }
      },
      orderBy: { storeTitle: 'asc' }
    });

    res.json(listings);
  } catch (error) {
    console.error('获取店铺 Listings 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});
// ⬆️ 【新增】
router.get('/store-listings/:id', async (req, res) => {
  // ... (代码不变)
  try {
    const { id } = req.params;
    const listing = await prisma.storeProductListing.findUnique({
      where: { id: id },
      include: { store: { select: { countryCode: true } } }
    });

    if (!listing) {
      return res.status(404).json({ error: '未找到该上架商品' });
    }

    if (listing.store && !ensureCountryAccess(listing.store.countryCode, req)) {
      return res.status(403).json({ error: '权限不足：无法查看该上架商品' });
    }
    res.json(listing);

  } catch (error) {
    console.error('获取上架详情失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/store-listings/:id', upload.single('storeImageUrl'), async (req, res) => {
  // ... (代码不变)
  try {
    const { id } = req.params;

    const oldListing = await prisma.storeProductListing.findUnique({
      where: { id },
      include: { store: { select: { countryCode: true } } }
    });
    if (!oldListing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: '未找到该上架商品' });
    }
    if (oldListing.store && !ensureCountryAccess(oldListing.store.countryCode, req)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: '权限不足：无法编辑该上架商品' });
    }
    req.listing = oldListing;

    const validation = updateListingSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    const data = validation.data;

    const payload = {
      ...data,
      platformUrl: data.platformUrl || null
    };

    if (req.file) {
      payload.storeImageUrl = `/uploads/listings/${req.file.filename}`;
      if (oldListing.storeImageUrl) {
        const oldPath = path.join(__dirname, '..', oldListing.storeImageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const updatedListing = await prisma.storeProductListing.update({
      where: { id: id },
      data: payload,
      include: {
        product: { select: { sku: true, publicName: true, name: true } },
        store: { include: { country: true } }
      }
    });

    res.json({
      ...updatedListing,
      currencyCode: countryCurrencyMap[updatedListing.store.countryCode] || null,
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.code === 'P2025') return res.status(404).json({ error: '未找到该上架商品' });
    console.error('更新上架商品失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/store-listings/:id', async (req, res) => {
  // ... (代码不变)
  try {
    if ((req.user?.role || '') !== 'admin') {
      return res.status(403).json({ error: '仅超级管理员可以删除上架商品' });
    }
    const { id } = req.params;

    const listing = await prisma.storeProductListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: '未找到该上架商品' });
    }

    if (listing.storeImageUrl) {
      const oldPath = path.join(__dirname, '..', listing.storeImageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await prisma.storeProductListing.delete({
      where: { id: id }
    });

    res.status(204).send();

  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: '未找到该上架商品' });
    console.error('删除上架商品失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
