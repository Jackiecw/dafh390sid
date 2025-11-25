<template>
  <div class="space-y-6">
    <!-- 头部数据概览 -->
    <section class="rounded-xl bg-sky-600 p-6 text-white shadow">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-white/70">Production & Logistics</p>
          <h2 class="text-2xl font-semibold">生产与物流管理</h2>
          <p class="text-sm text-white/80">订单状态全链路追踪与控制中心。</p>
        </div>
        <div class="flex flex-wrap gap-4">
          <div class="rounded-lg bg-white/15 px-4 py-2">
            <p class="text-xs text-white/70">进行中订单</p>
            <p class="text-xl font-bold">{{ summary.totalQuantity }}</p>
          </div>
          <div class="rounded-lg bg-white/15 px-4 py-2">
            <p class="text-xs text-white/70">在途货值</p>
            <p class="text-xl font-bold">¥{{ formatNumber(summary.totalPrice) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 筛选与操作栏 -->
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="input-group">
          <label class="text-xs font-semibold text-gray-500">视图</label>
          <div class="flex rounded-md bg-gray-100 p-1">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="changeTab(tab.key)"
              :class="['px-4 py-1.5 text-sm font-medium rounded-md transition', filter.view === tab.key ? 'bg-white text-sky-600 shadow' : 'text-gray-500 hover:text-gray-700']"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="text-xs font-semibold text-gray-500">搜索</label>
          <input 
            v-model="filter.keyword" 
            placeholder="SKU / 订单号 / 批次号" 
            class="form-input h-9 w-48 text-sm"
            @keyup.enter="fetchData(1)"
          />
        </div>

        <div class="input-group">
          <label class="text-xs font-semibold text-gray-500">国家</label>
          <select v-model="filter.countryCode" class="form-input h-9 text-sm" @change="fetchData(1)">
            <option value="">全部</option>
            <option v-for="c in countryOptions" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
        </div>

        <div class="flex-1"></div>

        <div class="flex gap-2">
          <button 
            @click="fetchData(1)" 
            class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon class="h-4 w-4" /> 刷新
          </button>
          <button 
            v-if="isAdmin"
            @click="handleExport" 
            class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon class="h-4 w-4" /> 导出
          </button>
          <button
            v-if="isAdmin"
            @click="isCreateModalOpen = true"
            class="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <PlusIcon class="h-4 w-4" /> 新建批次
          </button>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="selectedOrderIds.length > 0 && isAdmin" class="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-2 border border-indigo-100">
        <span class="text-sm text-indigo-700 font-medium">已选择 {{ selectedOrderIds.length }} 个订单</span>
        <div class="flex gap-2">
          <select v-model="batchActionStatus" class="form-select text-sm border-indigo-200 rounded">
            <option value="" disabled>选择更新状态...</option>
            <option v-for="s in statusSteps" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
          <button 
            @click="executeBatchUpdate" 
            :disabled="!batchActionStatus"
            class="rounded bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            批量更新
          </button>
          <button @click="selectedOrderIds = []" class="text-xs text-gray-500 hover:text-gray-700 ml-2">取消选择</button>
        </div>
      </div>
    </section>

    <!-- 订单列表表格 -->
    <section class="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th v-if="isAdmin" class="px-4 py-3 w-10">
                <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" class="rounded border-gray-300" />
              </th>
              <th class="px-4 py-3 text-left">批次/编号</th>
              <th class="px-4 py-3 text-left">SKU / 名称</th>
              <th class="px-4 py-3 text-left">规格 / 地区</th>
              <th class="px-4 py-3 text-left">当前状态</th>
              <th class="px-4 py-3 text-left">数量</th>
              <th class="px-4 py-3 text-left">总价</th>
              <th class="px-4 py-3 text-left">物流费用</th>
              <th class="px-4 py-3 text-left">物流信息</th>
              <th class="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="isLoading" class="animate-pulse">
              <td colspan="10" class="p-8 text-center text-gray-400">加载数据中...</td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="10" class="p-8 text-center text-gray-400">暂无数据</td>
            </tr>
            <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50 transition-colors">
              <td v-if="isAdmin" class="px-4 py-3">
                <input type="checkbox" v-model="selectedOrderIds" :value="order.id" class="rounded border-gray-300" />
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ order.orderCode }}</div>
                <div class="text-xs text-gray-500">批次: {{ order.batchCode }}</div>
                <div class="text-xs text-gray-400">{{ formatDate(order.orderDate) }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ order.skuName }}</div>
                <div class="text-xs text-gray-500">{{ order.productName }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ order.productColor }}</div>
                <div class="text-xs text-gray-500">{{ order.productSpec }} · {{ order.plugSpec }}</div>
                <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 mt-1">
                  {{ order.salesRegion }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(order.status)]">
                  {{ statusLabel(order.status) }}
                </span>
                <div v-if="order.statusDate" class="text-xs text-gray-400 mt-1">
                  {{ formatDate(order.statusDate) }}
                </div>
              </td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ order.quantity }}</td>
              <td class="px-4 py-3 text-gray-900">
                {{ formatCurrency(order.totalPrice) }}
                <div class="text-xs text-gray-400">@ {{ order.unitPrice }}</div>
              </td>
              <td class="px-4 py-3 text-gray-900 font-medium">
                {{ order.logisticsFee ? formatCurrency(order.logisticsFee) : '-' }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-500">
                <div v-if="order.logisticsProvider">物流: {{ order.logisticsProvider }}</div>
                <div v-if="order.cartonCount">箱数: {{ order.cartonCount }}</div>
                <div v-if="order.totalCbm">Vol: {{ order.totalCbm }} m³</div>
              </td>
              <td class="px-4 py-3">
                <button @click="openDetail(order)" class="text-indigo-600 hover:text-indigo-900 text-xs font-medium mr-2">详情</button>
                <button v-if="isAdmin" @click="handleDelete(order.id)" class="text-red-500 hover:text-red-700 text-xs">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页器 -->
      <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              显示第 <span class="font-medium">{{ (pagination.page - 1) * pagination.pageSize + 1 }}</span> 至 <span class="font-medium">{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }}</span> 条，共 <span class="font-medium">{{ pagination.total }}</span> 条
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 1" class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
              </button>
              <button @click="changePage(pagination.page + 1)" :disabled="pagination.page * pagination.pageSize >= pagination.total" class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </section>

    <!-- 详情弹窗 (直接复用之前的逻辑，但建议提取为组件，这里简化直接展示) -->
    <LogisticsDetailModal 
      v-if="detailModalOpen" 
      :order-id="selectedDetailId" 
      :is-open="detailModalOpen"
      @close="closeDetail"
      @refresh="fetchData(pagination.page)"
    />

    <LogisticsBatchFormModal 
      :is-open="isCreateModalOpen" 
      @close="isCreateModalOpen = false" 
      @batch-created="fetchData(1)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import { ArrowPathIcon, ArrowDownTrayIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid';
import LogisticsBatchFormModal from './LogisticsBatchFormModal.vue';
import LogisticsDetailModal from './LogisticsEventModal.vue'; // 实际上是订单详情+更新弹窗

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

const tabs = [
  { key: 'in-progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'all', label: '全部' }
];

const filter = ref({
  view: 'in-progress',
  keyword: '',
  countryCode: '',
  startDate: '',
  endDate: ''
});

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
});

const summary = ref({ totalQuantity: 0, totalPrice: 0 });
const orders = ref([]);
const isLoading = ref(false);
const countryOptions = ref([]);

const isCreateModalOpen = ref(false);
const selectedOrderIds = ref([]);
const batchActionStatus = ref('');

// 详情弹窗控制
const detailModalOpen = ref(false);
const selectedDetailId = ref(null);

// 状态定义
const statusSteps = [
  { key: 'IN_PRODUCTION', label: '生产中' },
  { key: 'PRODUCTION_DONE', label: '生产完成' },
  { key: 'SHIPPED_OUT', label: '已出库' },
  { key: 'CONTAINER_LOADED', label: '已装柜' },
  { key: 'EXPORTED', label: '出口' },
  { key: 'IN_TRANSIT', label: '运输' },
  { key: 'IMPORTED', label: '进口' },
  { key: 'DELIVERING', label: '派送' },
  { key: 'WAREHOUSED', label: '已入仓' },
];

async function fetchOptions() {
  try {
    const res = await apiClient.get('/admin/countries');
    countryOptions.value = res.data;
  } catch (e) { console.error(e); }
}

async function fetchData(page = 1) {
  isLoading.value = true;
  selectedOrderIds.value = []; // 翻页清空选择
  try {
    const params = {
      page,
      pageSize: pagination.value.pageSize,
      view: filter.value.view,
      keyword: filter.value.keyword,
      countryCode: filter.value.countryCode,
      startDate: filter.value.startDate,
      endDate: filter.value.endDate
    };
    const res = await apiClient.get('/production/orders', { params });
    orders.value = res.data.data;
    pagination.value.page = res.data.page;
    pagination.value.total = res.data.total;
    summary.value = res.data.summary;
  } catch (error) {
    console.error('加载失败', error);
  } finally {
    isLoading.value = false;
  }
}

function changeTab(key) {
  filter.value.view = key;
  fetchData(1);
}

function changePage(newPage) {
  fetchData(newPage);
}

async function handleExport() {
  try {
    const params = {
      view: filter.value.view,
      keyword: filter.value.keyword,
      countryCode: filter.value.countryCode,
      startDate: filter.value.startDate,
      endDate: filter.value.endDate
    };
    const response = await apiClient.get('/admin/production/export', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Production_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
    link.click();
  } catch (error) {
    alert('导出失败');
  }
}

async function executeBatchUpdate() {
  if (!batchActionStatus.value) return;
  if (!confirm(`确定将选中的 ${selectedOrderIds.value.length} 个订单更新为“${statusLabel(batchActionStatus.value)}”吗？`)) return;
  
  try {
    await apiClient.post('/admin/production/orders/batch-status', {
      orderIds: selectedOrderIds.value,
      status: batchActionStatus.value,
      occurredAt: new Date().toISOString() // 默认为当前时间
    });
    alert('批量更新成功');
    selectedOrderIds.value = [];
    batchActionStatus.value = '';
    fetchData(pagination.value.page);
  } catch (error) {
    alert(error.response?.data?.error || '更新失败');
  }
}

async function handleDelete(id) {
  if (!confirm('确定删除该订单？（软删除）')) return;
  try {
    await apiClient.delete(`/admin/production/orders/${id}`);
    fetchData(pagination.value.page);
  } catch (error) {
    alert('删除失败');
  }
}

// 全选逻辑
const isAllSelected = computed(() => {
  return orders.value.length > 0 && selectedOrderIds.value.length === orders.value.length;
});
function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedOrderIds.value = orders.value.map(o => o.id);
  } else {
    selectedOrderIds.value = [];
  }
}

// 格式化工具
const formatNumber = (v) => v?.toLocaleString() || '0';
const formatCurrency = (v) => v ? `¥${v.toLocaleString()}` : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
const statusLabel = (s) => statusSteps.find(step => step.key === s)?.label || s;
const getStatusColor = (s) => {
  if (s === 'WAREHOUSED') return 'bg-green-100 text-green-800';
  if (s === 'IN_PRODUCTION') return 'bg-yellow-100 text-yellow-800';
  return 'bg-blue-100 text-blue-800';
};

function openDetail(order) {
  // 为了复用逻辑，我们可能需要在这里引入或重构 LogisticsEventModal
  // 这里简单起见，假设该组件接收 orderId 并负责 fetch detail
  selectedDetailId.value = order.id;
  detailModalOpen.value = true;
}
function closeDetail() {
  detailModalOpen.value = false;
  selectedDetailId.value = null;
}

onMounted(() => {
  fetchOptions();
  fetchData();
});
</script>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.form-input {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0 0.75rem;
}
</style>