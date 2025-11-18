<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">销售数据管理</h2>

    <div class="p-4 bg-white rounded-lg shadow space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="input-group">
          <label for="startDate">开始日期</label>
          <input type="date" id="startDate" v-model="filters.startDate" class="form-input" />
        </div>
        <div class="input-group">
          <label for="endDate">结束日期</label>
          <input type="date" id="endDate" v-model="filters.endDate" class="form-input" />
        </div>
        
        <div class="input-group">
          <label for="filterCountry">国家</label>
          <select id="filterCountry" v-model="filters.countryCode" class="form-input">
            <option value="">所有国家</option>
            <option v-for="country in countryOptions" :key="country.code" :value="country.code">
              {{ country.name }} ({{ country.code }})
            </option>
          </select>
        </div>
        
        <div class="input-group">
          <label for="filterPlatform">平台</label>
          <select id="filterPlatform" v-model="filters.platform" class="form-input">
            <option value="">所有平台</option>
            <option v-for="platform in platformOptions" :key="platform" :value="platform">
              {{ platform }}
            </option>
          </select>
        </div>
        
        <div class="input-group col-span-1 md:col-span-2">
          <label for="filterStore">店铺</label>
          <select id="filterStore" v-model="filters.storeId" :disabled="!filters.countryCode && !filters.platform" class="form-input disabled:bg-gray-100">
            <option value="">所有店铺</option>
            <option v-for="store in storeOptions" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="flex justify-end space-x-4">
        <button @click="resetFilters" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <ArrowPathIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
          重置
        </button>
        <button @click="fetchData(true)" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <FunnelIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
          查询
        </button>
      </div>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载数据...</p>
    <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>
    
    <div v-if="!isLoading && salesData.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200">
          <thead class="bg-stone-50">
            <tr>
              <th @click="setSort('recordDate')" class="table-th cursor-pointer">
                日期 <SortIcon :field="'recordDate'" :sorting="sorting" />
              </th>
              <th class="table-th">国家</th>
              <th class="table-th">店铺</th>
              <th class="table-th">商品链接 / SKU</th>
              <th @click="setSort('salesVolume')" class="table-th cursor-pointer">
                销量 <SortIcon :field="'salesVolume'" :sorting="sorting" />
              </th>
              <th @click="setSort('revenue')" class="table-th cursor-pointer">
                销售额 <SortIcon :field="'revenue'" :sorting="sorting" />
              </th>
              <th class="table-th">备注</th>
              <th class="table-th">录入人</th>
              <th class="table-th">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-stone-200">
            <tr v-for="row in salesData" :key="row.id">
              <td class="table-td">{{ formatDate(row.recordDate) }}</td>
              <td class="table-td">{{ row.store.country.name }}</td>
              <td class="table-td">{{ row.store.name }}</td>
              <td class="table-td">
                <div v-if="row.listing && row.listing.productCode" class="flex flex-col">
                  <span class="font-semibold text-indigo-600">{{ row.listing.productCode }}</span>
                  <span class="text-xs text-stone-500">{{ row.product.sku }}</span>
                </div>
                <div v-else class="text-stone-600">
                  {{ row.product.sku }} <span class="text-xs text-stone-400">(旧数据)</span>
                </div>
              </td>
              <td class="table-td">{{ row.salesVolume }}</td>
              <td class="table-td">{{ row.revenue.toFixed(2) }}</td>
              <td class="table-td max-w-xs truncate" :title="row.notes || ''">{{ row.notes || 'N/A' }}</td>
              <td class="table-td">{{ row.enteredBy.nickname }}</td>
              <td class="table-td">
                <div v-if="row.canManage">
                  <button @click="openEditModal(row)" class="text-indigo-600 hover:text-indigo-900 mr-4">
                    修改
                  </button>
                  <button @click="handleDelete(row.id)" class="text-red-600 hover:text-red-900">
                    删除
                  </button>
                </div>
                <span v-else class="text-gray-400 text-xs">无权限</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div class="flex flex-1 justify-between sm:hidden">
          <button @click="changePage(page - 1)" :disabled="page <= 1" class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            上一页
          </button>
          <button @click="changePage(page + 1)" :disabled="page >= totalPages" class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            下一页
          </button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              显示第
              <span class="font-medium">{{ (page - 1) * pageSize + 1 }}</span>
              至
              <span class="font-medium">{{ Math.min(page * pageSize, total) }}</span>
              条，共
              <span class="font-medium">{{ total }}</span>
              条
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button @click="changePage(page - 1)" :disabled="page <= 1" class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">上一页</span>
                <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                {{ page }} / {{ totalPages }}
              </span>
              <button @click="changePage(page + 1)" :disabled="page >= totalPages" class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">下一页</span>
                <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>

    </div>
    
    <div v-if="!isLoading && salesData.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>未找到符合条件的数据。</p>
    </div>
  </div>

  <SalesDataEditModal
    :is-open="isModalOpen"
    :sale-data-to-edit="selectedSaleData"
    @close="closeModal"
    @sale-updated="handleSaleUpdated"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import SalesDataEditModal from './SalesDataEditModal.vue';
import { FunnelIcon, ArrowPathIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid';

// --- 状态 (State) ---
const salesData = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const authStore = useAuthStore();

// 分页状态
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);

// 筛选器状态
const allStores = ref([]);
const defaultFilters = () => ({
  startDate: '',
  endDate: '',
  countryCode: '',
  platform: '',
  storeId: '',
});
const filters = ref(defaultFilters());
const sorting = ref({ by: 'recordDate', order: 'desc' });

// 弹窗状态
const isModalOpen = ref(false);
const selectedSaleData = ref(null);

// --- 帮助组件：排序图标 ---
const SortIcon = {
  props: ['field', 'sorting'],
  components: { ChevronUpIcon, ChevronDownIcon },
  template: `
    <span class="inline-block w-4">
      <ChevronUpIcon v-if="sorting.by === field && sorting.order === 'asc'" class="h-4 w-4" />
      <ChevronDownIcon v-if="sorting.by === field && sorting.order === 'desc'" class="h-4 w-4" />
    </span>
  `
};

// --- 核心方法 (Methods) ---

async function fetchData(resetPage = false) {
  if (resetPage) {
    page.value = 1;
  }
  isLoading.value = true;
  errorMessage.value = '';
  
  const params = {
    sortBy: sorting.value.by,
    sortOrder: sorting.value.order,
    page: page.value,
    pageSize: pageSize.value,
  };
  
  for (const key in filters.value) {
    if (filters.value[key]) {
      params[key] = filters.value[key];
    }
  }

  try {
    const response = await apiClient.get('/sales-data', { params });
    
    if (Array.isArray(response.data)) {
      // 兼容旧接口
      salesData.value = response.data;
      total.value = response.data.length;
    } else {
      // 新分页接口
      salesData.value = response.data.data;
      total.value = response.data.total;
      page.value = response.data.page;
    }
  } catch (error) {
    console.error('获取销售数据失败:', error);
    errorMessage.value = '获取数据失败，请重试。';
  } finally {
    isLoading.value = false;
  }
}

async function fetchStoresForFilter() {
  try {
    const response = await apiClient.get('/stores-list');
    allStores.value = response.data;
  } catch (error) {
    console.error('获取店铺列表失败(用于筛选):', error);
  }
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return;
  page.value = newPage;
  fetchData(false);
}

onMounted(() => {
  fetchData();
  fetchStoresForFilter();
});

// ... (后续代码如 countryOptions, platformOptions 等保持不变)
const countryOptions = computed(() => {
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authStore.role === 'admin') {
    return allUniqueCountries; 
  }
  const userCountryCodes = authStore.operatedCountries; 
  return allUniqueCountries.filter(country => 
    userCountryCodes.includes(country.code)
  );
});

const platformOptions = computed(() => {
  let storesToFilter = allStores.value;
  if (filters.value.countryCode) {
    storesToFilter = storesToFilter.filter(store => store.countryCode === filters.value.countryCode);
  }
  const platforms = storesToFilter.map(store => store.platform);
  return [...new Set(platforms)].sort();
});

const storeOptions = computed(() => {
  let storesToFilter = allStores.value;
  
  if (filters.value.countryCode) {
    storesToFilter = storesToFilter.filter(store => 
      store.countryCode === filters.value.countryCode
    );
  }
  if (filters.value.platform) {
    storesToFilter = storesToFilter.filter(store =>
      store.platform === filters.value.platform
    );
  }
  
  return storesToFilter.sort((a, b) => a.name.localeCompare(b.name));
});

watch(() => filters.value.countryCode, () => {
  filters.value.storeId = '';
});
watch(() => filters.value.platform, () => {
  filters.value.storeId = '';
});

function resetFilters() {
  filters.value = defaultFilters();
  sorting.value = { by: 'recordDate', order: 'desc' };
  fetchData(true); // 重置筛选时也重置页码
}

function setSort(field) {
  if (sorting.value.by === field) {
    sorting.value.order = sorting.value.order === 'asc' ? 'desc' : 'asc';
  } else {
    sorting.value.by = field;
    sorting.value.order = 'desc';
  }
  fetchData(false); // 排序时保持在当前页
}

async function handleDelete(id) {
  if (confirm('确定要删除这条销售数据吗？此操作不可逆。')) {
    try {
      await apiClient.delete(`/sales-data/${id}`);
      salesData.value = salesData.value.filter(row => row.id !== id);
    } catch (error) {
      console.error('删除失败:', error);
      errorMessage.value = error.response?.data?.error || '删除失败，请重试。';
    }
  }
}

function openEditModal(row) {
  selectedSaleData.value = row;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedSaleData.value = null;
}

function handleSaleUpdated(updatedRow) {
  const index = salesData.value.findIndex(row => row.id === updatedRow.id);
  if (index !== -1) {
    salesData.value[index] = updatedRow;
  }
  closeModal();
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
</script>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; 
}
.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.table-th {
  padding: 0.75rem 1.5rem; 
  text-align: left;
  font-size: 0.75rem; 
  font-weight: 500;
  color: #6b7280; 
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.table-td {
  padding: 1rem 1.5rem; 
  white-space: nowrap;
  font-size: 0.875rem; 
  color: #374151; 
}
</style>