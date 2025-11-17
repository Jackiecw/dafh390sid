// ./backend/routes/datahelpers.js
const axios = require('axios');
const prisma = require('../prismaClient'); // (需要 prisma 来获取周报)

// --- 汇率缓存 ---
let ratesCache = {
  data: null,
  lastFetched: 0,
};
const CACHE_DURATION = 1000 * 60 * 60; // 1 小时
const currencySymbols = {
  CNY: '¥', USD: '$', IDR: 'Rp', VND: '₫', THB: '฿', MYR: 'RM', PHP: '₱', SGD: 'S$'
};
const countryCurrencyMap = {
  ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD',
};

// --- 日期辅助函数 (东八区 - 不变) ---
const getTimeZoneDate = () => {
  return new Date();
};
const getStartOfToday = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const getStartOfWeek = () => {
  const now = getStartOfToday();
  const day = now.getDay(); 
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  return new Date(now.setDate(diff));
};
const getStartOfMonth = () => {
  const now = getTimeZoneDate();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// (依赖 prisma)
async function getPlanPreviewForWeek(userId, currentWeekStart) {
  const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastReport = await prisma.weeklyReport.findFirst({
    where: {
      authorId: userId,
      weekStartDate: {
        gte: previousWeekStart,
        lt: currentWeekStart,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { planNextWeek: true },
  });
  return lastReport?.planNextWeek || null;
}

/**
 * 【辅助函数】获取并缓存汇率
 */
async function getRates() {
  const now = Date.now();
  if (ratesCache.data && (now - ratesCache.lastFetched < CACHE_DURATION)) {
    return ratesCache.data;
  }
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      // (重要) 在开发中，如果没 key，返回一个模拟数据
      console.warn('未配置汇率 API 密钥，将使用模拟数据');
      ratesCache.data = {
        CNY_USD: 0.14, CNY_IDR: 2300, CNY_VND: 3500, CNY_THB: 5,
        CNY_MYR: 0.65, CNY_PHP: 8, CNY_SGD: 0.19,
      };
      ratesCache.lastFetched = now;
      return ratesCache.data;
    }
    
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`);
    
    if (response.data && response.data.result === 'success') {
      const rates = response.data.conversion_rates;
      ratesCache.data = {
        CNY_USD: rates.USD, CNY_IDR: rates.IDR, CNY_VND: rates.VND,
        CNY_THB: rates.THB, CNY_MYR: rates.MYR, CNY_PHP: rates.PHP,
        CNY_SGD: rates.SGD,
      };
      ratesCache.lastFetched = now;
      console.log('汇率缓存已更新');
      return ratesCache.data;
    } else {
      throw new Error('汇率 API 响应失败');
    }
  } catch (error) {
    console.error('获取汇率失败:', error.message);
    // (如果 API 失败，返回模拟数据)
    return {
      CNY_USD: 0.14, CNY_IDR: 2300, CNY_VND: 3500, CNY_THB: 5,
      CNY_MYR: 0.65, CNY_PHP: 8, CNY_SGD: 0.19,
    };
  }
}

// 导出所有需要复用的函数和常量
module.exports = {
  getRates,
  countryCurrencyMap,
  currencySymbols,
  getStartOfToday,
  getStartOfWeek,
  getStartOfMonth,
  getPlanPreviewForWeek
};