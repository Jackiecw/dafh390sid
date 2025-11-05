// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); 
const authMiddleware = require('../authMiddleware'); 
const adminMiddleware = require('../adminMiddleware'); // ⬅️ (不变)

const router = express.Router();

// ⬇️ (不变) 获取所有周报 (仅限 Admin)
// 路径: GET /api/reports
router.get('/reports', adminMiddleware, async (req, res) => {
  try {
    const reports = await prisma.weeklyReport.findMany({
      orderBy: {
        weekStartDate: 'desc', // 按周开始日期倒序
      },
      include: {
        author: { // 包含提交周报的作者
          select: {
            nickname: true, // 只选择我们需要的“昵称”
          }
        }
      }
    });
    res.json(reports);
  } catch (error) {
    console.error('获取周报列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// (不变) 接口 3: (GET) 获取当前登录的用户信息
// 路径: GET /api/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true 
      }
    });
    if (!user) {
      return res.status(404).json({ error: '用户未找到' });
    }
    // (我们在这里即时注入 role.name)
    // 注意：这个接口在您的项目中已过时 (V5)，
    // 因为 /api/login 返回的 Token 已经包含了昵称和权限
    // 但我们暂时保留它
    const detailedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    });
    res.json({
        id: detailedUser.id,
        username: detailedUser.username,
        nickname: detailedUser.nickname,
        role: detailedUser.role.name // 确保返回的是 'admin' 或 'operation'
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ⬇️ 【重大修改】接口 4: (POST) 提交销售数据 (受保护)
// 路径: POST /api/sales
router.post('/sales', authMiddleware, async (req, res) => {
  try {
    // ⬇️ 【修改 1/3】
    const { 
      recordDate, storeId, productId, // ⬅️ 新增 productId
      salesVolume, revenue 
      // adSpend // ⬅️ 删除 adSpend
    } = req.body;

    // ⬇️ 【修改 2/3】
    if (!recordDate || !storeId || !productId || !salesVolume || !revenue) {
      return res.status(400).json({ error: '日期、店铺、商品、销量和销售额是必填项' });
    }
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
      data: {
        recordDate: new Date(recordDate),
        salesVolume: parseInt(salesVolume),
        revenue: parseFloat(revenue),
        // adSpend: parseFloat(adSpend || 0), // ⬅️ 删除 adSpend
        enteredById: userId, 
        storeId: storeId,
        productId: productId, // ⬅️ 新增 productId
      }
    });
    res.status(201).json(newSalesData);
  } catch (error) {
    console.error('提交销售数据失败:', error);
    // (新增) 检查 storeId 是否有效
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: '提交失败：所选的店铺 (Store) 无效或不存在' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (不变) 接口 5: (POST) 提交周报 (受保护)
// 路径: POST /api/reports
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

// --- ⬇️ 【新增】 获取特定店铺可销售的商品 (受保护) ---

// (GET /api/stores/:id/products)
// (注意：这个不在 /admin 路径下，但同样需要登录)
router.get('/stores/:id/products', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: id },
      include: {
        products: {
          select: { id: true, sku: true, name: true },
          orderBy: { sku: 'asc' }
        }
      }
    });

    if (!store) {
      return res.status(404).json({ error: '店铺未找到' });
    }
    // 只返回商品列表
    res.json(store.products);

  } catch (error) {
    res.status(500).json({ error: '获取店铺商品失败' });
  }
});

module.exports = router;