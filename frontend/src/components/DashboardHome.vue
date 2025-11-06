<template>
  <div>
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-stone-900">
        {{ greeting }}，{{ authStore.nickname }}！
      </h2>
      <p class="text-stone-500">{{ todayDate }}</p>
      <p class="text-sm text-indigo-600 mt-2 h-5">{{ hitokoto }}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div class="lg:col-span-2 space-y-6">
        
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-stone-900 mb-2 md:mb-0">领售数据 (GMV)</h3>
            
            <div class="flex items-center space-x-2">
              <div class="flex items-center p-1 bg-stone-100 rounded-lg">
                <button
                  v-for="country in countryFilterOptions"
                  :key="country.code"
                  @click="selectCountry(country.code)"
                  :class="[
                    'px-3 py-1 text-sm font-medium rounded-md transition-all',
                    selectedCountryCode === country.code
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-stone-500 hover:text-stone-700'
                  ]"
                >
                  {{ country.code }}
                </button>
              </div>
              
              <Listbox v-model="selectedStoreId" as="div" class="relative w-48">
                <ListboxButton class="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border border-stone-200">
                  <span class="block truncate">{{ selectedStoreName }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </ListboxButton>
                <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                  <ListboxOptions class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                    <ListboxOption
                      v-for="store in storeFilterOptions"
                      :key="store.id"
                      :value="store.id"
                      v-slot="{ active, selected }"
                    >
                      <li :class="[active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900', 'relative cursor-default select-none py-2 px-4']">
                        <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ store.name }}</span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </transition>
              </Listbox>

            </div>
          </div>
          
          <div v-if="isLoading.summary" class="text-center text-stone-500 py-10">
            加载 GMV 数据中...
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-stone-50 p-4 rounded-lg">
              <label class="text-sm font-medium text-stone-500">今日 GMV</label>
              <p class="text-2xl font-bold text-stone-900">
                {{ formatCurrency(summaryData.gmv.today, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-gray-400">
                ≈ ¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.today, 'CNY') }}
              </p>
            </div>
            <div class="bg-stone-50 p-4 rounded-lg">
              <label class="text-sm font-medium text-stone-500">本周 GMV</label>
              <p class="text-2xl font-bold text-stone-900">
                {{ formatCurrency(summaryData.gmv.thisWeek, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-gray-400">
                ≈ ¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.thisWeek, 'CNY') }}
              </p>
            </div>
            <div class="bg-stone-50 p-4 rounded-lg">
              <label class="text-sm font-medium text-stone-500">本月 GMV</label>
              <p class="text-2xl font-bold text-stone-900">
                {{ formatCurrency(summaryData.gmv.thisMonth, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-gray-400">
                ≈ ¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.thisMonth, 'CNY') }}
              </p>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <DashboardTodo class="md:col-span-1" />
          
          <div class="md:col-span-1 bg-white p-6 rounded-lg shadow-lg">
            <button @click="isScheduleOpen = true" class="dashboard-widget-title text-left w-full hover:text-indigo-600">
              日程 ↗
            </button>
            <div class="mt-2 space-y-1">
              <p class="text-sm font-medium text-stone-600">本周重点:</p>
              <p class="text-sm text-stone-500 line-clamp-4">
                {{ summaryData.schedule.planNextWeek || '暂无' }}
              </p>
            </div>
          </div>
          
          <DashboardRecurringTask class="md:col-span-1" />

        </div>
        </div>
      
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h4 class="font-bold text-stone-900 mb-4">今日汇率 (CNY)</h4>
          <div v-if="isLoading.rates" class="text-stone-500">
            加载汇率中...
          </div>
          <div v-else class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="font-medium text-stone-600">1 CNY =</span>
              <span class="text-lg font-bold text-green-600">
                {{ ratesData.CNY_USD?.toFixed(4) || 'N/A' }} USD
              </span>
            </div>
            <div class="border-t border-stone-100"></div>
            <div v-for="code in userCountryCodesForRates" :key="code" class="flex justify-between items-center text-sm">
              <span class="font-medium text-stone-600">1 CNY =</span>
              <span class="font-bold text-stone-800">
                {{ ratesData[`CNY_${code}`]?.toFixed(2) || 'N/A' }} {{ code }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <DashboardSchedule 
      :is-open="isScheduleOpen" 
      :plan-next-week="summaryData.schedule.planNextWeek"
      @close="isScheduleOpen = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import { 
  Listbox, 
  ListboxButton, 
  ListboxOptions, 
  ListboxOption 
} from '@headlessui/vue';
import { ChevronUpDownIcon } from '@heroicons/vue/20/solid';

// ⬇️ 【新增】 导入新组件
import DashboardTodo from './DashboardTodo.vue';
import DashboardSchedule from './DashboardSchedule.vue';
import DashboardRecurringTask from './DashboardRecurringTask.vue';
// ⬆️ 【新增】

const authStore = useAuthStore();

// --- 1. 顶栏逻辑 (不变) ---
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const todayDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

const hitokoto = ref('...');

// --- 2. 状态定义 ---
const isLoading = ref({
  summary: true,
  rates: true,
  filters: true,
});

// (数据 - 不变)
const summaryData = ref({
  gmv: { today: 0, thisWeek: 0, thisMonth: 0, currency: '?', cnyEquivalent: { today: 0, thisWeek: 0, thisMonth: 0 }},
  schedule: { planNextWeek: '加载中...' }
});
const ratesData = ref({});

// (筛选器 - 不变)
const allCountries = ref([]);
const allStores = ref([]);
const selectedCountryCode = ref(null);
const selectedStoreId = ref(null);

// ⬇️ 【新增】 弹窗状态
const isScheduleOpen = ref(false);

// --- 3. 筛选器逻辑 (不变) ---

// (国家按钮)
const countryFilterOptions = computed(() => {
  let countries = allCountries.value.map(c => ({ code: c.code, name: c.name }));
  if (authStore.role === 'admin') {
    return [{ code: 'ALL', name: '所有国家' }, ...countries];
  }
  return countries;
});

// (店铺下拉菜单)
const storeFilterOptions = computed(() => {
  let stores = allStores.value;
  if (selectedCountryCode.value && selectedCountryCode.value !== 'ALL') {
    stores = stores.filter(s => s.countryCode === selectedCountryCode.value);
  }
  return [{ id: 'ALL', name: `所有${selectedCountryCode.value || ''}店铺` }, ...stores];
});

// (获取选中的店铺名称)
const selectedStoreName = computed(() => {
  const store = storeFilterOptions.value.find(s => s.id === selectedStoreId.value);
  return store ? store.name : '选择店铺...';
});

// (汇率显示逻辑)
const userCountryCodesForRates = computed(() => {
  if (authStore.role === 'admin') {
    return ['IDR', 'VND', 'THB', 'MYR', 'PHP', 'SGD']; 
  }
  return authStore.operatedCountries.map(code => {
    const currencyMap = { ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD' };
    return currencyMap[code];
  }).filter(Boolean);
});

// --- 4. 数据加载 (不变) ---

// (获取激励文案)
async function fetchHitokoto() {
  try {
    const response = await fetch('https://v1.hitokoto.cn/?c=i&encode=text');
    hitokoto.value = await response.text();
  } catch (e) {
    hitokoto.value = '今天也要加油！';
  }
}

// (获取筛选器选项)
async function fetchFilterOptions() {
  isLoading.value.filters = true;
  try {
    const response = await apiClient.get('/dashboard/filter-options');
    allCountries.value = response.data.countries;
    allStores.value = response.data.stores;
    
    if (countryFilterOptions.value.length > 0) {
      selectedCountryCode.value = countryFilterOptions.value[0].code;
    }
    if (storeFilterOptions.value.length > 0) {
      selectedStoreId.value = storeFilterOptions.value[0].id;
    }
  } catch (error) {
    console.error("加载筛选器失败:", error);
  } finally {
    isLoading.value.filters = false;
  }
}

// (获取 GMV 和 汇率)
async function fetchDashboardData() {
  // (防止在筛选器未加载完成时调用)
  if (!selectedCountryCode.value || !selectedStoreId.value) return;

  isLoading.value.summary = true;
  isLoading.value.rates = true;

  const params = {
    countryCode: selectedCountryCode.value,
    storeId: selectedStoreId.value,
  };
  
  const summaryPromise = apiClient.get('/dashboard/summary', { params });
  const ratesPromise = apiClient.get('/rates');
  
  try {
    const [summaryResponse, ratesResponse] = await Promise.all([summaryPromise, ratesPromise]);
    summaryData.value = summaryResponse.data;
    ratesData.value = ratesResponse.data;
  } catch (error) {
    console.error("加载仪表盘数据失败:", error);
  } finally {
    isLoading.value.summary = false;
    isLoading.value.rates = false;
  }
}

// (初始化加载)
onMounted(async () => {
  fetchHitokoto();
  await fetchFilterOptions();
  // (等待筛选器加载完默认值后再获取数据)
  fetchDashboardData();
});

// (筛选器联动 - 不变)
function selectCountry(code) {
  selectedCountryCode.value = code;
  selectedStoreId.value = storeFilterOptions.value[0].id; // 重置店铺
}

watch(selectedCountryCode, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  if (!storeFilterOptions.value.find(s => s.id === selectedStoreId.value)) {
    selectedStoreId.value = storeFilterOptions.value[0].id;
  }
  fetchDashboardData();
});

watch(selectedStoreId, (newVal, oldVal) => {
  if (newVal === oldVal || !newVal) return; // 防止初始化时重复调用
  fetchDashboardData();
});

// --- 5. 辅助函数 (不变) ---
function formatCurrency(value, currency) {
  if (currency === 'CNY') {
    return (value || 0).toFixed(2);
  }
  return (value || 0).toFixed(0);
}

</script>

<style>
.dashboard-widget {
  @apply bg-white p-6 rounded-lg shadow-lg h-full flex flex-col;
}
.dashboard-widget-title {
  @apply font-bold text-stone-900;
}
.form-input {
  @apply block w-full p-2 border border-stone-300 rounded-md shadow-sm text-sm;
}
</style>