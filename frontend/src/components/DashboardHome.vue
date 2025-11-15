<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-8 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Daily Brief</p>
          <h2 class="mt-2 text-3xl font-semibold">
            {{ greeting }}，{{ authStore.nickname }}。
          </h2>
          <p class="text-white/80">{{ todayDate }}</p>
          <p class="mt-4 text-sm text-white/70 line-clamp-2">
            {{ hitokoto || '今天也要加油。' }}
          </p>
        </div>
        <div class="grid w-full gap-4 text-sm sm:grid-cols-2 lg:w-auto">
          <div
            v-for="metric in highlightMetrics"
            :key="metric.label"
            class="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">{{ metric.label }}</p>
            <p class="mt-3 text-2xl font-semibold text-white">{{ metric.value }}</p>
            <p class="text-sm text-white/80">{{ metric.sub }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="space-y-6">
        <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#6B7280]">GMV Overview</p>
              <h3 class="mt-1 text-2xl font-semibold text-[#1F2937]">销售数据 (GMV)</h3>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center rounded-full border border-[#E5E7EB] bg-[#F3F4F6] p-1">
                <button
                  v-for="country in countryFilterOptions"
                  :key="country.code"
                  @click="selectCountry(country.code)"
                  :class="[
                    'px-3 py-1 text-sm font-semibold rounded-full transition-all',
                    selectedCountryCode === country.code
                      ? 'bg-white text-[#3B82F6] shadow'
                      : 'text-[#6B7280] hover:text-[#1F2937]'
                  ]"
                >
                  {{ country.code }}
                </button>
              </div>

              <Listbox v-model="selectedStoreId" as="div" class="relative w-48">
                <ListboxButton class="relative w-full cursor-default rounded-2xl border border-[#E5E7EB] bg-white py-2 pl-3 pr-10 text-left text-sm text-[#1F2937] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]">
                  <span class="block truncate">{{ selectedStoreName }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon class="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
                  </span>
                </ListboxButton>
                <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                  <ListboxOptions class="absolute mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-[#E5E7EB] bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                    <ListboxOption
                      v-for="store in storeFilterOptions"
                      :key="store.id"
                      :value="store.id"
                      v-slot="{ active, selected }"
                    >
                      <li :class="[active ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'text-[#1F2937]', 'relative cursor-default select-none py-2 px-4']">
                        <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ store.name }}</span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </transition>
              </Listbox>
            </div>
          </div>

          <div v-if="isLoading.summary" class="py-10 text-center text-[#6B7280]">
            加载 GMV 数据中...
          </div>
          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <label class="text-sm font-medium text-[#6B7280]">今日 GMV</label>
              <p class="mt-2 text-2xl font-bold text-[#1F2937]">
                {{ formatCurrency(summaryData.gmv.today, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-[#6B7280]">
                ≈¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.today, 'CNY') }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <label class="text-sm font-medium text-[#6B7280]">本周 GMV</label>
              <p class="mt-2 text-2xl font-bold text-[#1F2937]">
                {{ formatCurrency(summaryData.gmv.thisWeek, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-[#6B7280]">
                ≈¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.thisWeek, 'CNY') }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <label class="text-sm font-medium text-[#6B7280]">本月 GMV</label>
              <p class="mt-2 text-2xl font-bold text-[#1F2937]">
                {{ formatCurrency(summaryData.gmv.thisMonth, summaryData.gmv.currency) }}
              </p>
              <p class="text-sm text-[#6B7280]">
                ≈¥ {{ formatCurrency(summaryData.gmv.cnyEquivalent.thisMonth, 'CNY') }}
              </p>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DashboardTodo class="lg:col-span-1" />

          <article class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <button @click="isScheduleOpen = true" class="text-left text-lg font-semibold text-[#1F2937] transition hover:text-[#3B82F6]">
              日程总览
            </button>
            <p class="mt-3 text-sm font-medium text-[#1F2937]">本周重点</p>
            <p class="mt-1 text-sm text-[#6B7280] line-clamp-5">
              {{ summaryData.schedule.planNextWeek || '暂无计划，建议在周报中补充。' }}
            </p>
          </article>

          <DashboardRecurringTask class="lg:col-span-1" />
        </section>
      </div>

      <div class="space-y-6">
        <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h4 class="mb-4 text-lg font-semibold text-[#1F2937]">今日汇率 (CNY)</h4>
          <div v-if="isLoading.rates" class="text-[#6B7280]">
            加载汇率中...
          </div>
          <div v-else class="space-y-4">
            <div class="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
              <span class="text-sm font-medium text-[#1F2937]">1 CNY =</span>
              <span class="text-lg font-semibold text-[#10B981]">
                {{ ratesData.CNY_USD?.toFixed(4) || 'N/A' }} USD
              </span>
            </div>
            <div class="space-y-2 text-sm">
              <div
                v-for="code in userCountryCodesForRates"
                :key="code"
                class="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-3 py-2"
              >
                <span class="font-medium text-[#1F2937]">1 CNY =</span>
                <span class="font-semibold text-[#1F2937]">
                  {{ ratesData[`CNY_${code}`]?.toFixed(2) || 'N/A' }} {{ code }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <DashboardSchedule
      :is-open="isScheduleOpen"
      :plan-next-week="summaryData.schedule.planNextWeek"
      :team-focus="summaryData.schedule.teamFocus"
      @close="isScheduleOpen = false"
    />
  </div>
</template>

<script setup>
// Bug 修复
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import { ChevronUpDownIcon } from '@heroicons/vue/20/solid';

import DashboardTodo from './DashboardTodo.vue';
import DashboardSchedule from './DashboardSchedule.vue';
import DashboardRecurringTask from './DashboardRecurringTask.vue';

const authStore = useAuthStore();

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const todayDate = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
);

const hitokoto = ref('...');

const isLoading = ref({
  summary: true,
  rates: true,
  filters: true,
});

const summaryData = ref({
  gmv: { today: 0, thisWeek: 0, thisMonth: 0, currency: '¥', cnyEquivalent: { today: 0, thisWeek: 0, thisMonth: 0 } },
  schedule: { planNextWeek: '加载中...', teamFocus: '' },
});
const ratesData = ref({});
const allCountries = ref([]);
const allStores = ref([]);
const selectedCountryCode = ref(null);
const selectedStoreId = ref(null);
const isScheduleOpen = ref(false);

const countryFilterOptions = computed(() => {
  const countries = allCountries.value.map((c) => ({ code: c.code, name: c.name }));
  if (authStore.role === 'admin') return countries;
  const operatedCountries = authStore.operatedCountries || [];
  return countries.filter((c) => operatedCountries.includes(c.code));
});

const storeFilterOptions = computed(() => {
  if (!selectedCountryCode.value) {
    return []; // 如果没有选国家，列表为空
  }
  
  // 核心修复：根据 allStores 列表，筛选出 store.countryCode 
  // 等于 selectedCountryCode.value (当前选中的国家按钮) 的店铺
  return allStores.value.filter(
    (store) => store.countryCode === selectedCountryCode.value
  );
});
const selectedStoreName = computed(() => {
  const store = storeFilterOptions.value.find((s) => s.id === selectedStoreId.value);
  return store ? store.name : '选择店铺...';
});

const highlightMetrics = computed(() => {
  if (isLoading.value.summary) {
    return [
      { label: '今日 GMV', value: '加载中', sub: '数据抓取中' },
      { label: '本周 GMV', value: '加载中', sub: '数据抓取中' },
      { label: '本月 GMV', value: '加载中', sub: '数据抓取中' },
      { label: '团队计划', value: '同步中', sub: '请稍候' },
    ];
  }
  const { gmv, schedule } = summaryData.value;
  const cny = gmv.cnyEquivalent || {};
  return [
    {
      label: '今日 GMV',
      value: formatCurrency(gmv.today, gmv.currency),
      sub: `≈¥ ${formatCurrency(cny.today, 'CNY')}`,
    },
    {
      label: '本周 GMV',
      value: formatCurrency(gmv.thisWeek, gmv.currency),
      sub: `≈¥ ${formatCurrency(cny.thisWeek, 'CNY')}`,
    },
    {
      label: '本月 GMV',
      value: formatCurrency(gmv.thisMonth, gmv.currency),
      sub: `≈¥ ${formatCurrency(cny.thisMonth, 'CNY')}`,
    },
    {
      label: '团队计划',
      value: schedule.planNextWeek ? '已同步' : '待填写',
      sub: schedule.planNextWeek || '周报 > 下周计划',
    },
  ];
});

const userCountryCodesForRates = computed(() => {
  if (authStore.role === 'admin') {
    return ['IDR', 'VND', 'THB', 'MYR', 'PHP', 'SGD'];
  }
  return authStore.operatedCountries
    .map((code) => {
      const currencyMap = { ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD' };
      return currencyMap[code];
    })
    .filter(Boolean);
});

async function fetchHitokoto() {
  try {
    const response = await fetch('https://v1.hitokoto.cn/?c=i&encode=text');
    hitokoto.value = await response.text();
  } catch (error) {
    hitokoto.value = '今天也要加油。';
  }
}

async function fetchFilterOptions() {
  isLoading.value.filters = true;
  try {
    const response = await apiClient.get('/dashboard/filter-options');
    allCountries.value = response.data.countries;
    allStores.value = response.data.stores;

    // 步骤 1: 设置国家
    if (countryFilterOptions.value.length > 0) {
      selectedCountryCode.value = countryFilterOptions.value[0].code;
    }
    
    // 步骤 2: (核心修复) 等待 Vue 响应，让 storeFilterOptions (已修复) 重新计算
    await nextTick(); 

    // 步骤 3: 现在 storeFilterOptions 已经更新了，可以安全地设置店铺
    if (storeFilterOptions.value.length > 0) {
      selectedStoreId.value = storeFilterOptions.value[0].id;
    }
  } catch (error) {
    console.error('加载筛选器失败:', error);
  } finally {
    isLoading.value.filters = false;
  }
}

async function fetchDashboardData() {
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
    const schedule = summaryResponse.data.schedule || {};
    summaryData.value = {
      ...summaryResponse.data,
      schedule: {
        planNextWeek: schedule.planNextWeek || '',
        teamFocus: schedule.teamFocus || '',
      },
    };
    ratesData.value = ratesResponse.data;
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
  } finally {
    isLoading.value.summary = false;
    isLoading.value.rates = false;
  }
}

onMounted(async () => {
  fetchHitokoto();
  await fetchFilterOptions();
  fetchDashboardData();
});

function selectCountry(code) {
  selectedCountryCode.value = code;
  const firstStore = storeFilterOptions.value[0];
  selectedStoreId.value = firstStore ? firstStore.id : null;
}

watch(selectedCountryCode, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  if (!storeFilterOptions.value.find((s) => s.id === selectedStoreId.value)) {
    const firstStore = storeFilterOptions.value[0];
    selectedStoreId.value = firstStore ? firstStore.id : null;
  }
  fetchDashboardData();
});

watch(selectedStoreId, (newVal, oldVal) => {
  if (newVal === oldVal || !newVal) return;
  fetchDashboardData();
});

function formatCurrency(value, currency) {
  if (currency === 'CNY') {
    return (value || 0).toFixed(2);
  }
  return (value || 0).toFixed(0);
}
</script>

<style lang="postcss">
@import "tailwindcss" reference;

.dashboard-widget {
  @apply bg-white p-6 rounded-lg shadow-lg h-full flex flex-col;
}
.dashboard-widget-title {
  font-weight: 700;
  color: #1F2937;
}
.form-input {
  display: block;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #E5E7EB;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  font-size: 0.875rem;
  color: #1F2937;
}
</style>
