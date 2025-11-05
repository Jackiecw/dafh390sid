// ./backend/routes/products.js
const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ProductCategory } = require('@prisma/client');

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

// --- 2. Zod 验证模式 (修改) ---
const productSchema = z.object({
  sku: z.string().min(1, "SKU 不能为空"),
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  cost: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  weightKg: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  volumeM3: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  dimensionsMm: z.string().optional().nullable(), // ⬅️ 【新增】
});

// (不变) 价格同步 Zod
const priceSyncSchema = z.object({
  currentPrice: z.coerce.number().min(0, "价格不能为负数")
});


// --- 3. Product CRUD 路由 (全部受 Admin 保护) ---
router.use(adminMiddleware);

// GET /api/admin/products (不变)
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

// GET /api/admin/product-options (不变)
router.get('/product-options', (req, res) => {
  res.json({
    categories: Object.values(ProductCategory),
  });
});

// POST /api/admin/products (不变)
// (此路由逻辑不需要修改，因为它使用 ...validation.data 自动包含了新字段)
router.post('/products', upload.single('productImage'), async (req, res) => {
  try {
    // 1. 验证文本数据
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    // 2. 检查 SKU 是否唯一
    const { sku, ...data } = validation.data;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '此 SKU 已被占用' });
    }

    // 3. 准备数据库 payload
    const payload = { ...data, sku: sku, }; // ⬅️ 'data' 中已包含新字段
    
    // 4. (关键) 处理图片路径
    if (req.file) {
      payload.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // 5. 创建商品
    const newProduct = await prisma.product.create({ data: payload });
    res.status(201).json(newProduct);

  } catch (error) {
    console.error('创建商品失败:', error);
    if (req.file) fs.unlinkSync(req.file.path); // 出错时删除文件
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/admin/products/:id (不变)
// (此路由逻辑也不需要修改)
router.put('/products/:id', upload.single('productImage'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. 验证文本数据
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }

    // 2. 检查 SKU (如果 SKU 被修改了)
    const { sku, ...data } = validation.data;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '此 SKU 已被其他商品占用' });
    }

    // 3. 准备 payload
    const payload = { ...data, sku: sku }; // ⬅️ 'data' 中已包含新字段

    // 4. (关键) 处理图片更新
    if (req.file) {
      // 上传了新图片，准备替换
      payload.imageUrl = `/uploads/products/${req.file.filename}`;
      
      // (可选但推荐) 删除旧图片
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
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/admin/products/:id (不变)
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 删除前先删除图片
    const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
    if (product && product.imageUrl) {
      const oldPath = path.join(__dirname, '..', product.imageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    await prisma.product.delete({ where: { id } });
    res.status(204).send(); // 204 No Content

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '商品未找到' });
    }
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '删除失败：该商品已有销售数据关联，无法删除' });
    }
    res.status(500).json({ error: '删除商品失败' });
  }
});


// ----------------------------------------------------
// --- (不变) "在售商品" 模块 API ---
// ----------------------------------------------------

/**
 * GET /api/admin/products-list (获取商品卡片 + 售价详情)
 */
router.get('/products-list', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { sku: 'asc' },
      // ⬇️ 【修改】
      // 默认的 findMany (不带 select) 会返回所有字段
      // (包括我们新增的 weightKg, volumeM3, dimensionsMm)
      // 所以这里的 include 逻辑保持不变
      // ⬆️ 【修改】
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

/**
 * PUT /api/admin/listings/:id (价格同步)
 */
router.put('/listings/:id', async (req, res) => {
  try {
    const { id: listingId } = req.params;
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