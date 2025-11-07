// ./backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种 (Seeding)...');

  // --- 1. 创建所有“菜单项” ---
  console.log('正在创建菜单项...');
  const menuDashboard = await prisma.menuItem.upsert({
    where: { key: 'DASHBOARD' },
    update: {},
    create: { key: 'DASHBOARD', name: '仪表盘' },
  });
  
  // ⬇️ --- 【新增】 ---
  const menuCalendar = await prisma.menuItem.upsert({
    where: { key: 'CALENDAR' },
    update: { name: '工作日历' },
    create: { key: 'CALENDAR', name: '工作日历' },
  });
  // ⬆️ --- 【新增】 ---

  const menuSalesData = await prisma.menuItem.upsert({
    where: { key: 'SALES_DATA' },
    update: {},
    create: { key: 'SALES_DATA', name: '销售数据' },
  });
  const menuWeeklyReport = await prisma.menuItem.upsert({
    where: { key: 'WEEKLY_REPORT' },
    update: {},
    create: { key: 'WEEKLY_REPORT', name: '周报填写' },
  });
  const menuViewReports = await prisma.menuItem.upsert({
    where: { key: 'VIEW_REPORTS' },
    update: {},
    create: { key: 'VIEW_REPORTS', name: '周报查看' },
  });
  
  const menuReports = await prisma.menuItem.upsert({
    where: { key: 'REPORTS' },
    update: {},
    create: { key: 'REPORTS', name: '周报 (父菜单)' },
  });
  
  const menuLinks = await prisma.menuItem.upsert({
    where: { key: 'LINKS' },
    update: {},
    create: { key: 'LINKS', name: '常用链接' },
  });
  const menuAdminUsers = await prisma.menuItem.upsert({
    where: { key: 'ADMIN_USERS' },
    update: {},
    create: { key: 'ADMIN_USERS', name: '员工配置与管理' },
  });
  const menuAdminStores = await prisma.menuItem.upsert({
    where: { key: 'ADMIN_STORES' },
    update: {},
    create: { key: 'ADMIN_STORES', name: '店铺管理' },
  });
  
  const menuOnSaleProducts = await prisma.menuItem.upsert({
    where: { key: 'ON_SALE_PRODUCTS' },
    update: { name: '在售商品' },
    create: { key: 'ON_SALE_PRODUCTS', name: '在售商品' },
  });

  const menuOperationCenter = await prisma.menuItem.upsert({
    where: { key: 'OPERATION_CENTER' },
    update: {},
    create: { key: 'OPERATION_CENTER', name: '运营中心' },
  });
  
  // ⬇️ --- 【已修正】 ---
  // (旧的 "CALENDAR" 删除块已被移除)
  // ⬆️ --- 【已修正】 ---

  try {
    await prisma.menuItem.delete({ where: { key: 'ADMIN_PRODUCTS' } });
    console.log('旧的 "ADMIN_PRODUCTS" 菜单项已删除。');
  } catch (e) {
    // (如果不存在或已被关联，忽略错误)
  }


  // --- 2. 创建“角色”并【关联菜单】---
  
  console.log('正在创建“运营专员”角色...');
  const roleOperation = await prisma.role.upsert({
    where: { name: 'operation' },
    update: { 
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesData.id }, 
          { id: menuWeeklyReport.id }, 
          { id: menuLinks.id },
          { id: menuOnSaleProducts.id },
          { id: menuOperationCenter.id },
          { id: menuReports.id }, 
          { id: menuCalendar.id }, // ⬅️ 【新增】
        ],
        disconnect: [ 
          { key: 'SALES_FORM' },
          { key: 'SALES_DATA_MGMT' },
          { key: 'ADMIN_PRODUCTS' },
          { id: menuViewReports.id },
          { key: 'CALENDAR' } // (确保断开连接)
        ]
      },
    },
    create: {
      name: 'operation',
      description: '运营专员',
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesData.id }, 
          { id: menuWeeklyReport.id }, 
          { id: menuLinks.id },
          { id: menuOnSaleProducts.id },
          { id: menuOperationCenter.id },
          { id: menuReports.id }, 
          { id: menuCalendar.id }, // ⬅️ 【新增】
        ],
      },
    },
  });

  console.log('正在创建“超级管理员”角色...');
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { 
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
          { id: menuCalendar.id }, // ⬅️ 【新增】
        ],
        disconnect: [
          { key: 'SALES_FORM' },
          { key: 'SALES_DATA_MGMT' },
          { key: 'ADMIN_PRODUCTS' },
          { key: 'CALENDAR' } // (确保断开连接)
        ]
      },
    },
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
          { id: menuCalendar.id }, // ⬅️ 【新增】
        ],
      },
    },
  });

  // --- 3. (不变) 创建您的第一个“超级管理员”用户 ---
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