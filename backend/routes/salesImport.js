const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelParser = require('../services/ExcelParser');
const ListingMatcher = require('../services/ListingMatcher');
const prisma = require('../prismaClient');
const authMiddleware = require('../authMiddleware'); // Added authMiddleware

// Configure Multer for temporary storage
const upload = multer({ dest: 'uploads/temp/' });

// Ensure temp dir exists
if (!fs.existsSync('uploads/temp/')) {
    fs.mkdirSync('uploads/temp/', { recursive: true });
}

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /sales-import/preview
router.post('/sales-import/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const platform = req.body.platform; // Optional
        const storeId = req.body.storeId;   // Added storeId

        // 1. Parse Excel
        let parseResult;
        try {
            parseResult = ExcelParser.parse(filePath, platform);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        } finally {
            // Clean up temp file
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.warn('Failed to delete temp file:', err);
            }
        }

        const { platform: detectedPlatform, data } = parseResult;

        // 2. Match Listings
        const previewData = await Promise.all(data.map(async (item) => {
            const matchResult = await ListingMatcher.match(detectedPlatform, item.title, item.sku);
            return {
                ...item,
                ...matchResult // listingId, matchType
            };
        }));

        // 3. Check for existing orders (Updates)
        if (storeId) {
            const orderIds = previewData.map(item => item.platformOrderId).filter(id => id);

            // Find existing sales data for this store and these order IDs
            const existingSales = await prisma.salesData.findMany({
                where: {
                    storeId: storeId,
                    platformOrderId: { in: orderIds }
                },
                select: {
                    platformOrderId: true,
                    orderStatus: true,
                    revenue: true,
                    salesVolume: true
                }
            });

            // Create a map for quick lookup
            const existingMap = new Map();
            existingSales.forEach(sale => {
                existingMap.set(sale.platformOrderId, sale);
            });

            // Attach existing data to preview items
            previewData.forEach(item => {
                if (existingMap.has(item.platformOrderId)) {
                    item.isUpdate = true;
                    item.existingData = existingMap.get(item.platformOrderId);
                } else {
                    item.isUpdate = false;
                }
            });
        }

        res.json({
            platform: detectedPlatform,
            totalRows: previewData.length,
            data: previewData
        });

    } catch (error) {
        console.error('Import Preview Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, stack: error.stack });
    }
});

// POST /sales-import/confirm
router.post('/sales-import/confirm', async (req, res) => {
    try {
        const { platform, storeId, items } = req.body;
        // items: Array of { ...orderData, listingId (confirmed), createMapping: boolean }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data' });
        }
        if (!storeId) {
            return res.status(400).json({ error: 'Store ID is required' });
        }

        // Get current user ID
        const enteredById = req.user?.userId;
        if (!enteredById) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // 1. Create Import Batch
        const importBatch = await prisma.importBatch.create({
            data: {
                platform: platform || 'OTHER',
                fileName: `Import-${new Date().toISOString()}`, // Simple name for now
                importedById: enteredById
            }
        });

        for (const item of items) {
            try {
                // 2. Create Mapping if requested (DISABLED per user request)
                /*
                if (item.createMapping && item.listingId) {
                    const existing = await prisma.listingMapping.findFirst({
                        where: {
                            platform: platform,
                            externalTitle: item.title,
                            externalSku: item.sku,
                            listingId: item.listingId
                        }
                    });

                    if (!existing) {
                        await prisma.listingMapping.create({
                            data: {
                                platform: platform,
                                externalTitle: item.title,
                                externalSku: item.sku,
                                listingId: item.listingId
                            }
                        });
                    }
                }
                */

                // 3. Upsert SalesData
                if (item.platformOrderId && item.listingId) {
                    const listing = await prisma.storeProductListing.findUnique({
                        where: { id: item.listingId },
                        include: { store: { include: { country: true } } }
                    });
                    if (!listing) throw new Error(`Listing ${item.listingId} not found`);

                    const countryCode = listing.store.countryCode;
                    let currency = item.currency || 'CNY';

                    if (!item.currency) {
                        const currencyMap = {
                            'ID': 'IDR', 'MY': 'MYR', 'PH': 'PHP', 'SG': 'SGD',
                            'TH': 'THB', 'VN': 'VND', 'TW': 'TWD', 'BR': 'BRL',
                            'US': 'USD', 'UK': 'GBP', 'CN': 'CNY'
                        };
                        currency = currencyMap[countryCode] || 'CNY';
                    }

                    await prisma.salesData.upsert({
                        where: {
                            // Unique constraint is on platformOrderId
                            // Ideally, it should be platformOrderId + storeId, but schema might be just platformOrderId unique globally or per store?
                            // Checking schema... platformOrderId is @unique. This means an order ID can only exist once globally.
                            // This assumes order IDs are unique across all stores/platforms or we only import unique ones.
                            // If order IDs clash between platforms, we might have an issue, but usually they are unique enough or we prefix them.
                            // For now, using platformOrderId as per existing schema.
                            platformOrderId: item.platformOrderId
                        },
                        update: {
                            orderStatus: item.orderStatus,
                            revenue: item.revenue,
                            listingId: item.listingId,
                            productId: listing.productId,
                            salesVolume: item.quantity,
                            importBatchId: importBatch.id,
                            currency: currency,
                            platform: platform,
                            externalTitle: item.title,
                            externalSku: item.sku
                        },
                        create: {
                            recordDate: new Date(item.orderDate || new Date()),
                            salesVolume: item.quantity,
                            revenue: item.revenue,
                            notes: `Imported from ${platform}`,

                            enteredById: enteredById,
                            storeId: storeId,
                            productId: listing.productId,
                            listingId: item.listingId,

                            platformOrderId: item.platformOrderId,
                            orderStatus: item.orderStatus,
                            importBatchId: importBatch.id,
                            currency: currency,
                            platform: platform,
                            externalTitle: item.title,
                            externalSku: item.sku
                        }
                    });
                    results.success++;
                } else {
                    throw new Error('Missing platformOrderId or listingId');
                }
            } catch (e) {
                console.error('Error processing item:', e);
                results.failed++;
                results.errors.push({ orderId: item.platformOrderId, error: e.message });
            }
        }

        res.json(results);

    } catch (error) {
        console.error('Import Confirm Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, stack: error.stack });
    }
});

// GET /sales-import/batches (Import History)
router.get('/sales-import/batches', async (req, res) => {
    try {
        const { country, platform, userId, page = 1, pageSize = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(pageSize);
        const take = parseInt(pageSize);

        const where = {};

        // 1. Apply Filters
        if (platform) where.platform = platform;
        if (userId) where.importedById = userId;
        if (country) {
            where.salesData = {
                some: {
                    store: {
                        countryCode: country
                    }
                }
            };
        }

        // 2. Apply Permissions
        const user = req.user;
        if (user.role !== 'admin') {
            const permissionConditions = [];

            // Rule 1: Managers can view all records for their supervised countries
            const supervisedCountries = user.supervisedCountries || [];
            if (supervisedCountries.length > 0) {
                permissionConditions.push({
                    salesData: {
                        some: {
                            store: {
                                countryCode: { in: supervisedCountries }
                            }
                        }
                    }
                });
            }

            // Rule 2: Operators (and Managers) can view their own records
            // "If only operation country permission, only view own records" implies if they have supervision, they see more.
            // But usually one can always see their own imports.
            permissionConditions.push({
                importedById: user.userId
            });

            // Combine with OR
            if (where.AND) {
                where.AND.push({ OR: permissionConditions });
            } else {
                where.AND = [{ OR: permissionConditions }];
            }
        }

        // Execute Query
        const [total, batches] = await prisma.$transaction([
            prisma.importBatch.count({ where }),
            prisma.importBatch.findMany({
                where,
                skip,
                take,
                orderBy: { importedAt: 'desc' },
                include: {
                    importedBy: { select: { nickname: true, username: true } },
                    _count: { select: { salesData: true } },
                    // We need to fetch one sales data to know the country/store for display if needed, 
                    // but for list we might just show platform. 
                    // To show "Country", we can try to fetch one related salesData's store country.
                    salesData: {
                        take: 1,
                        select: {
                            store: {
                                select: { country: { select: { name: true, code: true } } }
                            }
                        }
                    }
                }
            })
        ]);

        // Transform result to flatten country info
        const result = batches.map(batch => ({
            id: batch.id,
            platform: batch.platform,
            fileName: batch.fileName,
            importedAt: batch.importedAt,
            importedBy: batch.importedBy,
            count: batch._count.salesData,
            country: batch.salesData[0]?.store?.country || null
        }));

        res.json({
            data: result,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / take)
        });

    } catch (error) {
        console.error('Get Batches Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, stack: error.stack });
    }
});

// DELETE /sales-import/batch/:id (Rollback)
router.delete('/sales-import/batch/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // 1. Find the batch
        const batch = await prisma.importBatch.findUnique({
            where: { id },
            include: {
                salesData: {
                    take: 1,
                    select: { store: { select: { countryCode: true } } }
                }
            }
        });

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        // 2. Check Permissions
        let canDelete = false;
        if (user.role === 'admin') {
            canDelete = true;
        } else {
            // Own record?
            if (batch.importedById === user.userId) {
                canDelete = true;
            }
            // Managed country?
            const batchCountry = batch.salesData[0]?.store?.countryCode;
            if (batchCountry && user.supervisedCountries?.includes(batchCountry)) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // 3. Transaction to delete SalesData and Batch
        await prisma.$transaction([
            prisma.salesData.deleteMany({
                where: { importBatchId: id }
            }),
            prisma.importBatch.delete({
                where: { id: id }
            })
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('Rollback Error:', error);
        res.status(500).json({ error: 'Rollback failed', message: error.message, stack: error.stack });
    }
});

module.exports = router;
