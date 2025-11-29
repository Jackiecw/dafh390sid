// ./backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种 (Seeding)...');

  // --- 1. 创建所有“菜单项” ---
  console.log('正在创建菜单项...');

  // (已有菜单)
  const menuDashboard = await prisma.menuItem.upsert({
    where: { key: 'DASHBOARD' }, update: {},
    create: { key: 'DASHBOARD', name: '仪表盘' },
  });
  const menuCalendar = await prisma.menuItem.upsert({
    where: { key: 'CALENDAR' }, update: { name: '工作日历' },
    create: { key: 'CALENDAR', name: '工作日历' },
  });
  const menuSalesData = await prisma.menuItem.upsert({
    where: { key: 'SALES_DATA' }, update: {},
    create: { key: 'SALES_DATA', name: '销售数据' },
  });
  const menuReports = await prisma.menuItem.upsert({
    where: { key: 'REPORTS' }, update: {},
    create: { key: 'REPORTS', name: '周报中心' },
  });

  // --- 新增缺失的菜单项 ---
  const menuViewReports = await prisma.menuItem.upsert({
    where: { key: 'VIEW_REPORTS' }, update: {},
    create: { key: 'VIEW_REPORTS', name: '查看报表' },
  });
  const menuLinks = await prisma.menuItem.upsert({
    where: { key: 'LINKS' }, update: {},
    create: { key: 'LINKS', name: '常用链接' },
  });
  const menuAdminUsers = await prisma.menuItem.upsert({
    where: { key: 'ADMIN_USERS' }, update: {},
    create: { key: 'ADMIN_USERS', name: '用户管理' },
  });
  const menuAdminStores = await prisma.menuItem.upsert({
    where: { key: 'ADMIN_STORES' }, update: {},
    create: { key: 'ADMIN_STORES', name: '店铺管理' },
  });
  const menuOnSaleProducts = await prisma.menuItem.upsert({
    where: { key: 'ON_SALE_PRODUCTS' }, update: {},
    create: { key: 'ON_SALE_PRODUCTS', name: '在售商品' },
  });
  const menuOperationCenter = await prisma.menuItem.upsert({
    where: { key: 'OPERATION_CENTER' }, update: {},
    create: { key: 'OPERATION_CENTER', name: '运营中心' },
  });
  const menuFinanceAdmin = await prisma.menuItem.upsert({
    where: { key: 'FINANCE_ADMIN' }, update: {},
    create: { key: 'FINANCE_ADMIN', name: '财务管理' },
  });
  const menuFinanceEntry = await prisma.menuItem.upsert({
    where: { key: 'FINANCE_ENTRY' }, update: {},
    create: { key: 'FINANCE_ENTRY', name: '财务录入' },
  });
  const menuFinanceView = await prisma.menuItem.upsert({
    where: { key: 'FINANCE_VIEW' }, update: {},
    create: { key: 'FINANCE_VIEW', name: '财务查看' },
  });
  const menuFinanceExport = await prisma.menuItem.upsert({
    where: { key: 'FINANCE_EXPORT' }, update: {},
    create: { key: 'FINANCE_EXPORT', name: '财务导出' },
  });
  const menuLogisticsMgmt = await prisma.menuItem.upsert({
    where: { key: 'LOGISTICS_MGMT' }, update: {},
    create: { key: 'LOGISTICS_MGMT', name: '物流管理' },
  });
  const menuProductCatalog = await prisma.menuItem.upsert({
    where: { key: 'PRODUCT_CATALOG' }, update: {},
    create: { key: 'PRODUCT_CATALOG', name: '商品目录' },
  });

  // --- 修复 WeeklyReport 菜单项 ---
  const menuWeeklyReport = await prisma.menuItem.upsert({
    where: { key: 'WEEKLY_REPORT' }, update: {},
    create: { key: 'WEEKLY_REPORT', name: '周报中心' },
  });

  // --- 2. 创建角色 (Role) ---
  console.log('正在创建角色...');
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: '超级管理员 (拥有所有权限)',
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesData.id },
          { id: menuWeeklyReport.id },
          { id: menuViewReports.id },
          { id: menuLinks.id },
          { id: menuAdminUsers.id },
          { id: menuAdminStores.id },
          { id: menuOnSaleProducts.id },
          { id: menuOperationCenter.id },
          { id: menuReports.id },
          { id: menuCalendar.id },
          { id: menuFinanceAdmin.id },
          { id: menuFinanceEntry.id },
          { id: menuFinanceView.id },
          { id: menuFinanceExport.id },
          { id: menuLogisticsMgmt.id },
          { id: menuProductCatalog.id },
        ],
      },
    },
  });

  // --- 3. 创建您的第一个“超级管理员”用户 ---
  const adminPassword = 'your_secure_password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log('正在创建“超级管理员”用户...');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      nickname: '超级管理员',
      role: {
        connect: {
          id: roleAdmin.id,
        },
      },
    },
  });

  // --- 4. (不变) 创建默认的国家 ---
  console.log('正在创建默认国家...');
  await prisma.managedCountry.createMany({
    data: [
      { code: 'ID', name: 'Indonesia' },
      { code: 'TH', name: 'Thailand' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'PH', name: 'Philippines' },
      { code: 'SG', name: 'Singapore' },
      { code: 'OTHER', name: 'Other' },
    ],
    skipDuplicates: true,
  });

  console.log('...播种 (Seeding) 完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });