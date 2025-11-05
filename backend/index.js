// ./backend/index.js

// 1. (关键) 在所有代码之前加载 .env 环境变量
require('dotenv').config();

// 2. 导入“零件”
const express = require('express');
const cors = require('cors');
const path = require('path'); // ⬅️ 【新增】 导入 path

// (新增) 导入我们分离出去的路由文件
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');
const managementRoutes = require('./routes/management');
const productRoutes = require('./routes/products'); 
const profileRoutes = require('./routes/profile'); // ⬅️ 【新增】 

// 3. 初始化
const app = express();

// 4. 配置“中间件” (Middleware)
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 允许 Express 解析 JSON 格式的请求体

// ⬇️ 【修改】 开放整个 /uploads 目录
// 这样 /uploads/products 和 /uploads/avatars 都能被访问
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
app.use('/api', profileRoutes); // ⬅️ 【新增】 (注意：没有 /admin 前缀)

// (Admin 路由)
app.use('/api/admin', adminRoutes);
app.use('/api/admin', managementRoutes);
app.use('/api/admin', productRoutes); 

// 6. 启动服务器
const PORT = 3000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => { 
  console.log(`🚀 服务器已启动，正在监听所有网络...`);
  console.log(`   - 本机访问: http://localhost:${PORT}`);
});