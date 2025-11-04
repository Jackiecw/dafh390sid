// ./backend/index.js

// 1. (关键) 在所有代码之前加载 .env 环境变量
require('dotenv').config();

// 2. 导入“零件”
const express = require('express');
const cors = require('cors');

// (新增) 导入我们分离出去的路由文件
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');
const managementRoutes = require('./routes/management');

// 3. 初始化
const app = express();

// 4. 配置“中间件” (Middleware)
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 允许 Express 解析 JSON 格式的请求体




// 5. 健康检查路由 (保留这个，用于测试服务器是否启动)
app.get('/', (req, res) => {
  res.send('后端 API 服务器正在运行！地基已打好！');
});

// ------------------------------------------
// --- 挂载 API 路由 ---
// ------------------------------------------

// 告诉 Express：
// - 任何以 /api 开头的请求，都转到 authRoutes 文件去匹配
//   (例如: /api/register, /api/login)
app.use('/api', authRoutes);

// - 如果 authRoutes 中没有匹配到，再转到 dataRoutes 文件去匹配
//   (例如: /api/me, /api/sales, /api/reports)
app.use('/api', dataRoutes);

// ⬇️ 告诉 Express，所有 adminRoutes 里的路由都以 /api/admin 开头
app.use('/api/admin', adminRoutes);

app.use('/api/admin', managementRoutes);

// (注意：所有旧的 app.post 和 app.get 路由都已被删除)

// 6. 启动服务器
const PORT = 3000;
const HOST = '0.0.0.0'; // ⬅️ 【新增】监听所有网络接口

app.listen(PORT, HOST, () => { // ⬅️ 【修改】添加 HOST
  console.log(`🚀 服务器已启动，正在监听所有网络...`);
  console.log(`   - 本机访问: http://localhost:${PORT}`);
  console.log(`   - 局域网访问: http://192.168.110.221:${PORT}`); // ⬅️ (这是您自己的 IP)
});