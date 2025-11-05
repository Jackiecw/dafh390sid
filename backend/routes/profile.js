// ./backend/routes/profile.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { z } = require('zod');
const authMiddleware = require('../authMiddleware'); // ⬅️ (注意) 使用普通 auth, 不是 admin
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// --- 1. Multer (头像上传) 配置 ---

// 确保 uploads/avatars 目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 创建一个唯一的文件名: user-[userId]-[timestamp].ext
    const userId = req.user.userId; // (从 authMiddleware 获取)
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件!'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 2 } // 限制 2MB
});

// --- 2. Zod 验证模式 ---
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "必须提供旧密码"),
  newPassword: z.string().min(8, "新密码至少需要8个字符"),
});

const updateProfileSchema = z.object({
  nickname: z.string().min(1, "昵称不能为空"),
});


// --- 3. 路由 (全部受 authMiddleware 保护) ---

// POST /api/profile/change-password (修改密码)
router.post('/profile/change-password', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    
    // 1. 验证输入
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { oldPassword, newPassword } = validation.data;

    // 2. 验证旧密码
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { passwordHash: true } 
    });
    
    if (!user) return res.status(404).json({ error: '用户未找到' });
    
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '旧密码不正确' });
    }

    // 3. 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: '密码修改成功' });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// PUT /api/profile/update-details (修改昵称和/或头像)
router.put(
  '/profile/update-details', 
  authMiddleware, // 1. 验证登录
  upload.single('avatarImage'), // 2. 处理单文件上传
  async (req, res) => {
    try {
      const { userId } = req.user;
      
      // 1. 验证文本字段 (昵称)
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        // 如果验证失败，且已上传了文件，则删除该文件
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
      }
      
      const { nickname } = validation.data;
      const payload = { nickname };

      // 2. 查找旧头像 (用于删除)
      const oldUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      // 3. (关键) 处理新头像
      if (req.file) {
        payload.avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // (推荐) 删除旧头像文件
        if (oldUser && oldUser.avatarUrl) {
          const oldPath = path.join(__dirname, '..', oldUser.avatarUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
      
      // 4. 更新数据库
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: payload,
      });
      
      // 5. (核心) 重新生成 JWT Token
      //    因为 Token 中包含了 nickname 和 avatarUrl，必须刷新
      
      // 5a. 获取完整的权限信息 (同 /login 路由)
      const userWithRoles = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: { include: { menus: true } },
          operatedCountries: { select: { code: true } }
        }
      });
      
      const permissions = userWithRoles.role.menus.map(menu => menu.key);
      const operatedCountries = userWithRoles.operatedCountries.map(country => country.code);

      // 5b. 生成新 Token
      const newToken = jwt.sign(
        { 
          userId: updatedUser.id, 
          role: userWithRoles.role.name, 
          nickname: updatedUser.nickname,   // ⬅️ 使用新昵称
          avatarUrl: updatedUser.avatarUrl, // ⬅️ 使用新头像
          permissions: permissions, 
          operatedCountries: operatedCountries 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const { passwordHash, ...userSafe } = updatedUser;
      
      // 6. 返回新 Token 和新用户信息
      res.json({ 
        message: '个人资料更新成功',
        token: newToken,
        user: userSafe
      });

    } catch (error) {
      console.error('更新资料失败:', error);
      // 如果出错，删除已上传的文件
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
);


module.exports = router;