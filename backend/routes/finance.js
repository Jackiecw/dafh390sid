// ./backend/routes/finance.js

const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');
const { PaymentMethod, InvoiceStatus } = require('@prisma/client');
const multer = require('multer'); // ⬅️ 导入 Multer
const xlsx = require('xlsx');     // ⬅️ 导入 XLSX
const fs = require('fs');         // ⬅️ 导入 File System
const path = require('path');     // ⬅️ 导入 Path

const router = express.Router();

// --- 1. Multer (Excel 上传) 配置 ---
// (我们将其存储在临时目录中)
const tempUploadDir = path.join(__dirname, '..', 'uploads', 'temp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
    file.mimetype === 'application/vnd.ms-excel' // .xls
  ) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 Excel 文件! (.xlsx, .xls)'), false);
  }
};

// (为 Excel 创建一个专用的 upload 实例)
const upload = multer({ 
  storage: excelStorage, 
  fileFilter: excelFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // 限制 10MB
});


// --- Zod 验证模式 (不变) ---

// (用于创建)
const expenseSchema = z.object({
  expenseDate: z.string().date("日期格式无效"),
  itemDescription: z.string().min(1, "项目描述不能为空"),
  amount: z.coerce.number().min(0, "金额必须为正数"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  payer: z.string().min(1, "付款方不能为空"),
  payee: z.string().min(1, "收款方不能为空"),
  invoiceStatus: z.nativeEnum(InvoiceStatus),
  isAdvancePayment: z.boolean().default(false),
  reimbursementDate: z.string().date().optional().nullable(),
  storeId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// (用于更新 - 所有字段可选)
const partialExpenseSchema = z.object({
  expenseDate: z.string().date("日期格式无效").optional(), 
  itemDescription: z.string().min(1, "项目描述不能为空").optional(),
  amount: z.coerce.number().min(0, "金额必须为正数").optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  payer: z.string().min(1, "付款方不能为空").optional(),
  payee: z.string().min(1, "收款方不能为空").optional(),
  invoiceStatus: z.nativeEnum(InvoiceStatus).optional(),
  isAdvancePayment: z.boolean().optional(),
  reimbursementDate: z.string().date().optional().nullable(),
  storeId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});


// --- 权限辅助函数 (不变) ---
async function checkExpensePermission(userId, expenseId) {
  // ... (代码不变)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } }, supervisedCountries: { select: { code: true } } }
  });

  if (!user) {
    return { canManage: false, error: '用户未找到', status: 404 };
  }
  
  if (user.role.name === 'admin') {
    return { canManage: true };
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { store: { select: { countryCode: true } } }
  });

  if (!expense) {
    return { canManage: false, error: '支出数据未找到', status: 404 };
  }

  // 如果支出没有归属店铺 (storeId is null)，则只有 Admin 能管
  if (!expense.store) {
    return { canManage: false, error: '权限不足：此为公司级支出', status: 403 };
  }

  // 检查是否为国家主管
  const supervisedCodes = user.supervisedCountries.map(c => c.code);
  if (supervisedCodes.includes(expense.store.countryCode)) {
    return { canManage: true };
  }
  
  return { canManage: false, error: '权限不足：您不是该国家的主管', status: 403 };
}


// --- 路由 ---

/**
 * (公共) GET /api/expenses/options (不变)
 */
router.get('/expenses/options', authMiddleware, (req, res) => {
  // ... (代码不变)
  res.json({
    paymentMethods: Object.values(PaymentMethod),
    invoiceStatuses: Object.values(InvoiceStatus),
  });
});

/**
 * (用户) POST /api/expenses (不变)
 * 录入一条新的支出
 */
router.post('/expenses', authMiddleware, async (req, res) => {
  // ... (代码不变)
  try {
    const { userId } = req.user;
    const validation = expenseSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const data = validation.data;

    const newExpense = await prisma.expense.create({
      data: {
        ...data,
        expenseDate: new Date(data.expenseDate),
        reimbursementDate: data.reimbursementDate ? new Date(data.reimbursementDate) : null,
        notes: data.notes || null,
        storeId: data.storeId || null,
        enteredById: userId, // 关键：设置录入人
      }
    });
    res.status(201).json(newExpense);
    
  } catch (error) {
    console.error('录入支出失败:', error);
    if (error.code === 'P2003' && error.meta.target.includes('storeId')) {
      return res.status(400).json({ error: '所选的归属店铺无效' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ⬇️ --- 【新增：批量导入 API】 ---
/**
 * (管理员) POST /api/admin/expenses/import
 * 批量导入支出
 */
router.post('/admin/expenses/import', adminMiddleware, upload.single('expenseFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未找到上传的 Excel 文件' });
  }

  // (缓存) 提前获取所有店铺，用于名称 -> ID 转换
  let storeMap = new Map();
  try {
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    stores.forEach(store => storeMap.set(store.name, store.id));
  } catch (e) {
    return res.status(500).json({ error: '无法加载店铺列表用于匹配' });
  }

  const { userId } = req.user;
  const filePath = req.file.path;
  
  let importedCount = 0;
  let failedRows = [];

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // (header: 1 自动将第一行作为键名)
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length <= 1) { // 只有表头
      return res.status(400).json({ error: '文件为空或只有表头' });
    }
    
    // (Excel 日期处理)
    const parseExcelDate = (excelDate) => {
      if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      return excelDate; // 假定已经是 YYYY-MM-DD 字符串
    };

    // (中文 -> 英文 翻译)
    const paymentMethodMap = { '支付宝': 'ALIPAY', '微信支付': 'WECHAT_PAY', '银行转账': 'BANK_TRANSFER', '信用卡': 'CREDIT_CARD', '现金': 'CASH', '其他': 'OTHER' };
    const invoiceStatusMap = { '无票': 'NONE', '普票': 'REGULAR', '专票': 'SPECIAL' };

    // 1. 提取表头
    const headers = rows[0];
    const headerMap = {
      '支出日期': 'expenseDate',
      '项目描述': 'itemDescription',
      '金额': 'amount',
      '付款方式': 'paymentMethod',
      '付款方': 'payer',
      '收款方': 'payee',
      '票据状态': 'invoiceStatus',
      '是否垫付(Y/N)': 'isAdvancePayment',
      '归属店铺名称': 'storeName', // (我们将用它来查找 storeId)
      '备注': 'notes',
      '报销日期': 'reimbursementDate',
    };

    const dataRows = rows.slice(1);
    const recordsToCreate = [];

    // 2. 遍历数据行
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length === 0) continue; // 跳过空行

      let record = {};
      let hasError = false;

      // 3. 映射 (Excel 列 -> JSON 对象)
      headers.forEach((header, index) => {
        const prismaKey = headerMap[header];
        if (prismaKey) {
          record[prismaKey] = row[index];
        }
      });

      // 4. 数据清洗和转换
      try {
        // (日期)
        record.expenseDate = parseExcelDate(record.expenseDate);
        if (record.reimbursementDate) {
          record.reimbursementDate = parseExcelDate(record.reimbursementDate);
        }
        
        // (枚举)
        record.paymentMethod = paymentMethodMap[record.paymentMethod] || 'OTHER';
        record.invoiceStatus = invoiceStatusMap[record.invoiceStatus] || 'NONE';
        
        // (布尔值)
        const adv = record.isAdvancePayment ? record.isAdvancePayment.toUpperCase() : 'N';
        record.isAdvancePayment = (adv === 'Y' || adv === 'YES' || adv === '是');

        // (店铺)
        if (record.storeName && storeMap.has(record.storeName)) {
          record.storeId = storeMap.get(record.storeName);
        } else {
          record.storeId = null; // (设为 null，而不是 undefined)
        }
        
        // (Zod 验证)
        const validation = expenseSchema.safeParse(record);
        if (!validation.success) {
          throw new Error(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
        }

        // (添加系统字段)
        validation.data.enteredById = userId;
        validation.data.expenseDate = new Date(validation.data.expenseDate); // 转为 Date 对象
        validation.data.reimbursementDate = validation.data.reimbursementDate ? new Date(validation.data.reimbursementDate) : null;
        validation.data.storeId = validation.data.storeId || null;
        
        recordsToCreate.push(validation.data);
      
      } catch (err) {
        failedRows.push({ row: i + 2, error: err.message }); // (行号 i + 2 = Excel 行号)
      }
    }

    // 5. 批量创建
    if (recordsToCreate.length > 0) {
      const result = await prisma.expense.createMany({
        data: recordsToCreate,
      });
      importedCount = result.count;
    }

    res.json({
      message: '导入完成',
      importedCount: importedCount,
      failedCount: failedRows.length,
      failedRows: failedRows
    });

  } catch (error) {
    console.error('批量导入失败:', error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  } finally {
    // 6. (重要) 删除临时文件
    fs.unlink(filePath, (err) => {
      if (err) console.error("删除临时文件失败:", err);
    });
  }
});
// ⬆️ --- 【新增：批量导入 API】 ---


/**
 * (管理员) GET /api/admin/expenses (不变)
 * 查询支出列表 (带筛选)
 */
router.get('/admin/expenses', adminMiddleware, async (req, res) => {
  // ... (代码不变)
  try {
    const { role, operatedCountries, supervisedCountries } = req.user;
    
    const { 
      storeId, 
      startDate, endDate, 
      sortBy, sortOrder
    } = req.query;

    const where = {};

    // [权限] 非 Admin (虽然这是 admin 路由, 但未来可能开放给 finance 角色)
    if (role !== 'admin') {
      // 只能看自己主管的
      where.store = { 
        countryCode: { in: supervisedCountries }
      };
    }

    // [筛选]
    if (storeId) {
      where.storeId = storeId;
    }
    if (startDate && endDate) {
      where.expenseDate = { 
        gte: new Date(startDate), 
        // 包含结束日期当天
        lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) 
      };
    } else if (startDate) {
      where.expenseDate = { gte: new Date(startDate) };
    }

    // [排序]
    const orderBy = {};
    if (sortBy && (sortOrder === 'asc' || sortOrder === 'desc')) {
      if (['expenseDate', 'amount', 'createdAt'].includes(sortBy)) {
         orderBy[sortBy] = sortOrder;
      }
    } else {
      orderBy.expenseDate = 'desc'; // 默认
    }
    
    const expenses = await prisma.expense.findMany({
      where: where,
      orderBy: orderBy,
      include: {
        store: { 
          select: { name: true, countryCode: true }
        },
        enteredBy: { 
          select: { nickname: true }
        }
      }
    });
    
    // (附加权限信息，用于前端显示 "编辑/删除" 按钮)
    const isAdmin = role === 'admin';
    const response = expenses.map(ex => ({
      ...ex,
      canManage: isAdmin || (ex.store && supervisedCountries.includes(ex.store.countryCode))
    }));

    res.json(response);

  } catch (error) {
    console.error('获取支出列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * (管理员) PUT /api/admin/expenses/:id (不变)
 * 更新一条支出
 */
router.put('/admin/expenses/:id', adminMiddleware, async (req, res) => {
  // ... (代码不变)
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // 1. 检查权限 (Admin 或 主管)
    const { canManage, error, status } = await checkExpensePermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    // 2. 验证数据
    const validation = partialExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }

    const data = validation.data;
    
    // 3. 准备 payload (处理日期和 null)
    const payload = { ...data };
    if (data.expenseDate) payload.expenseDate = new Date(data.expenseDate);
    if (data.reimbursementDate) payload.reimbursementDate = new Date(data.reimbursementDate);
    else if (data.reimbursementDate === null) payload.reimbursementDate = null; // 允许清空
    
    if (data.storeId === null) payload.storeId = null; // 允许清空
    if (data.notes === null) payload.notes = null; // 允许清空

    const updatedExpense = await prisma.expense.update({
      where: { id: id },
      data: payload,
      include: {
        store: { select: { name: true, countryCode: true } },
        enteredBy: { select: { nickname: true } }
      }
    });

    res.json({
      ...updatedExpense,
      canManage: true // (既然能更新，权限自然是 true)
    });

  } catch (error) {
    console.error('更新支出失败:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: '数据未找到' });
    res.status(500).json({ error: '服务器内部错误' });
  }
});


/**
 * (管理员) DELETE /api/admin/expenses/:id (不变)
 * 删除一条支出
 */
router.delete('/admin/expenses/:id', adminMiddleware, async (req, res) => {
  // ... (代码不变)
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // 1. 检查权限
    const { canManage, error, status } = await checkExpensePermission(userId, id);
    if (!canManage) {
      return res.status(status).json({ error: error });
    }

    // 2. 执行删除
    await prisma.expense.delete({
      where: { id: id },
    });

    res.status(204).send();

  } catch (error) {
    console.error('删除支出失败:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: '数据未找到' });
    res.status(500).json({ error: '服务器内部错误' });
  }
});


module.exports = router;