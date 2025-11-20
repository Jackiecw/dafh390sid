// ./backend/index.js

// 1. (关键) 在所有代码之前加载 .env 环境变量
const path = require('path');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '.env'),
];

envFiles.forEach((envPath) => {
  dotenv.config({ path: envPath});
});

// 2. 导入依赖
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { randomUUID } = require('crypto');

// 路由注册器与配置
const registerRoutes = require('./routes');
const config = require('./config');
const logger = require('./logger');

// 3. 初始化
const app = express();

// 4. 配置中间件
app.use(helmet());
app.use(cors());
app.use(express.json());

// 为每个请求注入 Request ID
app.use((req, res, next) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// 简单请求日志，方便排查
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('HTTP request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  next();
});

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/', (req, res) => {
  res.send('后端 API 服务器正在运行！地基已打好！');
});

// 挂载路由
registerRoutes(app);

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('未捕获的路由错误', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 6. 启动服务器
const server = app.listen(config.PORT, config.HOST, () => {
  logger.info('🚀 服务器已启动，正在监听所有网络...');
  logger.info(`   - 本机访问: http://localhost:${config.PORT}`);
});

server.on('error', (error) => {
  logger.error('❌ 服务器启动失败', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`端口 ${config.PORT} 已被占用，请修改环境变量 PORT 或释放该端口。`);
  } else if (error.code === 'EACCES') {
    logger.error(`权限不足：无法监听端口 ${config.PORT}，请使用更高的端口或调整权限。`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise 拒绝', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', error);
});
