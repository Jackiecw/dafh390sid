// ./backend/routes/admin.js

const express = require('express');
const prisma = require('../prismaClient');
const adminMiddleware = require('../adminMiddleware');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const router = express.Router();
router.use(adminMiddleware); // (不变)

// -----------------------------------------------------------------
// --- Zod 验证模式 ---
// -----------------------------------------------------------------

// (不变) "创建用户" 模式
const userCreateSchema = z.object({
  username: z.string().min(3, "用户名至少需要3个字符"),
  password: z.string().min(8, "密码至少需要8个字符"),
  nickname: z.string().min(1, "昵称不能为空"),
  roleId: z.string().min(1, "必须选择一个角色"),
  supervisedCountryIds: z.array(z.string()).optional(), 
  operatedCountryIds: z.array(z.string()).optional(),   
});

// (不变) "更新用户" 模式
const userUpdateSchema = z.object({
  nickname: z.string().min(1, "昵称不能为空"),
  roleId: z.string().min(1, "必须选择一个角色"),
  supervisedCountryIds: z.array(z.string()).optional(), 
  operatedCountryIds: z.array(z.string()).optional(),   
});

// (不变) "创建/更新角色" 模式
const roleSchema = z.object({
  name: z.string().min(2, "角色名 (key) 至少需要2个字符"),
  description: z.string().min(1, "角色描述不能为空"),
  menuIds: z.array(z.string()).default([]), 
});

// (不变) "常用链接" 模式
const linkSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  url: z.string().url("必须是有效的 URL (例如: https://...)"),
  description: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
});

// ⬇️ --- 【新增】 "管理员指派日程" 模式 ---
const adminEventCreateSchema = z.object({
  // 事件内容
  title: z.string().min(1, "标题不能为空"),
  startAt: z.string().datetime("开始时间无效"),
  endAt: z.string().datetime("结束时间无效"),
  isAllDay: z.boolean().default(false),
  color: z.string().default('red'), // 管理员默认为红色
  
  // 指派目标
  target: z.object({
    type: z.enum(['GLOBAL', 'COUNTRY', 'USER']),
    id: z.string().optional(), // GLOBAL 时为空, COUNTRY 时为 code, USER 时为 id
  })
});

// ⬇️ --- 【新增】 "每周重点" 模式 ---
const weeklyFocusSchema = z.object({
  weekStartDate: z.string().datetime("必须提供有效的周开始日期"),
  content: z.string().min(1, "内容不能为空"),
});
// ⬆️ --- 【新增】 ---


// -----------------------------------------------------------------
// --- (不变) 用户管理 API (Users) ---
// -----------------------------------------------------------------

// (GET /users)
router.get('/users', async (req, res) => { 
  try {
    const users = await prisma.user.findMany({
      include: { 
        role: true,
        supervisedCountries: true, 
        operatedCountries: true,   
      },
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

// (GET /users/:id)
router.get('/users/:id', async (req, res) => { 
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: id },
      include: {
        role: true,
        supervisedCountries: { select: { id: true, code: true } }, 
        operatedCountries: { select: { id: true, code: true } },   
      }
    });
    
    if (!user) { return res.status(404).json({ error: '用户未找到' }); }
    const { passwordHash, ...userSafe } = user;
    res.json(userSafe);
    
  } catch (error) {
    console.error('获取单个用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// (POST /users)
router.post('/users', async (req, res) => { 
  try {
    const validation = userCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { 
      username, password, nickname, roleId, 
      supervisedCountryIds, operatedCountryIds 
    } = validation.data;

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
        supervisedCountries: {
          connect: supervisedCountryIds?.map(id => ({ id: id })) || []
        },
        operatedCountries: {
          connect: operatedCountryIds?.map(id => ({ id: id })) || []
        }
      },
      include: { 
        role: true,
        supervisedCountries: true,
        operatedCountries: true 
      }
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

// (PUT /users/:id)
router.put('/users/:id', async (req, res) => { 
  try {
    const { id } = req.params;
    const validation = userUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入数据无效', details: validation.error.errors });
    }
    
    const { 
      nickname, roleId, 
      supervisedCountryIds, operatedCountryIds 
    } = validation.data;
    
    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) { return res.status(400).json({ error: '所选角色无效' }); }
    
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        nickname: nickname,
        roleId: roleId,
        supervisedCountries: {
          set: supervisedCountryIds?.map(id => ({ id: id })) || []
        },
        operatedCountries: {
          set: operatedCountryIds?.map(id => ({ id: id })) || []
        }
      },
      include: { 
        role: true,
        supervisedCountries: true,
        operatedCountries: true 
      }
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

// (POST /users/:id/reset-password)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    
    const userToReset = await prisma.user.findUnique({ where: { id: id }, select: { username: true } });
    if (userToReset && userToReset.username === 'admin') {
      return res.status(403).json({ error: '禁止重置超级管理员的密码' });
    }

    const defaultPassword = 'q1234567';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: id },
      data: {
        passwordHash: hashedPassword,
      },
    });
    
    res.json({ message: `用户 ${userToReset.username} 的密码已重置为 'q1234567'` });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '用户未找到' });
    }
    console.error('重置密码失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// -----------------------------------------------------------------
// --- (不变) 角色管理 API (Roles) ---
// -----------------------------------------------------------------

// (GET /roles)
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

// (POST /roles)
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


// (GET /roles/:id)
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

// (PUT /roles/:id)
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
// --- (不变) 菜单项 API (Menu Items) ---
// -----------------------------------------------------------------

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

// -----------------------------------------------------------------
// --- (不变) 常用链接管理 API (Links) ---
// -----------------------------------------------------------------

// POST /api/admin/links
router.post('/links', async (req, res) => {
  try {
    const validation = linkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    const newLink = await prisma.commonLink.create({ 
      data: validation.data 
    });
    res.status(201).json(newLink);
  } catch (error) {
    console.error('创建链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/admin/links/:id
router.put('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = linkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    const updatedLink = await prisma.commonLink.update({
      where: { id: id },
      data: validation.data,
    });
    res.json(updatedLink);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '链接未找到' });
    }
    console.error('更新链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/admin/links/:id
router.delete('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.commonLink.delete({ where: { id: id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '链接未找到' });
    }
    console.error('删除链接失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// ⬇️ --- 【新增】 工作日历 API (管理员) ---
// -----------------------------------------------------------------

// POST /api/admin/calendar/events (指派日程)
router.post('/calendar/events', async (req, res) => {
  try {
    const { userId: adminId } = req.user;
    const validation = adminEventCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const { target, ...eventData } = validation.data;
    let targetUserIds = [];

    // 1. 获取目标用户 ID
    if (target.type === 'GLOBAL') {
      const users = await prisma.user.findMany({ select: { id: true } });
      targetUserIds = users.map(u => u.id);
    } 
    else if (target.type === 'USER') {
      if (!target.id) return res.status(400).json({ error: '必须提供目标用户 ID' });
      targetUserIds = [target.id];
    } 
    else if (target.type === 'COUNTRY') {
      if (!target.id) return res.status(400).json({ error: '必须提供目标国家 Code' });
      const users = await prisma.user.findMany({
        where: {
          operatedCountries: { some: { code: target.id } }
        },
        select: { id: true }
      });
      targetUserIds = users.map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: '未找到符合条件的目标用户' });
    }

    // 2. 准备批量创建的数据
    const eventsToCreate = targetUserIds.map(userId => ({
      ...eventData,
      authorId: userId, // 关联到每个用户的日历
      createdByAdmin: true,
      adminCreatorId: adminId, // 记录是哪个管理员创建的
    }));

    // 3. 批量创建
    await prisma.calendarEvent.createMany({
      data: eventsToCreate,
      skipDuplicates: true, // (安全)
    });

    res.status(201).json({ message: `成功为 ${targetUserIds.length} 名用户指派了日程` });

  } catch (error) {
    console.error('指派日程失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/admin/calendar/weekly-focus (创建/更新每周重点)
router.post('/calendar/weekly-focus', async (req, res) => {
  try {
    const { userId } = req.user;
    const validation = weeklyFocusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const { weekStartDate, content } = validation.data;
    const date = new Date(weekStartDate); // 确保是日期对象

    const focus = await prisma.weeklyFocus.upsert({
      where: {
        weekStartDate: date,
      },
      update: {
        content: content,
        authorId: userId, // 记录最后修改人
      },
      create: {
        weekStartDate: date,
        content: content,
        authorId: userId,
      }
    });

    res.status(201).json(focus);
  } catch (error) {
    console.error('更新每周重点失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});
// ⬆️ --- 【新增】 ---

module.exports = router;