
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const salesDataRoute = require('../routes/salesData');

async function main() {
    console.log('--- Starting Debug Script ---');

    // 1. Test DB Connection
    try {
        console.log('1. Testing DB Connection...');
        const user = await prisma.user.findFirst();
        if (user) {
            console.log('✅ DB Connection Successful. Found user:', user.username);
        } else {
            console.log('⚠️ DB Connection Successful but no users found.');
        }
    } catch (e) {
        console.error('❌ DB Connection Failed:', e);
        return;
    }

    // 2. Test Sales Data Query Logic
    try {
        console.log('\n2. Testing Sales Data Query Logic...');

        // Mock User
        const mockUser = await prisma.user.findFirst({
            include: { role: true, supervisedCountries: true, operatedCountries: true }
        });

        if (!mockUser) {
            console.log('Skipping Sales Data test (no user)');
        } else {
            console.log('Using Mock User:', mockUser.username, 'Role:', mockUser.role.name);

            // Mock Query
            const mockQuery = {
                page: '1',
                pageSize: '20',
                sortBy: 'recordDate',
                sortOrder: 'desc'
            };

            const { buildSalesDataWhere, buildSalesDataOrder, normalizePagination, appendManagePermission } = salesDataRoute.__testables;

            const { where, error } = buildSalesDataWhere(mockQuery, mockUser);
            if (error) {
                console.error('❌ buildSalesDataWhere returned error:', error);
            } else {
                console.log('Where clause built:', JSON.stringify(where, null, 2));

                const orderBy = buildSalesDataOrder(mockQuery);
                const { skip, pageSize } = normalizePagination(mockQuery);

                console.log('Running Prisma Query...');
                const salesData = await prisma.salesData.findMany({
                    where,
                    orderBy,
                    skip,
                    take: pageSize,
                    include: {
                        store: { include: { country: true } },
                        product: { select: { sku: true, name: true } },
                        listing: { select: { productCode: true, storeTitle: true } },
                        enteredBy: { select: { nickname: true } },
                    },
                });
                console.log(`✅ Query Successful. Found ${salesData.length} records.`);
            }
        }
    } catch (e) {
        console.error('❌ Sales Data Query Failed:', e);
    }

    // 3. Test Excel Parser (Basic)
    try {
        console.log('\n3. Testing Excel Parser Import...');
        const ExcelParser = require('../services/ExcelParser');
        console.log('✅ ExcelParser module loaded.');
    } catch (e) {
        console.error('❌ Failed to load ExcelParser:', e);
    }

    console.log('\n--- Debug Script Finished ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
