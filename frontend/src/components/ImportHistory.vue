<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">导入记录管理</h2>
        <p class="mt-1 text-sm text-gray-500">查看历史导入记录，支持按条件筛选及回滚操作。</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-wrap gap-4 items-end">
      <!-- Country Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">国家</label>
        <select v-model="filters.country" class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
          <option value="">全部</option>
          <option v-for="country in availableCountries" :key="country.code" :value="country.code">
            {{ country.name }}
          </option>
        </select>
      </div>

      <!-- Platform Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">平台</label>
        <select v-model="filters.platform" class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
          <option value="">全部</option>
          <option value="SHOPEE">Shopee</option>
          <option value="TIKTOK_SHOP">TikTok Shop</option>
          <option value="LAZADA">Lazada</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <!-- User Filter (Admin/Manager only) -->
      <div v-if="canFilterUser">
        <label class="block text-sm font-medium text-gray-700 mb-1">操作人 (ID)</label>
        <input type="text" v-model="filters.userId" placeholder="输入用户ID" class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>

      <!-- Search Button -->
      <button 
        @click="fetchBatches"
        class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        查询
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">导入时间</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文件名</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">国家</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作人</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据量</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="batch in batches" :key="batch.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ new Date(batch.importedAt).toLocaleString() }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ batch.fileName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ batch.platform }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span v-if="batch.country">{{ batch.country.name }}</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ batch.importedBy?.nickname || batch.importedBy?.username || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ batch.count }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="rollbackBatch(batch)" class="text-red-600 hover:text-red-900">回滚</button>
              </td>
            </tr>
            <tr v-if="batches.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-sm text-gray-500">暂无记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button @click="changePage(page - 1)" :disabled="page === 1" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">上一页</button>
          <button @click="changePage(page + 1)" :disabled="page === totalPages" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">下一页</button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              显示第 <span class="font-medium">{{ (page - 1) * pageSize + 1 }}</span> 到 <span class="font-medium">{{ Math.min(page * pageSize, total) }}</span> 条，
              共 <span class="font-medium">{{ total }}</span> 条
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button @click="changePage(page - 1)" :disabled="page === 1" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                <span class="sr-only">Previous</span>
                <!-- Heroicon name: mini/chevron-left -->
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
                </svg>
              </button>
              <button @click="changePage(page + 1)" :disabled="page === totalPages" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                <span class="sr-only">Next</span>
                <!-- Heroicon name: mini/chevron-right -->
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const batches = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const totalPages = ref(1);

const filters = ref({
  country: '',
  platform: '',
  userId: ''
});

const availableCountries = ref([]);

// Permissions
const canFilterUser = computed(() => authStore.role === 'admin' || (authStore.supervisedCountries && authStore.supervisedCountries.length > 0));

onMounted(async () => {
  await fetchCountries();
  fetchBatches();
});

const fetchCountries = async () => {
  try {
    // We can fetch countries from /admin/countries or just hardcode common ones if API not available to all
    // Or use authStore.operatedCountries/supervisedCountries to populate list
    // Let's try to fetch all if admin, or use store data
    // For now, let's assume we can get a list of countries. 
    // If not, we can use the ones in authStore.
    // Let's try fetching from a public/common endpoint if exists, or just use what we have.
    // Actually, `CountryManagement` uses `/admin/countries`.
    // Let's try to use authStore data first to be safe.
    if (authStore.role === 'admin') {
        const res = await apiClient.get('/admin/countries');
        availableCountries.value = res.data;
    } else {
        // Combine supervised and operated
        const codes = new Set([...(authStore.operatedCountries || []), ...(authStore.supervisedCountries || [])]);
        // We only have codes in authStore (based on login response), we might need names.
        // But wait, login response `operatedCountries` was `{ code: true }`.
        // Let's just show codes if names are missing, or fetch from API if possible.
        // Ideally we should have a public `/countries` endpoint.
        // I'll try to fetch `/admin/countries` and if it fails (403), fallback to codes.
        try {
            const res = await apiClient.get('/admin/countries');
            // Filter by user's access
            availableCountries.value = res.data.filter(c => codes.has(c.code));
        } catch (e) {
            // Fallback
            availableCountries.value = Array.from(codes).map(code => ({ code, name: code }));
        }
    }
  } catch (e) {
    console.error("Failed to fetch countries", e);
  }
};

const fetchBatches = async () => {
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      country: filters.value.country,
      platform: filters.value.platform,
      userId: filters.value.userId
    };
    const response = await apiClient.get('/sales-import/batches', { params });
    batches.value = response.data.data;
    total.value = response.data.total;
    totalPages.value = response.data.totalPages;
  } catch (e) {
    console.error("Failed to fetch batches", e);
    alert("获取记录失败: " + (e.response?.data?.error || e.message));
  }
};

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
    fetchBatches();
  }
};

const rollbackBatch = async (batch) => {
  if (!confirm(`确定要撤销 ${batch.fileName} 的导入吗？\n这将删除该批次导入的所有销售数据，且不可恢复！`)) {
    return;
  }
  
  try {
    await apiClient.delete(`/sales-import/batch/${batch.id}`);
    alert("回滚成功");
    fetchBatches();
  } catch (e) {
    console.error("Rollback failed", e);
    alert("回滚失败: " + (e.response?.data?.error || e.message));
  }
};
</script>
