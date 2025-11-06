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
              
              <img v-if="authStore.avatarUrl" :src="userAvatar" alt="Avatar" class="h-6 w-6 rounded-full mr-2 object-cover" />
              <UserCircleIcon v-else class="h-6 w-6 rounded-full mr-2 text-stone-400" />
              
              <span class="truncate">{{ authStore.nickname }}</span>
              <ChevronUpIcon class="ml-auto -mr-1 h-5 w-5 text-stone-500" aria-hidden="true" />
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
            <MenuItems class="absolute left-0 bottom-16 mb-2 w-56 origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div class="py-1">
                <MenuItem v-slot="{ active }">
                  <button 
                    @click="setView('PROFILE_MGMT')"
                    :class="[
                      active ? 'bg-stone-100 text-stone-900' : 'text-stone-900', 
                      'group flex w-full items-center rounded-md px-4 py-2 text-sm'
                    ]"
                  >
                    <Cog6ToothIcon class="mr-3 h-5 w-5 text-stone-400 group-hover:text-stone-500" aria-hidden="true" />
                    个人中心
                  </button>
                </MenuItem>
                
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
      <div>
        <DashboardHome v-if="currentView === 'DASHBOARD'" />
        <SalesDataPage v-if="currentView === 'SALES_DATA'" />
        
        <WeeklyReportPage v-if="currentView === 'REPORTS'" />
        
        <CommonLinks v-if="currentView === 'LINKS'" />
        
        <ProfileManagement v-if="currentView === 'PROFILE_MGMT'" />
        
        <UserManagement v-if="currentView === 'ADMIN_USERS'" />
        <StoreManagement v-if="currentView === 'ADMIN_STORES'" />
        
        <OnSaleProductsPage v-if="currentView === 'ON_SALE_PRODUCTS'" />
        
        <OperationsCenter v-if="currentView === 'OPERATION_CENTER'" /> 
        </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; 
import SalesDataPage from './SalesDataPage.vue';
import WeeklyReportPage from './WeeklyReportPage.vue'; 
import CommonLinks from './CommonLinks.vue';
import ProfileManagement from './ProfileManagement.vue';
import UserManagement from './UserManagement.vue';
import StoreManagement from './StoreManagement.vue'; 
import { useAuthStore } from '../stores/auth';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { 
  ChevronUpIcon, 
  ArrowRightOnRectangleIcon, 
  UserCircleIcon,
  Cog6ToothIcon
} from '@heroicons/vue/20/solid';
import OnSaleProductsPage from './OnSaleProductsPage.vue'; 
import OperationsCenter from './OperationsCenter.vue'; 
import DashboardHome from './DashboardHome.vue'; // ⬅️ 【新增】 导入新组件

// (不变) 菜单列表
const allMenuItems = [
  { key: 'DASHBOARD', name: '仪表盘' },
  { key: 'SALES_DATA', name: '销售数据' }, 
  { key: 'REPORTS', name: '周报' },
  { key: 'ON_SALE_PRODUCTS', name: '在售商品' }, 
  { key: 'OPERATION_CENTER', name: '运营中心' },
  { key: 'LINKS', name: '常用链接' },
  { key: 'ADMIN_STORES', name: '店铺管理' },
  { key: 'ADMIN_USERS', name: '员工配置与管理' },
];

const authStore = useAuthStore();
const currentView = ref('DASHBOARD'); 

// (不变)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const userAvatar = computed(() => {
  if (!authStore.avatarUrl) return null;
  return authStore.avatarUrl.startsWith('http') 
    ? authStore.avatarUrl 
    : `${apiBaseUrl}${authStore.avatarUrl}`;
});

// (不变)
const visibleMenuItems = computed(() => {
  const userPermissions = authStore.permissions; 
  if (!userPermissions) return []; 
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