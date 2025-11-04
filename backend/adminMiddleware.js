// ./backend/adminMiddleware.js

const authMiddleware = require('./authMiddleware');

// adminMiddleware 是一个“增强型”的守卫
// 它首先运行常规的 authMiddleware，然后再添加一个额外的检查
const adminMiddleware = (req, res, next) => {
  
  // 1. 先运行“登录检查站” (authMiddleware)
  authMiddleware(req, res, () => {
    
    // 2. 如果登录检查通过了，我们现在可以安全地访问 req.user
    //    (这是 authMiddleware 附加给我们的)
    //    现在我们执行“角色检查站”
    
    if (req.user && req.user.role === 'admin') {
      
      // 3. (成功) 这个人既登录了，也是 admin。放行！
      next();
      
    } else {
      
      // 4. (失败) 这个人登录了，但不是 admin
      // 403 = Forbidden (禁止访问)
      return res.status(403).json({ 
        error: '禁止访问：您没有管理员权限' 
      });
    }
  });
};

module.exports = adminMiddleware;