// ./backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { z } = require('zod');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// 【修改】1. registerSchema 不再需要 "role"
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少需要3个字符"),
  password: z.string().min(8, "密码至少需要8个字符"),
  nickname: z.string().min(1, "昵称不能为空"),
});

const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空")
});

// 接口 1: (POST) 用户注册
// 【重大修改】此接口现在默认将新用户创建为“运营专员”
router.post('/register', async (req, res) => {
  try {
    // 1. 验证输入 (schema 已更新，不含 role)
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: '输入数据无效',
        details: validation.error.errors
      });
    }

    const { username, password, nickname } = validation.data;

    // 2. 【新增】查找“运营专员”这个角色
    const operationRole = await prisma.role.findUnique({
      where: { name: 'operation' },
    });

    if (!operationRole) {
      // 如果 "operation" 角色在数据库中不存在 (seed 失败)
      console.error('注册失败：未找到默认的 "operation" 角色');
      return res.status(500).json({ error: '服务器配置错误：无法分配角色' });
    }

    // 3. (不变) 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. 【修改】创建新用户，并将其 roleId 关联到 "operation" 角色
    const newUser = await prisma.user.create({
      data: {
        username: username,
        passwordHash: hashedPassword,
        nickname: nickname,
        // (旧: role: role || 'OPERATION')
        // (新)
        role: {
          connect: { id: operationRole.id },
        },
      },
    });

    // 5. (不变) 返回用户信息
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
// 【重大修改】此接口现在返回带 "permissions" 数组的 Token
router.post('/login', async (req, res) => {
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

    // 2. 【修改】在数据库中查找用户，并【包含】其角色及角色的菜单
    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        role: { // 包含关联的 Role
          include: {
            menus: true // 包含该 Role 关联的所有 MenuItem
          }
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
    
    // (A) 从 user.role.menus 中提取所有菜单的 "key"
    const permissions = user.role.menus.map(menu => menu.key);

    // (B) 创建 Token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role.name, // ⬅️ (新) 使用角色的名字 (例如 "admin" 或 "operation")
        nickname: user.nickname,
        permissions: permissions // ⬅️ (新) 包含权限列表
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