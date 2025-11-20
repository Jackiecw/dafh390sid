// ./backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { z } = require('zod');
const loginRateLimiter = require('../loginRateLimiter');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// (不变) registerSchema
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少需要3个字符"),
  password: z.string().min(8, "密码至少需要8个字符"),
  nickname: z.string().min(1, "昵称不能为空"),
});

// (不变) loginSchema
const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空")
});

// (不变) 接口 1: (POST) 用户注册
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: '输入数据无效',
        details: validation.error.errors
      });
    }

    const { username, password, nickname } = validation.data;

    const operationRole = await prisma.role.findUnique({
      where: { name: 'operation' },
    });

    if (!operationRole) {
      console.error('注册失败：未找到默认的 "operation" 角色');
      return res.status(500).json({ error: '服务器配置错误：无法分配角色' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username,
        passwordHash: hashedPassword,
        nickname: nickname,
        role: {
          connect: { id: operationRole.id },
        },
      },
    });

    const { passwordHash, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);

  } catch (error) {
    if (error.code === 'P2002' && error.meta.target.includes('username')) {
      return res.status(400).json({ error: '此用户名已被占用' });
    }
    console.error('注册失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// 接口 2: (POST) 用户登录
// ⬇️ 【重大修改】
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    // 1. (不变) 验证输入
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: '输入数据无效',
        details: validation.error.errors
      });
    }

    const { username, password } = validation.data;

    // 2. 【修改】 包含 supervisedCountries
    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        role: { 
          include: {
            menus: true 
          }
        },
        operatedCountries: { 
          select: { code: true }
        },
        supervisedCountries: { // ⬅️ 【新增】
          select: { code: true }
        }
      }
    });

    // 3. (不变) 验证用户是否存在
    if (!user) {
      return res.status(401).json({ error: '认证失败：用户不存在' });
    }

    // 4. (不变) 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '认证失败：密码错误' });
    }

    // 5. 【修改】生成新的 JWT Token 负载 (Payload)
    
    // (A) (不变) 提取菜单权限
    const permissions = user.role.menus.map(menu => menu.key);

    // (B) (不变) 提取国家权限
    const operatedCountries = user.operatedCountries.map(country => country.code);

    // (C) ⬅️ 【新增】 提取主管国家权限
    const supervisedCountries = user.supervisedCountries.map(country => country.code);

    // (D) 创建 Token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role.name, 
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        permissions: permissions, 
        operatedCountries: operatedCountries,
        supervisedCountries: supervisedCountries // ⬅️ 【新增】
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. (不变) 把通行证发回给前端
    res.json({ 
      message: '登录成功!',
      token: token
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
