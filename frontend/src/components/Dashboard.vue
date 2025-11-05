<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-stone-100 text-stone-800">

    <nav class="w-full md:w-64 bg-white shadow-md flex-shrink-0 relative">
      <div class="p-6">
        <h1 class="text-xl font-bold text-indigo-600">海外电商部 内部系统</h1>
        <p class="text-sm text-stone-500 mt-1">仪表板</p>
      </div>
      <ul class="mt-4 space-y-1">
        <li v-for="item in visibleMenuItems" 
            :key="item.key" 
            @click="setView(item.key)"
            class="block p-4 text-stone-600 transition duration-150 group hover:bg-stone-50"
            :class="{ 'bg-stone-100 text-indigo-600 font-semibold active-border': currentView === item.key }">
          <a href="#">{{ item.name }}</a>
        </li>
      </ul>
      <div class="p-4 mt-auto">
        <Menu as="div" class="inline-block text-left w-full">
          <div>
            <MenuButton class="inline-flex w-full justify-center items-center rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              {{ authStore.nickname }}
              <ChevronUpIcon class="ml-2 -mr-1 h-5 w-5 text-stone-500" aria-hidden="true" />
            </MenuButton>
          </div>
          <transition 
            enter-active-class="transition ease-out duration-100" 
            enter-from-class="transform opacity-0 scale-95" 
            enter-to-class="transform opacity-100 scale-100" 
            leave-active-class="transition ease-in duration-75" 
            leave-from-class="transform opacity-100 scale-100" 
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems class="absolute left-64 bottom-4 ml-2 w-56 origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div class="py-1">
                <MenuItem v-slot="{ active }">
                  <button 
                    @click="handleLogout" 
                    :class="[
                      active ? 'bg-stone-100 text-stone-900' : 'text-stone-700', 
                      'group flex w-full items-center rounded-md px-4 py-2 text-sm'
                    ]"
                  >
                    <ArrowRightOnRectangleIcon class="mr-3 h-5 w-5 text-stone-400 group-hover:text-stone-500" aria-hidden="true" />
                    登 出
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </nav>

    <main class="flex-1 p-6 md:p-10 overflow-auto">
      <header class="mb-6">
        <h2 class="text-3xl font-bold text-stone-900">
          欢迎您，{{ authStore.nickname }}！
        </h2>
      </header>

      <div>
        <div v-if="currentView === 'DASHBOARD'">
          <div class="p-6 bg-white rounded-lg shadow">
            <h1 class="text-xl font-semibold">仪表盘首页</h1>
            <p class="mt-2 text-stone-600">这里是您未来放置可视化图表的地方。</p>
          </div>
        </div>

        <SalesForm v-if="currentView === 'SALES_FORM'" />
        <WeeklyReportForm v-if="currentView === 'WEEKLY_REPORT'" />
        <ViewReports v-if="currentView === 'VIEW_REPORTS'" />
        <CommonLinks v-if="currentView === 'LINKS'" />
        <UserManagement v-if="currentView === 'ADMIN_USERS'" />
        <StoreManagement v-if="currentView === 'ADMIN_STORES'" />
        </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; 
import SalesForm from './SalesForm.vue';
import WeeklyReportForm from './WeeklyReportForm.vue';
import CommonLinks from './CommonLinks.vue';
import UserManagement from './UserManagement.vue';
import ViewReports from './ViewReports.vue';
import StoreManagement from './StoreManagement.vue'; 
// ⬇️ 【已删除】 对 CountryManagement 的导入
import { useAuthStore } from '../stores/auth';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { ChevronUpIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/20/solid';

// ⬇️ 【修改】 (allMenuItems 列表已还原)
const allMenuItems = [
  { key: 'DASHBOARD', name: '仪表盘' },
  { key: 'SALES_FORM', name: '销售数据录入' },
  { key: 'WEEKLY_REPORT', name: '周报填写' },
  { key: 'VIEW_REPORTS', name: '周报查看' },
  { key: 'LINKS', name: '常用链接' },
  { key: 'ADMIN_STORES', name: '店铺管理' },
  // ⬇️ 【已删除】 "ADMIN_COUNTRIES"
  { key: 'ADMIN_USERS', name: '员工配置与管理' },
];

const authStore = useAuthStore();
const currentView = ref('DASHBOARD'); 

// (不变)
const visibleMenuItems = computed(() => {
  const userPermissions = authStore.permissions; 
  if (!userPermissions) {
    return []; 
  }
  return allMenuItems.filter(item => 
    userPermissions.includes(item.key)
  );
});

// (不变)
const setView = (viewName) => {
  currentView.value = viewName;
};

// (不变)
const handleLogout = () => {
  authStore.logout();
};
</script>


<style scoped>
/* (样式 ... 保持不变) */
.active-border {
  position: relative;
}
.active-border::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background-color: #4f46e5; /* indigo-600 */
  border-radius: 0 4px 4px 0;
}
</style>