const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { z } = require('zod');

// Middleware to check if user is authenticated (assuming you have one, otherwise we'll use a simple check)
// In auth.js you used JWT, so we should probably use a middleware here. 
// I'll assume `authMiddleware` puts user info in `req.user`.
const authMiddleware = require('../authMiddleware');

// --- Validation Schemas ---

const templateItemSchema = z.object({
    category: z.string().min(1),
    kpiName: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().min(0).max(100),
});

const createTemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    items: z.array(templateItemSchema).min(1),
});

const assignReviewSchema = z.object({
    employeeId: z.string(),
    templateId: z.string(),
    month: z.string(), // "YYYY-MM" format
    managerId: z.string(),
    directorId: z.string().optional(), // Optional, can be inferred or empty
});

const updateReviewSchema = z.object({
    status: z.enum(['DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'DIRECTOR_REVIEW', 'COMPLETED', 'CANCELED']).optional(),
    summaryThisMonth: z.string().nullable().optional(),
    planNextMonth: z.string().nullable().optional(),
    companySuggestions: z.string().nullable().optional(),
    items: z.array(z.object({
        id: z.string(),
        selfScore: z.number().nullable().optional(),
        selfComment: z.string().nullable().optional(),
        managerScore: z.number().nullable().optional(),
        managerComment: z.string().nullable().optional(),
        directorScore: z.number().nullable().optional(),
        directorComment: z.string().nullable().optional(),
    })).optional(),
});

// --- Routes ---

// 1. Get All Templates
router.get('/templates', authMiddleware, async (req, res) => {
    try {
        const templates = await prisma.performanceTemplate.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// 2. Create Template
router.post('/templates', authMiddleware, async (req, res) => {
    try {
        const validation = createTemplateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
        }

        const { name, description, items } = validation.data;

        // Validate total weight
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            return res.status(400).json({ error: `Total weight must be 100. Current total: ${totalWeight}` });
        }

        const template = await prisma.performanceTemplate.create({
            data: {
                name,
                description,
                items: {
                    create: items
                }
            },
            include: { items: true }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// 3. Assign Review
router.post('/reviews/assign', authMiddleware, async (req, res) => {
    try {
        const validation = assignReviewSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
        }

        const { employeeId, templateId, month, managerId, directorId } = validation.data;

        // Parse month to Date (1st day of month)
        const [year, monthStr] = month.split('-');
        const monthDate = new Date(Date.UTC(parseInt(year), parseInt(monthStr) - 1, 1));

        // Check if review already exists
        const existing = await prisma.performanceReview.findUnique({
            where: {
                employeeId_month_templateId: {
                    employeeId,
                    month: monthDate,
                    templateId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Review already exists for this user, month, and template' });
        }

        // Fetch template items for snapshotting
        const template = await prisma.performanceTemplate.findUnique({
            where: { id: templateId },
            include: { items: true }
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Determine Director
        let finalDirectorId = directorId;
        if (!finalDirectorId) {
            // Try to infer director: User -> Manager -> Manager
            // First fetch manager's manager
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                include: { manager: true }
            });
            if (manager && manager.managerId) {
                finalDirectorId = manager.managerId;
            }
        }

        // Create Review with Snapshots
        const review = await prisma.performanceReview.create({
            data: {
                month: monthDate,
                status: 'SELF_REVIEW', // Start directly at SELF_REVIEW or DRAFT? Let's say SELF_REVIEW for now.
                employee: { connect: { id: employeeId } },
                manager: { connect: { id: managerId } },
                ...(finalDirectorId ? { director: { connect: { id: finalDirectorId } } } : {}),
                template: { connect: { id: templateId } },
                items: {
                    create: template.items.map(item => ({
                        category: item.category,
                        kpiName: item.kpiName,
                        description: item.description,
                        weight: item.weight
                    }))
                }
            }
        });

        res.status(201).json(review);

    } catch (error) {
        console.error('Error assigning review:', error);
        res.status(500).json({ error: 'Failed to assign review' });
    }
});

// 4. Get My Reviews (As Employee)
router.get('/reviews/my', authMiddleware, async (req, res) => {
    try {
        const reviews = await prisma.performanceReview.findMany({
            where: { employeeId: req.user.userId },
            include: {
                template: { select: { name: true } },
                manager: { select: { nickname: true } },
                director: { select: { nickname: true } }
            },
            orderBy: { month: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching my reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// 5. Get Pending Reviews (As Manager or Director)
router.get('/reviews/pending', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find reviews where I am manager AND status is MANAGER_REVIEW
        // OR where I am director AND status is DIRECTOR_REVIEW
        const reviews = await prisma.performanceReview.findMany({
            where: {
                OR: [
                    { managerId: userId, status: 'MANAGER_REVIEW' },
                    { directorId: userId, status: 'DIRECTOR_REVIEW' }
                ]
            },
            include: {
                employee: { select: { nickname: true, username: true } },
                template: { select: { name: true } }
            },
            orderBy: { month: 'desc' }
        });

        res.json(reviews);
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        res.status(500).json({ error: 'Failed to fetch pending reviews' });
    }
});

// 6. Get Review Detail
router.get('/reviews/:id', authMiddleware, async (req, res) => {
    try {
        const review = await prisma.performanceReview.findUnique({
            where: { id: req.params.id },
            include: {
                items: true,
                employee: { select: { id: true, nickname: true, username: true } },
                manager: { select: { id: true, nickname: true } },
                director: { select: { id: true, nickname: true } },
                template: { select: { name: true, description: true } }
            }
        });

        if (!review) return res.status(404).json({ error: 'Review not found' });

        // Permission check: User must be employee, manager, director, or admin
        const userId = req.user.userId;
        const userRole = req.user.role;

        const isRelated = review.employeeId === userId || review.managerId === userId || review.directorId === userId;
        const isAdmin = userRole === 'admin' || userRole === 'superadmin'; // Adjust based on your role names

        if (!isRelated && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(review);
    } catch (error) {
        console.error('Error fetching review detail:', error);
        res.status(500).json({ error: 'Failed to fetch review detail' });
    }
});

// 7. Update Review (Score & Status)
router.put('/reviews/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = updateReviewSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
        }

        const { status, items, summaryThisMonth, planNextMonth, companySuggestions } = validation.data;
        const userId = req.user.userId;

        // Fetch current review to check permissions and old status
        const currentReview = await prisma.performanceReview.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!currentReview) return res.status(404).json({ error: 'Review not found' });

        // --- Permission & Logic Checks ---
        // (Simplified logic, can be expanded)

        // If updating items (scores)
        if (items && items.length > 0) {
            // Prepare update promises
            const updatePromises = items.map(item => {
                return prisma.performanceReviewItem.update({
                    where: { id: item.id },
                    data: {
                        selfScore: item.selfScore,
                        selfComment: item.selfComment,
                        managerScore: item.managerScore,
                        managerComment: item.managerComment,
                        directorScore: item.directorScore,
                        directorComment: item.directorComment,
                    }
                });
            });
            await prisma.$transaction(updatePromises);
        }

        // Recalculate Totals (Always recalculate to be safe)
        // Fetch updated items
        const updatedItems = await prisma.performanceReviewItem.findMany({
            where: { reviewId: id }
        });

        let selfTotal = 0;
        let managerTotal = 0;
        let directorTotal = 0;

        updatedItems.forEach(item => {
            // Weight is 0-100. Score is usually 0-100? Or 0-5? 
            // User said "Sum(Item.Score * Item.Weight)". 
            // If Weight is percentage (e.g. 30 for 30%), and Score is 100 max.
            // Then 30 * 100 = 3000. We probably want (Weight/100) * Score.
            // Let's assume Weight is stored as absolute number (e.g. 30).
            // Formula: Score * (Weight / 100)

            const w = item.weight / 100.0;

            if (item.selfScore != null) selfTotal += item.selfScore * w;
            if (item.managerScore != null) managerTotal += item.managerScore * w;
            if (item.directorScore != null) directorTotal += item.directorScore * w;
        });

        // Fix precision
        selfTotal = parseFloat(selfTotal.toFixed(2));
        managerTotal = parseFloat(managerTotal.toFixed(2));
        directorTotal = parseFloat(directorTotal.toFixed(2));

        // Determine final score based on status or hierarchy
        // Usually Manager Score is the main one, Director might override or just approve.
        // Let's say Final = Director if exists, else Manager.
        let finalScore = managerTotal;
        if (currentReview.directorId && directorTotal > 0) {
            finalScore = directorTotal;
        }

        // Update Review Totals and Status
        const updateData = {
            selfScoreTotal: selfTotal,
            managerScoreTotal: managerTotal,
            directorScoreTotal: directorTotal,
            finalScore: finalScore,
            summaryThisMonth: summaryThisMonth,
            planNextMonth: planNextMonth,
            companySuggestions: companySuggestions
        };

        if (status) {
            updateData.status = status;
        }

        const updatedReview = await prisma.performanceReview.update({
            where: { id },
            data: updateData
        });

        res.json(updatedReview);

    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

module.exports = router;
