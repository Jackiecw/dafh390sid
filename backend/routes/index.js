// ./backend/routes/index.js

/**
 * 统一管理 API 路由挂载，防止入口文件变得臃肿。
 * 仅在这里维护路径前缀和模块映射，方便日后扩展。
 */
module.exports = function registerRoutes(app) {
  // 非 Admin 路由
  app.use('/api', require('./auth'));
  app.use('/api', require('./data'));
  app.use('/api', require('./profile'));

  // Admin 路由
  app.use('/api/admin', require('./admin'));
  app.use('/api/admin', require('./management'));
  app.use('/api/admin', require('./products'));
  app.use('/api/admin', require('./storeListings'));

  // 其他域模块
  app.use('/api', require('./operation'));
  app.use('/api', require('./finance'));
  app.use('/api', require('./logistics'));
};
