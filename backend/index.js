// ./backend/index.js

// 1. (关键) 在所有代码之前加载 .env 环境变量
require('dotenv').config();

// 2. 导入“零件”
const express = require('express');
const cors = require('cors');
const path = require('path'); 
const fs = require('fs'); //

// (新增) 导入我们分离出去的路由文件
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');
const managementRoutes = require('./routes/management');
const productRoutes = require('./routes/products'); 
const profileRoutes = require('./routes/profile'); 
const operationRoutes = require('./routes/operation');
const financeRoutes = require('./routes/finance');
const logisticsRoutes = require('./routes/logistics');
const storeListingsRoutes = require('./routes/storeListings');

// 3. 初始化
const app = express();

// 4. 配置“中间件” (Middleware)
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 允许 Express 解析 JSON 格式的请求体

// (不变) 开放整个 /uploads 目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// 5. 健康检查路由 (保留这个，用于测试服务器是否启动)
app.get('/', (req, res) => {
  res.send('后端 API 服务器正在运行！地基已打好！');
});

// ------------------------------------------
// --- 挂载 API 路由 ---
// ------------------------------------------

// (非 Admin 路由)
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', profileRoutes);

// (Admin 路由)
app.use('/api/admin', adminRoutes);
app.use('/api/admin', managementRoutes);
app.use('/api/admin', productRoutes); 
app.use('/api/admin', storeListingsRoutes);


app.use('/api', operationRoutes);
app.use('/api', financeRoutes);
app.use('/api', logisticsRoutes);

// 6. 启动服务器
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; 

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器已启动，正在监听所有网络...`);
  console.log(`   - 本机访问: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ 服务器启动失败:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请修改环境变量 PORT 或释放该端口。`);
  } else if (error.code === 'EACCES') {
    console.error(`权限不足：无法监听端口 ${PORT}，请使用更高的端口或调整权限。`);
  }
  process.exit(1);
});

