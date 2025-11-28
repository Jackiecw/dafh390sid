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
        const platform = req.body.platform; // Optional, can be auto-detected

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
                // 2. Create Mapping if requested
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

// GET /sales-import/batches (Recent Imports)
router.get('/sales-import/batches', async (req, res) => {
    try {
        const batches = await prisma.importBatch.findMany({
            take: 10,
            orderBy: { importedAt: 'desc' },
            include: {
                importedBy: { select: { nickname: true } },
                _count: { select: { salesData: true } }
            }
        });
        res.json(batches);
    } catch (error) {
        console.error('Get Batches Error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, stack: error.stack });
    }
});

// DELETE /sales-import/batch/:id (Rollback)
router.delete('/sales-import/batch/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Transaction to delete SalesData and Batch
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
