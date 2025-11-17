// ./backend/routes/products.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// ⬇️ 【新增】 导入新的枚举
const { ProductCategory, OS_Type, Focus_Method, Keystone_Method } = require('@prisma/client');

const router = express.Router();

// --- 1. Multer (文件上传) 配置 (不变) ---
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sku = req.body.sku || 'temp';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${sku.replace(/[/\\?%*:|"<>]/g, '_')}-${timestamp}${extension}`);
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

// --- 2. Zod 验证模式 (重大修改) ---
// (用于 "我有的产品" / Product)
const productSchema = z.object({
  sku: z.string().min(1, "SKU 不能为空"),
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  
  // ⬇️ --- 【新增所有规格字段】 ---
  publicName: z.string().optional().nullable(),
  
  // 物理规格 (使用 coerce 转换 "100" 为 100)
  cost: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  weightKg: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  lengthMm: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  widthMm: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  heightMm: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),

  // 详细参数
  resolution: z.string().optional().nullable(),
  brightnessAnsi: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  brightnessUniformity: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  lightSourceBrightness: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  noiseDb: z.preprocess(val => parseInt(val) || null, z.number().int().optional().nullable()),
  contrastRatio: z.string().optional().nullable(),
  throwRatio: z.string().optional().nullable(),
  projectionSize: z.string().optional().nullable(),
  projectionDistance: z.string().optional().nullable(),
  
  // 硬件与系统
  chipset: z.string().optional().nullable(),
  ramRom: z.string().optional().nullable(),
  os: z.nativeEnum(OS_Type).optional().nullable(),
  focusMethod: z.nativeEnum(Focus_Method).optional().nullable(),
  keystone: z.nativeEnum(Keystone_Method).optional().nullable(),
  
  // 功能特性 (使用 preprocess 将 "true" 字符串转为 boolean)
  hasGimbal: z.preprocess(val => val === 'true' || val === true, z.boolean().optional().default(false)),
  wifiVersion: z.string().optional().nullable(),
  bluetoothVersion: z.string().optional().nullable(),
  autoObstacle: z.preprocess(val => val === 'true' || val === true, z.boolean().optional().default(false)),
  autoScreenFit: z.preprocess(val => val === 'true' || val === true, z.boolean().optional().default(false)),
});
// ⬆️ --- 【新增所有规格字段】 ---

// (不变) 价格同步 Zod
const priceSyncSchema = z.object({
  currentPrice: z.coerce.number().min(0, "价格不能为负数")
});


// --- 3. Product CRUD 路由 (全部受 Admin 保护) ---
router.use(adminMiddleware);

// GET /api/admin/products (不变)
// (这个接口用于获取 "我有的产品" 列表)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { sku: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// GET /api/admin/product-options (重大修改)
// (为 "我有的产品" 表单提供所有下拉框选项)
router.get('/product-options', (req, res) => {
  res.json({
    categories: Object.values(ProductCategory),
    osTypes: Object.values(OS_Type), // ⬅️ 【新增】
    focusMethods: Object.values(Focus_Method), // ⬅️ 【新增】
    keystoneMethods: Object.values(Keystone_Method), // ⬅️ 【新增】
  });
});

// POST /api/admin/products (重大修改)
// (用于创建 "我有的产品")
router.post('/products', upload.single('imageUrl'), async (req, res) => {
  try {
    // 1. 验证文本数据
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    // 2. 检查 SKU 是否唯一
    const { sku } = validation.data;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '此 SKU 已被占用' });
    }

    // 3. 准备数据库 payload (Zod 已处理所有字段)
    const payload = { ...validation.data }; 
    
    // 4. (关键) 处理图片路径
    if (req.file) {
      // (注意：这里的 'imageUrl' 是 "我有的产品" 的内部主图)
      payload.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // 5. 创建商品
    const newProduct = await prisma.product.create({ data: payload });
    res.status(201).json(newProduct);

  } catch (error) {
    console.error('创建商品失败:', error);
    if (req.file) fs.unlinkSync(req.file.path); // 出错时删除文件
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '此 SKU 已被占用' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/admin/products/:id (重大修改)
// (用于更新 "我有的产品")
router.put('/products/:id', upload.single('imageUrl'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. 验证文本数据
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }

    // 2. 检查 SKU (如果 SKU 被修改了)
    const { sku } = validation.data;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '此 SKU 已被其他商品占用' });
    }

    // 3. 准备 payload (Zod 已处理所有字段)
    const payload = { ...validation.data };

    // 4. (关键) 处理图片更新
    if (req.file) {
      payload.imageUrl = `/uploads/products/${req.file.filename}`;
      
      const oldProduct = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
      if (oldProduct && oldProduct.imageUrl) {
        const oldPath = path.join(__dirname, '..', oldProduct.imageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // 5. 更新商品
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: payload,
    });
    res.json(updatedProduct);

  } catch (error) {
    console.error('更新商品失败:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '商品未找到' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '此 SKU 已被占用' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/admin/products/:id (不变)
// (删除 "我有的产品")
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
    if (product && product.imageUrl) {
      const oldPath = path.join(__dirname, '..', product.imageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    // (Prisma 的 onDelete: Cascade 会自动删除所有关联的 StoreProductListing)
    await prisma.product.delete({ where: { id } });
    res.status(204).send(); // 204 No Content

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '商品未找到' });
    }
    if (error.code === 'P2003') { 
      // (例如：如果还有 SalesData 关联着)
      return res.status(400).json({ error: '删除失败：该商品仍有关联的销售数据或物流批次，无法删除' });
    }
    console.error('删除商品失败:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});


// ----------------------------------------------------
// --- (不变) "在售商品" 模块 API (由 data.js 和其他文件处理) ---
// (我们保留这些，因为它们仍然被 SalesForm 和 OnSaleProductsPage 使用)
// ----------------------------------------------------

/**
 * GET /api/admin/products-list (不变)
 * (这个接口名现在有点歧义，但 OnSaleProductsPage 依赖它)
 * (它获取 "我有的产品" 列表，并附带 "店铺清单" 信息)
 */
router.get('/products-list', async (req, res) => {
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

/**
 * PUT /api/admin/listings/:id (价格同步) (不变)
 * (这个接口现在归属 StoreProductListing，但路由保持不变)
 */
router.put('/listings/:id', async (req, res) => {
  try {
    const { id: listingId } = req.params;
    // (注意：req.user 来自 adminMiddleware)
    const { role, supervisedCountries } = req.user; 

    // 1. 验证输入
    const validation = priceSyncSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { currentPrice } = validation.data;

    // 2. (权限) 检查权限
    const listing = await prisma.storeProductListing.findUnique({
      where: { id: listingId },
      include: { store: { select: { countryCode: true } } }
    });

    if (!listing) {
      return res.status(404).json({ error: '未找到该商品的上架信息' });
    }
    
    const isAdmin = role === 'admin';
    const isSupervisor = supervisedCountries.includes(listing.store.countryCode);
    
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ error: '权限不足：您不是该国家的主管' });
    }
    
    // 3. (执行) 更新价格
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


module.exports = router;