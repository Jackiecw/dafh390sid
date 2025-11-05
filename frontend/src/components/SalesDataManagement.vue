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
    
    <div v-if="!isLoading && salesData.length > 0" class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th @click="setSort('recordDate')" class="table-th cursor-pointer">
              日期 <SortIcon :field="'recordDate'" :sorting="sorting" />
            </th>
            <th class="table-th">国家</th>
            <th class="table-th">店铺</th>
            <th class="table-th">商品 (SKU)</th>
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
            <td class="table-td">{{ row.product.sku }}</td>
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
import { FunnelIcon, ArrowPathIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/20/solid';

// --- 状态 (State) ---
const salesData = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const authStore = useAuthStore();

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

// 1. 获取数据 (核心)
async function fetchData(showLoading = true) {
  if (showLoading) isLoading.value = true;
  errorMessage.value = '';
  
  // 准备查询参数
  const params = {
    sortBy: sorting.value.by,
    sortOrder: sorting.value.order,
  };
  
  // 添加非空筛选
  for (const key in filters.value) {
    if (filters.value[key]) {
      params[key] = filters.value[key];
    }
  }

  try {
    const response = await apiClient.get('/sales-data', { params });
    salesData.value = response.data;
  } catch (error) {
    console.error('获取销售数据失败:', error);
    errorMessage.value = '获取数据失败，请重试。';
  } finally {
    if (showLoading) isLoading.value = false;
  }
}

// 2. 获取筛选器选项 (用于下拉菜单)
async function fetchStoresForFilter() {
  try {
    const response = await apiClient.get('/admin/stores');
    allStores.value = response.data;
  } catch (error) {
    console.error('获取店铺列表失败(用于筛选):', error);
  }
}

// (生命周期) 页面加载时
onMounted(() => {
  fetchData();
  fetchStoresForFilter();
});

// 3. 筛选器相关 (级联菜单)
const countryOptions = computed(() => {
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  // (权限) Admin 看所有，运营只看自己负责的
  if (authStore.role === 'admin') {
    return allUniqueCountries; 
  }
  const userCountryCodes = authStore.operatedCountries; 
  return allUniqueCountries.filter(country => 
    userCountryCodes.includes(country.code)
  );
});

// ⬇️ 【修改】
const platformOptions = computed(() => {
  let storesToFilter = allStores.value;
  // (如果选择了国家，先按国家过滤)
  if (filters.value.countryCode) {
    storesToFilter = storesToFilter.filter(store => store.countryCode === filters.value.countryCode);
  }
  const platforms = storesToFilter.map(store => store.platform);
  return [...new Set(platforms)].sort();
});

// ⬇️ 【修改】
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

// (级联) ⬇️ 【修改】
watch(() => filters.value.countryCode, () => {
  // (不再重置 platform，只重置 store)
  filters.value.storeId = '';
});
watch(() => filters.value.platform, () => {
  filters.value.storeId = '';
});

// 4. 操作 (筛选、重置、排序)
function resetFilters() {
  filters.value = defaultFilters();
  sorting.value = { by: 'recordDate', order: 'desc' };
  fetchData();
}

function setSort(field) {
  if (sorting.value.by === field) {
    sorting.value.order = sorting.value.order === 'asc' ? 'desc' : 'asc';
  } else {
    sorting.value.by = field;
    sorting.value.order = 'desc';
  }
  fetchData(false); // (重新排序时不显示全屏加载)
}

// 5. CRUD 操作
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

// 6. 弹窗控制
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

// --- 辅助函数 ---
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}

</script>

<style scoped>
/* (复用样式) */
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.table-th {
  padding: 0.75rem 1.5rem; /* 12px 24px */
  text-align: left;
  font-size: 0.75rem; /* 12px */
  font-weight: 500;
  color: #6b7280; /* stone-500 */
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.table-td {
  padding: 1rem 1.5rem; /* 16px 24px */
  white-space: nowrap;
  font-size: 0.875rem; /* 14px */
  color: #374151; /* stone-700 */
}
</style>