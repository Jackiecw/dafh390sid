// ./backend/routes/storeListings.js

const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getRates, countryCurrencyMap } = require('./datahelpers'); // ⬅️ 导入汇率辅助函数

const router = express.Router();

// --- 1. Multer (店铺主图上传) 配置 ---
const uploadDir = path.join(__dirname, '..', 'uploads', 'listings');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // (使用 productId 和 storeId 命名)
    const { productId, storeId } = req.body;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `store-${storeId}-prod-${productId}-${timestamp}${extension}`);
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
  limits: { fileSize: 1024 * 1024 * 5 } // 限制 5MB
});

// --- 2. Zod 验证模式 ---
const listingSchema = z.object({
  storeId: z.string().min(1, "必须选择店铺"),
  productId: z.string().min(1, "必须选择产品"),
  storeTitle: z.string().min(1, "店铺标题不能为空"), // (注意: 我们在 schema 中已设为 String?)
  currentPrice: z.coerce.number().min(0, "价格必须为正数"),
  platformUrl: z.string().url("链接必须是有效的 URL").optional().nullable(),
});

// --- 3. 辅助函数 (用于计算日期范围) ---
const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 星期一
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
router.use(adminMiddleware);

/**
 * GET /api/admin/store-listings
 * (核心) 获取所有 "店铺在售商品"，并聚合销售数据
 */
router.get('/store-listings', async (req, res) => {
  try {
    // 1. 获取所有汇率
    const rates = await getRates(); // (例如 { CNY_USD: 0.14, CNY_IDR: 2300, ... })

    // 2. 获取日期范围
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // 3. (核心) 一次性查询所有 SalesData
    // (为了性能，我们只拉取本月及以后的数据，您可以根据需要调整)
    const allSalesData = await prisma.salesData.findMany({
      where: {
        recordDate: { gte: monthStart } // (优化：仅拉取本月数据)
        // (如果需要完整历史，可以移除 where 条件)
      },
      select: {
        productId: true,
        storeId: true,
        salesVolume: true,
        recordDate: true
      }
    });

    // 4. (核心) 在内存中处理聚合
    const salesAggregates = new Map(); // "listingKey_product_store" -> { week: 0, month: 0, total: 0 }
    
    for (const sale of allSalesData) {
      const key = `${sale.productId}_${sale.storeId}`;
      if (!salesAggregates.has(key)) {
        salesAggregates.set(key, { week: 0, month: 0 });
      }
      const agg = salesAggregates.get(key);

      // (总销量统计在此演示中被禁用，因为我们只拉了本月数据)
      // agg.total += sale.salesVolume; 
      
      if (sale.recordDate >= monthStart) {
        agg.month += sale.salesVolume;
      }
      if (sale.recordDate >= weekStart) {
        agg.week += sale.salesVolume;
      }
    }
    
    // (如果您需要 'totalSales'，必须执行一个单独的、更重的聚合查询)
    // (为保持接口速度，我们暂时只提供周/月)
    // (如果您确认需要总销量, 请告诉我, 我会添加第二次数据库查询)
    const totalSalesAggregates = await prisma.salesData.groupBy({
      by: ['productId', 'storeId'],
      _sum: {
        salesVolume: true,
      },
    });
    const totalSalesMap = new Map();
    totalSalesAggregates.forEach(item => {
      const key = `${item.productId}_${item.storeId}`;
      totalSalesMap.set(key, item._sum.salesVolume || 0);
    });


    // 5. 获取所有 Listings
    const listings = await prisma.storeProductListing.findMany({
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
      const currencyCode = countryCurrencyMap[countryCode] || null; // e.g., 'IDR'
      let priceRmb = 0;
      
      if (currencyCode && rates[`CNY_${currencyCode}`]) {
        const rate = rates[`CNY_${currencyCode}`]; // e.g., 2300
        priceRmb = listing.currentPrice / rate;
      }

      // (B) 组合销量
      const key = `${listing.productId}_${listing.storeId}`;
      const sales = salesAggregates.get(key) || { week: 0, month: 0 };
      const totalSales = totalSalesMap.get(key) || 0;
      
      return {
        ...listing,
        currentPriceRmb: priceRmb,
        lastWeekSales: sales.week,
        thisMonthSales: sales.month,
        totalSales: totalSales, // ⬅️ 来自第二次查询
      };
    });

    res.json(response);

  } catch (error) {
    console.error('获取店铺清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


/**
 * POST /api/admin/store-listings
 * (核心) 创建一个新的 "店铺在售商品"
 */
router.post('/store-listings', upload.single('storeImageUrl'), async (req, res) => {
  try {
    // 1. 验证文本数据
    const validation = listingSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path); // 删除已上传的图片
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const data = validation.data;

    // 2. 检查唯一性 (一个店铺不能重复上架一个产品)
    const existing = await prisma.storeProductListing.findUnique({
      where: { storeId_productId: { storeId: data.storeId, productId: data.productId } }
    });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '该商品已在该店铺上架' });
    }
    
    // 3. 准备 Payload
    const payload = {
      ...data,
      platformUrl: data.platformUrl || null
    };
    
    if (req.file) {
      payload.storeImageUrl = `/uploads/listings/${req.file.filename}`;
    }

    // 4. 创建
    const newListing = await prisma.storeProductListing.create({
      data: payload,
      include: { // (返回完整数据以便前端更新)
        product: { select: { sku: true, publicName: true, name: true } },
        store: { include: { country: true } }
      }
    });
    
    // 5. (返回) 补充空销量数据，使格式与 GET 接口一致
    res.status(201).json({
      ...newListing,
      currentPriceRmb: 0, // (创建时暂不计算)
      lastWeekSales: 0,
      thisMonthSales: 0,
      totalSales: 0,
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.code === 'P2002') { // (以防万一)
      return res.status(400).json({ error: '该商品已在该店铺上架' });
    }
    if (error.code === 'P2003') { // (无效的 storeId 或 productId)
      return res.status(400).json({ error: '选择的店铺或产品无效' });
    }
    console.error('创建店铺清单失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (您可以稍后添加 PUT 和 DELETE 接口)
// PUT /api/admin/store-listings/:id (用于修改 Listing)
// DELETE /api/admin/store-listings/:id (用于下架)


module.exports = router;