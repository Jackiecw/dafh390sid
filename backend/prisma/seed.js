// ./backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种 (Seeding)...');

  // --- 1. 创建所有“菜单项” ---
  console.log('正在创建菜单项...');
  const menuDashboard = await prisma.menuItem.create({
    data: { key: 'DASHBOARD', name: '仪表盘' },
  });
  const menuSalesForm = await prisma.menuItem.create({
    data: { key: 'SALES_FORM', name: '销售数据录入' },
  });
  const menuWeeklyReport = await prisma.menuItem.create({
    data: { key: 'WEEKLY_REPORT', name: '周报填写' },
  });
  const menuViewReports = await prisma.menuItem.create({
    data: { key: 'VIEW_REPORTS', name: '周报查看' },
  });
  const menuLinks = await prisma.menuItem.create({
    data: { key: 'LINKS', name: '常用链接' },
  });
  const menuAdminUsers = await prisma.menuItem.create({
    data: { key: 'ADMIN_USERS', name: '员工配置与管理' },
  });
  
  const menuAdminStores = await prisma.menuItem.create({
    data: { key: 'ADMIN_STORES', name: '店铺管理' },
  });
  
  // ⬇️ 【已删除】 menuAdminCountries (不再需要)


  // --- 2. 创建“角色”并【关联菜单】---
  
  console.log('正在创建“运营专员”角色...');
  const roleOperation = await prisma.role.create({
    data: {
      name: 'operation',
      description: '运营专员 (仅限数据录入和周报)',
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesForm.id },
          { id: menuWeeklyReport.id },
          { id: menuLinks.id },
        ],
      },
    },
  });

  console.log('正在创建“超级管理员”角色...');
  const roleAdmin = await prisma.role.create({
    data: {
      name: 'admin',
      description: '超级管理员 (拥有所有权限)',
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesForm.id },
          { id: menuWeeklyReport.id },
          { id: menuViewReports.id },
          { id: menuLinks.id },
          { id: menuAdminUsers.id },
          { id: menuAdminStores.id },
          // ⬅️ 【已删除】 menuAdminCountries.id (不再需要)
        ],
      },
    },
  });

  // --- 3. 创建您的第一个“超级管理员”用户 ---
  
  const adminPassword = 'your_secure_password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log('正在创建“超级管理员”用户...');
  const adminUser = await prisma.user.create({
    data: {
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

  // ⬇️ 【(不变) 新增】 创建默认的国家
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
    skipDuplicates: true, // (如果已存在，则跳过)
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