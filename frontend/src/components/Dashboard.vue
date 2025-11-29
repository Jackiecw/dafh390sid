<template>
  <div class="flex min-h-screen flex-col bg-[#F9FAFB] text-[#1F2937] md:flex-row">
    <!-- Mobile Sidebar (Off-canvas) -->
    <TransitionRoot as="template" :show="mobileMenuOpen">
      <Dialog as="div" class="relative z-50 md:hidden" @close="mobileMenuOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="mobileMenuOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>
              
              <!-- Sidebar Content (Mobile) -->
              <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div class="flex h-16 shrink-0 items-center">
                  <div class="space-y-1">
                    <p class="text-xs font-semibold uppercase tracking-[0.4em] text-[#6B7280]">Overseas Ops</p>
                    <h1 class="text-xl font-semibold text-[#1F2937]">海外电商部</h1>
                  </div>
                </div>
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="-mx-2 space-y-1">
                        <li v-for="group in visibleMenuGroups" :key="group.key">
                          <div v-if="group.items.length > 0">
                             <div class="px-2 py-2 text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider">
                               {{ group.title }}
                             </div>
                             <ul role="list" class="space-y-1">
                               <li v-for="item in group.items" :key="item.key">
                                 <button
                                   @click="setView(item.key); mobileMenuOpen = false"
                                   :class="[
                                     currentView === item.key
                                       ? 'bg-blue-50 text-[#3B82F6]'
                                       : 'text-gray-700 hover:bg-gray-50 hover:text-[#3B82F6]',
                                     'group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                   ]"
                                 >
                                   {{ item.name }}
                                   <span
                                      v-if="item.badge"
                                      class="ml-auto w-9 min-w-max whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-0.5 text-center text-xs font-medium leading-5 text-[#3B82F6] ring-1 ring-inset ring-blue-600/20"
                                      aria-hidden="true"
                                    >{{ item.badge }}</span>
                                 </button>
                               </li>
                             </ul>
                          </div>
                        </li>
                      </ul>
                    </li>
                    
                    <li class="mt-auto">
                      <button
                        @click="setView('PROFILE_MGMT'); mobileMenuOpen = false"
                        class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-[#3B82F6]"
                      >
                        <Cog6ToothIcon class="h-6 w-6 shrink-0 text-gray-400 group-hover:text-[#3B82F6]" aria-hidden="true" />
                        个人中心
                      </button>
                      <button
                        @click="handleLogout"
                        class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-[#3B82F6]"
                      >
                        <ArrowRightOnRectangleIcon class="h-6 w-6 shrink-0 text-gray-400 group-hover:text-[#3B82F6]" aria-hidden="true" />
                        登出
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Desktop Sidebar (Static) -->
    <nav class="hidden w-full flex-shrink-0 flex-col border-r border-[#E5E7EB] bg-white px-4 pb-4 pt-6 shadow-xl shadow-blue-100/50 md:flex md:w-80 lg:w-88">
      <div class="space-y-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.4em] text-[#6B7280]">Overseas Ops</p>
        <h1 class="text-2xl font-semibold text-[#1F2937]">海外电商部</h1>
        <p class="text-sm text-[#6B7280]">内部控制中心</p>
      </div>

      <div class="mt-6 flex-1 space-y-5 overflow-y-auto pr-2">
        <section
          v-for="group in visibleMenuGroups"
          :key="group.key"
          class="rounded-2xl border border-[#E5E7EB] bg-white px-3 pt-2 shadow-sm"
        >
          <button
            class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-[#F9FAFB]"
            @click="toggleGroup(group.key)"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#6B7280]">{{ group.title }}</p>
              <p class="text-sm text-[#6B7280]">{{ group.description }}</p>
            </div>
            <ChevronUpIcon
              class="h-5 w-5 text-[#94A3B8] transition"
              :class="{ 'rotate-180': !openGroups[group.key] }"
            />
          </button>

          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-y-95 opacity-0"
            enter-to-class="transform scale-y-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform scale-y-100 opacity-100"
            leave-to-class="transform scale-y-95 opacity-0"
          >
            <ul v-show="openGroups[group.key]" class="space-y-1 px-2 pb-3 pt-1">
              <li v-for="item in group.items" :key="item.key">
                <button
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition"
                  :class="currentView === item.key ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30' : 'text-[#6B7280] hover:bg-[#F3F4F6]'"
                  @click="setView(item.key)"
                >
                  <span>{{ item.name }}</span>
                  <span
                    v-if="item.badge"
                    class="text-xs font-semibold uppercase tracking-wide"
                    :class="currentView === item.key ? 'text-white/80' : 'text-[#94A3B8]'"
                  >
                    {{ item.badge }}
                  </span>
                </button>
              </li>
            </ul>
          </transition>
        </section>
      </div>

      <div class="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <Menu as="div" class="relative inline-block w-full text-left">
          <div>
            <MenuButton class="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-[#1F2937] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2">
              <img
                v-if="authStore.avatarUrl"
                :src="userAvatar"
                alt="Avatar"
                class="h-8 w-8 rounded-full object-cover"
              />
              <UserCircleIcon v-else class="h-8 w-8 text-[#9CA3AF]" />
              <div class="flex-1 text-left">
                <p class="text-xs uppercase tracking-wide text-[#94A3B8]">当前用户</p>
                <p class="truncate font-semibold text-[#1F2937]">{{ authStore.nickname }}</p>
              </div>
              <ChevronUpIcon class="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
            </MenuButton>
          </div>
          <transition
            enter-active-class="transition ease-out duration-150"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <MenuItems class="absolute inset-x-0 bottom-14 origin-bottom rounded-2xl border border-[#E5E7EB] bg-white shadow-xl ring-1 ring-black/5 focus:outline-none">
              <div class="py-2">
                <MenuItem v-slot="{ active }">
                  <button
                    @click="setView('PROFILE_MGMT')"
                    :class="[
                      active ? 'bg-[#F3F4F6] text-[#1F2937]' : 'text-[#1F2937]',
                      'group flex w-full items-center px-4 py-2 text-sm'
                    ]"
                  >
                    <Cog6ToothIcon class="mr-3 h-5 w-5 text-[#94A3B8] group-hover:text-[#64748B]" aria-hidden="true" />
                    个人中心
                  </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleLogout"
                    :class="[
                      active ? 'bg-[#F3F4F6] text-[#1F2937]' : 'text-[#6B7280]',
                      'group flex w-full items-center px-4 py-2 text-sm'
                    ]"
                  >
                    <ArrowRightOnRectangleIcon class="mr-3 h-5 w-5 text-[#94A3B8] group-hover:text-[#64748B]" aria-hidden="true" />
                    登出
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col">
      <!-- Mobile Header -->
      <div class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 md:hidden">
        <button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden" @click="mobileMenuOpen = true">
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon class="h-6 w-6" aria-hidden="true" />
        </button>
        <div class="flex-1 text-sm font-semibold leading-6 text-gray-900">
          {{ currentViewName }}
        </div>
        <div class="flex items-center gap-x-4 lg:gap-x-6">
          <Menu as="div" class="relative">
             <MenuButton class="-m-1.5 flex items-center p-1.5">
                <span class="sr-only">Open user menu</span>
                <img
                  v-if="authStore.avatarUrl"
                  :src="userAvatar"
                  alt="Avatar"
                  class="h-8 w-8 rounded-full bg-gray-50 object-cover"
                />
                <UserCircleIcon v-else class="h-8 w-8 text-gray-400" />
             </MenuButton>
             <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <MenuItem v-slot="{ active }">
                  <button
                    @click="setView('PROFILE_MGMT')"
                    :class="[active ? 'bg-gray-50' : '', 'block w-full px-3 py-1 text-sm leading-6 text-gray-900 text-left']"
                  >
                    个人中心
                  </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleLogout"
                    :class="[active ? 'bg-gray-50' : '', 'block w-full px-3 py-1 text-sm leading-6 text-gray-900 text-left']"
                  >
                    登出
                  </button>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </div>
      </div>

      <main class="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-10 lg:px-12">
        <KeepAlive>
          <component :is="currentComponent" />
        </KeepAlive>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import SalesDataPage from './SalesDataPage.vue';
import WeeklyReportPage from './WeeklyReportPage.vue';
import CommonLinks from './CommonLinks.vue';
import ProfileManagement from './ProfileManagement.vue';
import SalesDashboard from './SalesDashboard.vue';
import ImportHistory from './ImportHistory.vue'; // ⬅️ 【新增】
import UserManagement from './UserManagement.vue';
import StoreManagement from './StoreManagement.vue';
import { useAuthStore } from '../stores/auth';
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue';
import {
  ChevronUpIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/vue/20/solid';
import OnSaleProductsPage from './OnSaleProductsPage.vue';
import OperationsCenter from './OperationsCenter.vue';
import DashboardHome from './DashboardHome.vue';
import CalendarPage from './CalendarPage.vue';
import FinancePage from './FinancePage.vue';
import LogisticsPage from './LogisticsPage.vue';
import ProductManagement from './ProductManagement.vue';
import DataImport from './DataImport.vue';

const menuGroups = [
  {
    key: 'workspace',
    title: '工作台',
    description: '概览 · 节奏',
    defaultOpen: true,
    items: [
      { key: 'DASHBOARD', name: '仪表盘', badge: 'live' },
      { key: 'CALENDAR', name: '工作日历', badge: 'team' },
      { key: 'REPORTS', name: '周报中心' },
    ],
  },
  {
    key: 'sales',
    title: '销售数据',
    description: '明细 · 导入',
    defaultOpen: true,
    items: [
      { key: 'SALES_VISUALIZATION', name: '数据看板', badge: 'new' }, // ⬅️ 【新增】
      { key: 'SALES_DATA', name: '销售明细' },
      { key: 'SALES_IMPORT', name: '数据导入' },
      { key: 'SALES_IMPORT_HISTORY', name: '导入记录' },
    ],
  },
  {
    key: 'operations',
    title: '业务运营',
    description: '销售 · 运营 · 财务',
    defaultOpen: true,
    items: [
      { key: 'ON_SALE_PRODUCTS', name: '店铺在售' },
      { key: 'PRODUCT_CATALOG', name: '产品目录' },
      { key: 'OPERATION_CENTER', name: '运营中心' },
      { key: 'FINANCE_ADMIN', name: '财务管理' },
      { key: 'LOGISTICS_MGMT', name: '生产与物流' },
    ],
  },
  {
    key: 'resources',
    title: '协作资源',
    description: '常用资料 · 链接',
    defaultOpen: false,
    items: [{ key: 'LINKS', name: '常用链接' }],
  },
  {
    key: 'management',
    title: '组织配置',
    description: '门店 · 人员',
    defaultOpen: false,
    items: [
      { key: 'ADMIN_STORES', name: '店铺管理' },
      { key: 'ADMIN_USERS', name: '员工配置与管理' },
    ],
  },
  ];

const viewComponents = {
  DASHBOARD: DashboardHome,
  CALENDAR: CalendarPage,
  SALES_VISUALIZATION: SalesDashboard, // ⬅️ 【新增】
  SALES_DATA: SalesDataPage,
  SALES_IMPORT: DataImport,
  SALES_IMPORT_HISTORY: ImportHistory,
  REPORTS: WeeklyReportPage,
  FINANCE_ADMIN: FinancePage,
  ON_SALE_PRODUCTS: OnSaleProductsPage,
  OPERATION_CENTER: OperationsCenter,
  LINKS: CommonLinks,
  ADMIN_STORES: StoreManagement,
  ADMIN_USERS: UserManagement,
  PROFILE_MGMT: ProfileManagement,
  LOGISTICS_MGMT: LogisticsPage,
  PRODUCT_CATALOG: ProductManagement,
};

const authStore = useAuthStore();
const currentView = ref('DASHBOARD');
const mobileMenuOpen = ref(false);

const openGroups = ref(
  Object.fromEntries(menuGroups.map((group) => [group.key, group.defaultOpen !== false]))
);

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const userAvatar = computed(() => {
  if (!authStore.avatarUrl) return null;
  return authStore.avatarUrl.startsWith('http')
    ? authStore.avatarUrl
    : `${apiBaseUrl}${authStore.avatarUrl}`;
});

const visibleMenuGroups = computed(() => {
  const perms = authStore.permissions || [];
  return menuGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => perms.includes(item.key));
      if (filteredItems.length === 0) return null;
      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter(Boolean);
});

const currentViewName = computed(() => {
  for (const group of visibleMenuGroups.value) {
    const item = group.items.find(i => i.key === currentView.value);
    if (item) return item.name;
  }
  if (currentView.value === 'PROFILE_MGMT') return '个人中心';
  return 'Dashboard';
});

const currentComponent = computed(() => {
  return viewComponents[currentView.value] || DashboardHome;
});

watch(
  () => visibleMenuGroups.value,
  (groups) => {
    const hasAccess = groups.some((group) =>
      group.items.some((item) => item.key === currentView.value)
    );
    if (!hasAccess && currentView.value !== 'PROFILE_MGMT' && groups[0]?.items[0]) {
      currentView.value = groups[0].items[0].key;
    }
  },
  { immediate: true }
);

const setView = (viewName) => {
  currentView.value = viewName;
};

const toggleGroup = (groupKey) => {
  openGroups.value[groupKey] = !openGroups.value[groupKey];
};

const handleLogout = () => {
  authStore.logout();
};
</script>
