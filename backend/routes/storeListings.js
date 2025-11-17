// ./backend/routes/storeListings.js

const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getRates, countryCurrencyMap } = require('./datahelpers');

const router = express.Router();

// --- 1. Multer (店铺主图上传) 配置 (不变) ---
const uploadDir = path.join(__dirname, '..', 'uploads', 'listings');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const { productId, storeId } = req.body;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    // (修复：确保 storeId 和 productId 存在，即使在 PUT 请求中)
    const pId = productId || req.listing?.productId || 'unknown';
    const sId = storeId || req.listing?.storeId || 'unknown';
    cb(null, `store-${sId}-prod-${pId}-${timestamp}${extension}`);
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

// --- 2. Zod schema definitions ---

const createListingSchema = z.object({
  storeId: z.string().min(1, "storeId is required"),
  productId: z.string().min(1, "productId is required"),
  productCode: z.string().min(1, "productCode is required"),
  storeTitle: z.string().min(1, "storeTitle is required"),
  currentPrice: z.coerce.number().min(0, "currentPrice must be positive"),
  platformUrl: z
    .string()
    .url("platformUrl must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal('')),
});

const updateListingSchema = z.object({
  storeTitle: z.string().min(1, "storeTitle is required").optional(),
  productCode: z.string().min(1, "productCode is required").optional(),
  currentPrice: z.coerce.number().min(0, "currentPrice must be positive").optional(),
  platformUrl: z
    .string()
    .url("platformUrl must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal('')),
});

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
// --- API 路由 (全部受 Admin 保护) ---
// ------------------------------------------
router.use(authMiddleware);

/**
 * GET /api/admin/store-listings (不变)
 * (核心) 获取所有 "店铺在售商品"，并聚合销售数据
 */
router.get('/store-listings', async (req, res) => {
  try {
    const allowedCountries = getAllowedCountries(req);
    const allowedStoreIds = allowedCountries
      ? await getStoreIdsForCountries(allowedCountries)
      : null;

    if (allowedCountries && (!allowedStoreIds || allowedStoreIds.length === 0)) {
      return res.json([]);
    }

    const storeIdFilter = allowedStoreIds
      ? { storeId: { in: allowedStoreIds } }
      : {};

    // 1. 获取所有汇率
    const rates = await getRates(); 

    // 2. 获取日期范围
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // 3. (核心) 一次性查询所有 SalesData (优化：仅拉取本月数据)
    const allSalesData = await prisma.salesData.findMany({
      where: {
        recordDate: { gte: monthStart },
        ...storeIdFilter,
      },
      select: {
        productId: true,
        storeId: true,
        salesVolume: true,
        recordDate: true
      }
    });

    // 4. (核心) 在内存中处理聚合
    const salesAggregates = new Map(); 
    for (const sale of allSalesData) {
      const key = `${sale.productId}_${sale.storeId}`;
      if (!salesAggregates.has(key)) {
        salesAggregates.set(key, { week: 0, month: 0 });
      }
      const agg = salesAggregates.get(key);
      if (sale.recordDate >= monthStart) agg.month += sale.salesVolume;
      if (sale.recordDate >= weekStart) agg.week += sale.salesVolume;
    }
    
    // (总销量聚合查询)
    const totalSalesAggregates = await prisma.salesData.groupBy({
      by: ['productId', 'storeId'],
      _sum: { salesVolume: true },
      where: Object.keys(storeIdFilter).length ? storeIdFilter : undefined,
    });
    const totalSalesMap = new Map();
    totalSalesAggregates.forEach(item => {
      const key = `${item.productId}_${item.storeId}`;
      totalSalesMap.set(key, item._sum.salesVolume || 0);
    });

    // 5. 获取所有 Listings
    const listings = await prisma.storeProductListing.findMany({
      where: storeIdFilter,
      include: {
        product: { select: { sku: true, publicName: true, name: true } },
        store: { include: { country: true } }
      },
      orderBy: { store: { name: 'asc' } }
    });

    // 6. (核心) 组合数据
    const response = listings.map(listing => {
      // (A) 计算汇率
      const countryCode = listing.store.countryCode;
      const currencyCode = countryCurrencyMap[countryCode] || null; 
      let priceRmb = null;
      const rate = resolveRateValue(rates, currencyCode);
      if (rate) {
        priceRmb = listing.currentPrice / rate;
      }
      // (B) 组合销量
      const key = `${listing.productId}_${listing.storeId}`;
      const sales = salesAggregates.get(key) || { week: 0, month: 0 };
      const totalSales = totalSalesMap.get(key) || 0;
      
      return {
        ...listing,
        currencyCode,
        currentPriceRmb: priceRmb,
        lastWeekSales: sales.week,
        thisMonthSales: sales.month,
        totalSales: totalSales, 
      };
    });

    res.json(response);

  } catch (error) {
    console.error('获取店铺清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


/**
 * POST /api/admin/store-listings (不变)
 * (核心) 创建一个新的 "店铺在售商品"
 */
router.post('/store-listings', upload.single('storeImageUrl'), async (req, res) => {
  try {
    // 1. 验证文本数据
    const validation = createListingSchema.safeParse(req.body); // ?? 使用 'create' schema
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
    
    const rates = await getRates();
    // 3. 准备 Payload (不变)
    const currencyCode = countryCurrencyMap[targetStore.countryCode] || null;

    const payload = {
      ...data,
      platformUrl: data.platformUrl || null
    };
    if (req.file) {
      payload.storeImageUrl = `/uploads/listings/${req.file.filename}`;
    }

    // 4. 创建 (不变)
    const newListing = await prisma.storeProductListing.create({
      data: payload,
      include: { 
        product: { select: { sku: true, publicName: true, name: true } },
        store: { include: { country: true } }
      }
    });
    
    // 5. (返回) 补充空数据 (不变)
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

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.code === 'P2003') return res.status(400).json({ error: '选择的店铺或产品无效' });
    console.error('创建店铺清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ?? --- 【新增：编辑功能 (GET, PUT, DELETE)】 ---

/**
 * GET /api/admin/store-listings/:id
 * (新增) 获取单个 "在售商品" 的详情 (用于填充编辑表单)
 */
router.get('/store-listings/options', async (req, res) => {
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
router.get('/store-listings/:id', async (req, res) => {
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

/**
 * PUT /api/admin/store-listings/:id
 * (新增) 更新 "在售商品"
 */
router.put('/store-listings/:id', upload.single('storeImageUrl'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. (安全) 先获取旧数据
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
    // (注入旧数据到 req, 供 multer 命名使用)
    req.listing = oldListing; 

    // 2. 验证文本数据
    const validation = updateListingSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path); 
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    const data = validation.data;
    
    // 3. 准备 Payload
    const payload = {
      ...data,
      platformUrl: data.platformUrl || null
    };

    // 4. (关键) 处理图片更新
    if (req.file) {
      payload.storeImageUrl = `/uploads/listings/${req.file.filename}`;
      // (删除旧图片)
      if (oldListing.storeImageUrl) {
        const oldPath = path.join(__dirname, '..', oldListing.storeImageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // 5. 更新数据库
    const updatedListing = await prisma.storeProductListing.update({
      where: { id: id },
      data: payload,
      include: { // (返回完整数据以便前端更新)
        product: { select: { sku: true, publicName: true, name: true } },
        store: { include: { country: true } }
      }
    });

    // 6. (返回) 补充销量数据 (编辑时我们不重新计算，让前端刷新)
    res.json({
      ...updatedListing,
      currencyCode: countryCurrencyMap[updatedListing.store.countryCode] || null,
      // (前端已有销量数据, 无需返回)
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.code === 'P2025') return res.status(404).json({ error: '未找到该上架商品' });
    console.error('更新上架商品失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


/**
 * DELETE /api/admin/store-listings/:id
 * (新增) 下架/删除 "在售商品"
 */
router.delete('/store-listings/:id', async (req, res) => {
  try {
    if ((req.user?.role || '') !== 'admin') {
      return res.status(403).json({ error: '仅超级管理员可以删除上架商品' });
    }
    const { id } = req.params;

    // (安全) 先获取数据，以便删除图片
    const listing = await prisma.storeProductListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: '未找到该上架商品' });
    }
    
    // 1. (自动) Prisma onCascade 会自动删除关联的 SalesData 吗? 
    //    答：不会，SalesData 是关联 Product 和 Store, 不关联 Listing。
    //    (所以我们可以安全删除)
    
    // 2. 删除图片
    if (listing.storeImageUrl) {
      const oldPath = path.join(__dirname, '..', listing.storeImageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    // 3. 删除数据库条目
    await prisma.storeProductListing.delete({
      where: { id: id }
    });
    
    res.status(204).send(); // 204 No Content

  } catch (error)
 {
    if (error.code === 'P2025') return res.status(404).json({ error: '未找到该上架商品' });
    console.error('删除上架商品失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ?? --- 【新增】 ---

module.exports = router;







