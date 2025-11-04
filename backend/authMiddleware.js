// ./backend/authMiddleware.js

const jwt = require('jsonwebtoken');

// 1. 从 index.js 导入我们设置的“秘钥”
// (我们稍后会在 index.js 中导出它)
const JWT_SECRET = process.env.JWT_SECRET;

// 这就是我们的“中间件”函数
const authMiddleware = (req, res, next) => {
  // 1. 从请求的 "headers" (头部) 中寻找 "authorization"
  const authHeader = req.headers['authorization'];

  // 2. 检查 "authorization" 是否存在，并且格式是否正确 (Bearer TOKEN...)
  const token = authHeader && authHeader.split(' ')[1]; // 提取 'Bearer ' 后面的 Token

  if (token == null) {
    // 401 = Unauthorized (未授权)
    return res.status(401).json({ error: '认证失败：未提供 Token' });
  }

  // 3. (核心) 验证 Token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // 403 = Forbidden (禁止访问，Token 无效或过期)
      return res.status(403).json({ error: '认证失败：Token 无效或已过期' });
    }

    // 4. (成功) Token 是合法的！
    // 我们把 Token 解码后的用户信息(user) 附加到 "req" 对象上
    // 这样，后续的 API 接口就能知道“是谁”在请求
    req.user = user; 

    // 5. 放行，让请求继续前往它本想访问的 API 接口
    next(); 
  });
};

module.exports = authMiddleware;