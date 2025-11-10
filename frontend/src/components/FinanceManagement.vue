<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">支出查询</h2>

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
          <label for="filterCountry">归属国家</label>
          <select id="filterCountry" v-model="filters.countryCode" class="form-input">
            <option value="">所有国家</option>
            <option v-for="country in countryOptions" :key="country.code" :value="country.code">
              {{ country.name }} ({{ country.code }})
            </option>
          </select>
        </div>
        
        <div class="input-group">
          <label for="filterStore">归属店铺</label>
          <select id="filterStore" v-model="filters.storeId" :disabled="!filters.countryCode" class="form-input disabled:bg-gray-100">
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
    
    <div v-if="!isLoading && expenses.length > 0" class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th @click="setSort('expenseDate')" class="table-th cursor-pointer">
              支出日期 <SortIcon :field="'expenseDate'" :sorting="sorting" />
            </th>
            <th class="table-th">项目</th>
            <th @click="setSort('amount')" class="table-th cursor-pointer">
              金额 <SortIcon :field="'amount'" :sorting="sorting" />
            </th>
            <th class="table-th">付款方式</th> <th class="table-th">付款方</th>
            <th class="table-th">收款方</th>
            <th class="table-th">归属店铺</th>
            <th class="table-th">是否垫付</th>
            <th class="table-th">票据状态</th> <th class="table-th">录入人</th>
            <th class="table-th">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="row in expenses" :key="row.id">
            <td class="table-td">{{ formatDate(row.expenseDate) }}</td>
            <td class="table-td max-w-xs truncate" :title="row.itemDescription">{{ row.itemDescription }}</td>
            <td class="table-td">{{ row.amount.toFixed(2) }}</td>
            <td class="table-td">{{ paymentMethodMap[row.paymentMethod] || row.paymentMethod }}</td> <td class="table-td">{{ row.payer }}</td>
            <td class="table-td">{{ row.payee }}</td>
            <td class="table-td">{{ row.store?.name || 'N/A' }}</td>
            <td class="table-td">
              <span v-if="row.isAdvancePayment" class="text-red-600 font-semibold">是</span>
              <span v-else class="text-gray-400">否</span>
            </td>
            <td class="table-td">{{ invoiceStatusMap[row.invoiceStatus] || row.invoiceStatus }}</td> <td class="table-td">{{ row.enteredBy.nickname }}</td>
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
    
    <div v-if="!isLoading && expenses.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>未找到符合条件的数据。</p>
    </div>
  </div>

  <FinanceEditModal
    :is-open="isModalOpen"
    :expense-to-edit="selectedExpense"
    @close="closeModal"
    @expense-updated="handleExpenseUpdated"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import FinanceEditModal from './FinanceEditModal.vue'; 
import { FunnelIcon, ArrowPathIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/20/solid';

// ⬇️ --- 【新增】 中文翻译 ---
const paymentMethodMap = {
  ALIPAY: '支付宝',
  WECHAT_PAY: '微信支付',
  BANK_TRANSFER: '银行转账',
  CREDIT_CARD: '信用卡',
  CASH: '现金',
  OTHER: '其他'
};
const invoiceStatusMap = {
  NONE: '无票',
  REGULAR: '普票',
  SPECIAL: '专票'
};
// ⬆️ --- 【新增】 ---

// --- 状态 (State) ---
const expenses = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const authStore = useAuthStore();

// 筛选器状态
const allStores = ref([]);
const defaultFilters = () => ({
  startDate: '',
  endDate: '',
  countryCode: '',
  storeId: '',
});
const filters = ref(defaultFilters());
const sorting = ref({ by: 'expenseDate', order: 'desc' });

// 弹窗状态
const isModalOpen = ref(false);
const selectedExpense = ref(null);

// --- 帮助组件：排序图标 ---
// ... (不变) ...
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
// ... (不变) ...
async function fetchData(showLoading = true) {
  if (showLoading) isLoading.value = true;
  errorMessage.value = '';
  
  const params = {
    sortBy: sorting.value.by,
    sortOrder: sorting.value.order,
  };
  
  for (const key in filters.value) {
    if (filters.value[key]) {
      params[key] = filters.value[key];
    }
  }

  try {
    const response = await apiClient.get('/admin/expenses', { params }); // ⬅️ API 变更
    expenses.value = response.data;
  } catch (error) {
    console.error('获取支出数据失败:', error);
    errorMessage.value = '获取数据失败，请重试。';
  } finally {
    if (showLoading) isLoading.value = false;
  }
}

// 2. 获取筛选器选项 (用于下拉菜单)
// ... (不变) ...
async function fetchStoresForFilter() {
  try {
    const response = await apiClient.get('/admin/stores'); // (复用)
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

// 3. 筛选器相关 (级联菜单 - 复用 SalesDataManagement)
// ... (不变) ...
const countryOptions = computed(() => {
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  // (权限) Admin 看所有，主管只看自己负责的
  if (authStore.role === 'admin') {
    return allUniqueCountries; 
  }
  const userCountryCodes = authStore.supervisedCountries; // ⬅️ 注意：查询用主管权限
  return allUniqueCountries.filter(country => 
    userCountryCodes.includes(country.code)
  );
});

const storeOptions = computed(() => {
  let storesToFilter = allStores.value;
  
  if (filters.value.countryCode) {
    storesToFilter = storesToFilter.filter(store => 
      store.countryCode === filters.value.countryCode
    );
  }
  // (移除了 platform 筛选)
  
  return storesToFilter.sort((a, b) => a.name.localeCompare(b.name));
});

// (级联)
watch(() => filters.value.countryCode, () => {
  filters.value.storeId = '';
});

// 4. 操作 (筛选、重置、排序)
// ... (不变) ...
function resetFilters() {
  filters.value = defaultFilters();
  sorting.value = { by: 'expenseDate', order: 'desc' };
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
// ... (不变) ...
async function handleDelete(id) {
  if (confirm('确定要删除这条支出数据吗？此操作不可逆。')) {
    try {
      await apiClient.delete(`/admin/expenses/${id}`); // ⬅️ API 变更
      expenses.value = expenses.value.filter(row => row.id !== id);
    } catch (error) {
      console.error('删除失败:', error);
      errorMessage.value = error.response?.data?.error || '删除失败，请重试。';
    }
  }
}

// 6. 弹窗控制
// ... (不变) ...
function openEditModal(row) {
  selectedExpense.value = row;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedExpense.value = null;
}

function handleExpenseUpdated(updatedRow) {
  const index = expenses.value.findIndex(row => row.id === updatedRow.id);
  if (index !== -1) {
    expenses.value[index] = updatedRow;
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
/* (复用 SalesDataManagement 的样式) */
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