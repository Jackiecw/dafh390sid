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

// --- 1. Multer (文件上传) 配置 ---

// 确保 uploads/products 目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

// 配置存储引擎
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 创建一个唯一的文件名: sku-timestamp.ext
    const sku = req.body.sku || 'temp';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${sku.replace(/[/\\?%*:|"<>]/g, '_')}-${timestamp}${extension}`);
  }
});

// 文件过滤器，只接受图片
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
const productSchema = z.object({
  sku: z.string().min(1, "SKU 不能为空"),
  name: z.string().min(1, "商品名称不能为空"),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  cost: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
  weightKg: z.preprocess(val => parseFloat(val) || null, z.number().optional().nullable()),
});

// --- 3. Product CRUD 路由 (全部受 Admin 保护) ---
router.use(adminMiddleware);

// GET /api/admin/products (获取所有商品)
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

// GET /api/admin/product-options (用于下拉菜单)
// (我们顺便添加一个给表单用的选项接口)
router.get('/product-options', (req, res) => {
  res.json({
    categories: Object.values(ProductCategory),
  });
});

// POST /api/admin/products (创建新商品)
router.post('/products', upload.single('productImage'), async (req, res) => {
  try {
    // 1. 验证文本数据
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      // 如果验证失败，且已上传了文件，则删除该文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
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
    const payload = {
      ...data,
      sku: sku,
    };
    
    // 4. (关键) 处理图片路径
    if (req.file) {
      // 我们只存储相对路径
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

// PUT /api/admin/products/:id (更新商品)
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
    const payload = { ...data, sku: sku };

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

// DELETE /api/admin/products/:id (删除商品)
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // (注意：如果商品已有销售数据，直接删除可能会失败)
    // (更安全的做法是设置一个 'status' 字段为 'ARCHIVED')
    // (但按我们当前的 schema，我们先尝试直接删除)
    
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
    if (error.code === 'P2003') { // (外键约束失败)
      return res.status(400).json({ error: '删除失败：该商品已有销售数据关联，无法删除' });
    }
    res.status(500).json({ error: '删除商品失败' });
  }
});

module.exports = router;