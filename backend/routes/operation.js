// ./backend/routes/operation.js

const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware');
const adminMiddleware = require('../adminMiddleware');
const { z } = require('zod');

const router = express.Router();

// --- Zod 验证模式 (使用 ownerId) ---
const moduleSchema = z.object({
  name: z.string().min(1, "板块名称不能为空"),
  ownerId: z.string().optional().nullable(),
  countryCode: z.string().min(1, "必须关联一个国家"),
});

const taskSchema = z.object({
  name: z.string().min(1, "事项名称不能为空"),
  ownerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  moduleId: z.string().min(1, "必须关联一个板块"),
});

// (用于实时编辑)
const partialTaskSchema = z.object({
  name: z.string().min(1, "事项名称不能为空").optional(),
  ownerId: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

const partialModuleSchema = z.object({
    name: z.string().min(1).optional(),
    ownerId: z.string().nullable().optional(),
});

// -----------------------------------------------------------------
// --- 公共 API (所有人可访问) ---
// -----------------------------------------------------------------

/**
 * GET /operation/data?country=ID
 * (注意: 路径中没有 /api/)
 */
router.get('/operation/data', authMiddleware, async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) {
      return res.status(400).json({ error: '必须提供 country 查询参数' });
    }

    const modules = await prisma.operationModule.findMany({
      where: { countryCode: country },
      orderBy: { displayOrder: 'asc' },
      include: {
        owner: { select: { id: true, nickname: true } }, 
        tasks: {
          orderBy: { displayOrder: 'asc' },
          include: {
            owner: { select: { id: true, nickname: true } } 
          }
        },
      },
    });

    res.json(modules);
  } catch (error) {
    console.error('获取运营数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// -----------------------------------------------------------------
// --- 管理员 API (Admin 专用) ---
// -----------------------------------------------------------------

/**
 * POST /admin/operation-modules
 * (注意: 路径中没有 /api/)
 */
router.post('/admin/operation-modules', adminMiddleware, async (req, res) => {
  try {
    const validation = moduleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }

    const { name, ownerId, countryCode } = validation.data;

    const maxOrder = await prisma.operationModule.aggregate({
      _max: { displayOrder: true },
      where: { countryCode: countryCode },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const newModule = await prisma.operationModule.create({
      data: {
        name,
        countryCode,
        displayOrder: nextOrder,
        owner: ownerId ? { connect: { id: ownerId } } : undefined,
      },
      include: { 
        tasks: true,
        owner: { select: { id: true, nickname: true } } 
      } 
    });

    res.status(201).json(newModule);
  } catch (error) {
    console.error('创建板块失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /admin/operation-tasks
 * (注意: 路径中没有 /api/)
 */
router.post('/admin/operation-tasks', adminMiddleware, async (req, res) => {
  try {
    const validation = taskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const { name, ownerId, notes, moduleId } = validation.data;

    const maxOrder = await prisma.operationTask.aggregate({
      _max: { displayOrder: true },
      where: { moduleId: moduleId },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const newTask = await prisma.operationTask.create({
      data: {
        name,
        notes,
        moduleId,
        displayOrder: nextOrder,
        owner: ownerId ? { connect: { id: ownerId } } : undefined,
      },
      include: {
        owner: { select: { id: true, nickname: true } }
      }
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('创建事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /admin/operation-tasks/:id
 * (注意: 路径中没有 /api/)
 */
router.put('/admin/operation-tasks/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const validation = partialTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: '输入无效', details: validation.error.errors });
    }
    
    const data = {};
    if (validation.data.name !== undefined) data.name = validation.data.name;
    if (validation.data.notes !== undefined) data.notes = validation.data.notes;
    // (处理 ownerId，允许 "null" 来断开连接)
    if (validation.data.ownerId !== undefined) {
      data.ownerId = validation.data.ownerId;
    }

    const updatedTask = await prisma.operationTask.update({
      where: { id: id },
      data: data,
      include: {
        owner: { select: { id: true, nickname: true } }
      }
    });
    res.json(updatedTask);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: '事项未找到' });
    console.error('更新事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /admin/operation-modules/:id
 * (注意: 路径中没有 /api/)
 */
router.put('/admin/operation-modules/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = partialModuleSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: '输入无效', details: validation.error.errors });
        }

        const data = {};
        if (validation.data.name !== undefined) data.name = validation.data.name;
        // (处理 ownerId，允许 "null" 来断开连接)
        if (validation.data.ownerId !== undefined) {
            data.ownerId = validation.data.ownerId;
        }

        const updatedModule = await prisma.operationModule.update({
            where: { id: id },
            data: data,
            include: {
                owner: { select: { id: true, nickname: true } }
            }
        });
        res.json(updatedModule);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: '板块未找到' });
        console.error('更新板块失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});


/**
 * DELETE /admin/operation-tasks/:id
 * (注意: 路径中没有 /api/)
 */
router.delete('/admin/operation-tasks/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.operationTask.delete({ where: { id: id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: '事项未找到' });
    console.error('删除事项失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /admin/operation-modules/:id
 * (注意: 路径中没有 /api/)
 */
router.delete('/admin/operation-modules/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.operationModule.delete({ where: { id: id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: '板块未找到' });
    console.error('删除板块失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


module.exports = router;