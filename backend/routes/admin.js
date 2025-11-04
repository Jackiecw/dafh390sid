// ./backend/routes/admin.js

const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const router = express.Router();
router.use(adminMiddleware); // (不变) 应用“管理员守卫”

// -----------------------------------------------------------------
// --- Zod 验证模式 ---
// -----------------------------------------------------------------

// (不变) "创建用户" 模式
const userCreateSchema = z.object({
  username: z.string().min(3, "用户名至少需要3个字符"),
  password: z.string().min(8, "密码至少需要8个字符"),
  nickname: z.string().min(1, "昵称不能为空"),
  roleId: z.string().min(1, "必须选择一个角色"),
});

// (不变) "更新用户" 模式
const userUpdateSchema = z.object({
  nickname: z.string().min(1, "昵称不能为空"),
  roleId: z.string().min(1, "必须选择一个角色"),
});

// (不变) "创建/更新角色" 模式
const roleSchema = z.object({
  name: z.string().min(2, "角色名 (key) 至少需要2个字符"),
  description: z.string().min(1, "角色描述不能为空"),
  menuIds: z.array(z.string()).default([]), 
});


// -----------------------------------------------------------------
// --- 用户管理 API (Users) ---
// -----------------------------------------------------------------

// 【修改】 移除了 '/admin' 前缀
router.get('/users', async (req, res) => { 
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    const usersWithoutPassword = users.map(user => {
      const { passwordHash, ...userSafe } = user;
      return userSafe;
    });
    res.json(usersWithoutPassword);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 【修改】 移除了 '/admin' 前缀
router.get('/users/:id', async (req, res) => { 
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { 
        id: true,
        username: true,
        nickname: true,
        roleId: true,
      }
    });
    if (!user) { return res.status(404).json({ error: '用户未找到' }); }
    res.json(user);
  } catch (error) {
    console.error('获取单个用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 【修改】 移除了 '/admin' 前缀
router.post('/users', async (req, res) => { 
  try {
    const validation = userCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    const { username, password, nickname, roleId } = validation.data;
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) { return res.status(400).json({ error: '此用户名已被占用' }); }
    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) { return res.status(400).json({ error: '所选角色无效' }); }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: username,
        passwordHash: hashedPassword,
        nickname: nickname,
        role: { connect: { id: roleId } },
      },
      include: { role: true }
    });
    const { passwordHash, ...userSafe } = newUser;
    res.status(201).json(userSafe);
  } catch (error) {
    if (error.code === 'P2002' && error.meta.target.includes('username')) {
      return res.status(400).json({ error: '此用户名已被占用' });
    }
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 【修改】 移除了 '/admin' 前缀
router.put('/users/:id', async (req, res) => { 
  try {
    const { id } = req.params;
    const validation = userUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    const { nickname, roleId } = validation.data;
    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) { return res.status(400).json({ error: '所选角色无效' }); }
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        nickname: nickname,
        roleId: roleId,
      },
      include: { role: true }
    });
    const { passwordHash, ...userSafe } = updatedUser;
    res.json(userSafe);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '用户未找到' });
    }
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// -----------------------------------------------------------------
// --- 角色管理 API (Roles) ---
// -----------------------------------------------------------------

// 【修改】 移除了 '/admin' 前缀
router.get('/roles', async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(roles);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 【修改】 移除了 '/admin' 前缀
router.post('/roles', async (req, res) => {
  try {
    const validation = roleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { name, description, menuIds } = validation.data;

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return res.status(400).json({ error: '此角色名 (key) 已被占用' });
    }
    
    const newRole = await prisma.role.create({
      data: {
        name: name,
        description: description,
        menus: {
          connect: menuIds.map(id => ({ id: id })),
        },
      },
      include: {
        menus: true 
      }
    });
    
    res.status(201).json(newRole);

  } catch (error) {
    if (error.code === 'P2002' && error.meta.target.includes('name')) {
      return res.status(400).json({ error: '此角色名 (key) 已被占用' });
    }
    console.error('创建角色失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// 【修改】 移除了 '/admin' 前缀
router.get('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id: id },
      include: {
        menus: true, 
      },
    });

    if (!role) {
      return res.status(404).json({ error: '角色未找到' });
    }

    res.json(role);

  } catch (error) {
    console.error('获取单个角色失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 【修改】 移除了 '/admin' 前缀
router.put('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const validation = roleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }

    const { name, description, menuIds } = validation.data;

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole && existingRole.id !== id) {
      return res.status(400).json({ error: '此角色名 (key) 已被其他角色占用' });
    }
    
    const updatedRole = await prisma.role.update({
      where: { id: id },
      data: {
        name: name,
        description: description,
        menus: {
          set: menuIds.map(id => ({ id: id })),
        },
      },
      include: {
        menus: true 
      }
    });

    res.json(updatedRole);

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '角色未找到' });
    }
    console.error('更新角色失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// -----------------------------------------------------------------
// --- 菜单项 API (Menu Items) ---
// -----------------------------------------------------------------

// 【修改】 移除了 '/admin' 前缀
router.get('/menu-items', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      orderBy: {
        key: 'asc',
      },
    });
    res.json(menuItems);
  } catch (error) {
    console.error('获取菜单项列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;