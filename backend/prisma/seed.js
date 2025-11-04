const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种 (Seeding)...');

  // --- 1. 创建所有“菜单项” ---
  // 这些是系统中的“原子权限”
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
  const menuLinks = await prisma.menuItem.create({
    data: { key: 'LINKS', name: '常用链接' },
  });
  const menuAdminUsers = await prisma.menuItem.create({
    data: { key: 'ADMIN_USERS', name: '员工配置与管理' },
  });

  // --- 2. 创建“角色”并【关联菜单】---
  
  // (A) 创建 "运营专员" 角色
  console.log('正在创建“运营专员”角色...');
  const roleOperation = await prisma.role.create({
    data: {
      name: 'operation',
      description: '运营专员 (仅限数据录入和周报)',
      // (核心) 关联这个角色能看到的菜单
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

  // (B) 创建 "超级管理员" 角色
  console.log('正在创建“超级管理员”角色...');
  const roleAdmin = await prisma.role.create({
    data: {
      name: 'admin',
      description: '超级管理员 (拥有所有权限)',
      // (核心) 超级管理员拥有所有菜单
      menus: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSalesForm.id },
          { id: menuWeeklyReport.id },
          { id: menuLinks.id },
          { id: menuAdminUsers.id }, // ⬅️ 管理员独有
        ],
      },
    },
  });

  // --- 3. 创建您的第一个“超级管理员”用户 ---
  
  // (重要!) 请在这里设置您自己的 admin 密码
  const adminPassword = 'your_secure_password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log('正在创建“超级管理员”用户...');
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: hashedPassword,
      nickname: '超级管理员',
      // (核心) 关联到 "admin" 角色
      role: {
        connect: {
          id: roleAdmin.id,
        },
      },
    },
  });

  console.log('...播种 (Seeding) 完成！');
  console.log(`创建的用户: ${adminUser.username}`);
  console.log(`创建的角色: ${roleAdmin.name}, ${roleOperation.name}`);
}

// --- (运行脚本的模板代码) ---
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });