const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Adding SALES_VISUALIZATION permission...');

    // 1. Create Menu Item
    const menu = await prisma.menuItem.upsert({
        where: { key: 'SALES_VISUALIZATION' },
        update: {},
        create: { key: 'SALES_VISUALIZATION', name: '数据看板' },
    });
    console.log('Menu Item Created/Found:', menu.id);

    // 2. Assign to Roles
    const roles = ['admin', 'operation'];
    for (const roleName of roles) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (role) {
            await prisma.role.update({
                where: { id: role.id },
                data: {
                    menus: {
                        connect: { id: menu.id }
                    }
                }
            });
            console.log(`Assigned to role: ${roleName}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
