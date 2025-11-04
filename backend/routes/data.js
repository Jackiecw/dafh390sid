// ./backend/routes/data.js

const express = require('express');
const prisma = require('../prismaClient'); // ⬅️ 导入共享的 prisma 实例
const authMiddleware = require('../authMiddleware'); // ⬅️ 导入“检查站”

const router = express.Router();

// ⬇️⬇️⬇️ 注意 ⬇️⬇️⬇️
// 所有这些路由都会自动使用 authMiddleware，因为我们在 index.js 中会这样设置
// （或者，您也可以像下面这样在每个路由上手动添加 authMiddleware）

// 接口 3: (GET) 获取当前登录的用户信息
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
    res.json(user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 接口 4: (POST) 提交销售数据 (受保护)
// 路径: POST /api/sales
router.post('/sales', authMiddleware, async (req, res) => {
  try {
    const { 
      recordDate, platform, storeName, country, productSku, 
      salesVolume, revenue, adSpend 
    } = req.body;

    if (!recordDate || !platform || !storeName || !country || !salesVolume || !revenue) {
      return res.status(400).json({ error: '日期、平台、店铺、国家、销量和销售额是必填项' });
    }
    const userId = req.user.userId;

    const newSalesData = await prisma.salesData.create({
      data: {
        recordDate: new Date(recordDate),
        platform: platform,
        storeName: storeName,
        country: country,
        productSku: productSku || null,
        salesVolume: parseInt(salesVolume),
        revenue: parseFloat(revenue),
        adSpend: parseFloat(adSpend || 0),
        enteredById: userId, 
      }
    });
    res.status(201).json(newSalesData);
  } catch (error) {
    console.error('提交销售数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 接口 5: (POST) 提交周报 (受保护)
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

module.exports = router; // ⬅️ 导出路由