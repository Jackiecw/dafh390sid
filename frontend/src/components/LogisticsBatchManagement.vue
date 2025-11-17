<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">批次管理</h2>
      <button
        v-if="isAdmin"
        @click="emit('create-batch-request')"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
      >
        + 新建批次
      </button>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载批次数据...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div
      v-if="!isLoading && batches.length > 0"
      class="rounded-lg bg-white shadow overflow-x-auto"
    >
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th class="table-th w-1/12">批次号</th>
            <th class="table-th w-1/l2">订单日期</th>
            <th class="table-th w-2/12">产品 (SKU)</th>
            <th class="table-th w-1/12">销售地</th>
            <th class="table-th w-1/12">数量</th>
            <th class="table-th w-4/12">物流状态 (可视化)</th>
            <th class="table-th w-2/12">预计入仓</th>
            <th v-if="isAdmin" class="table-th w-1/12">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="batch in batches" :key="batch.id" class="hover:bg-gray-50">
            <td class="table-td font-medium text-stone-900">
              {{ batch.batchNumber }}
            </td>
            <td class="table-td">{{ formatDate(batch.orderDate) }}</td>
            <td class="table-td">
              <div class="font-medium">{{ batch.product.sku }}</div>
              <div class="text-xs text-stone-500">{{ batch.product.name }}</div>
            </td>
            <td class="table-td">{{ batch.country.code }}</td>
            <td class="table-td">{{ batch.quantity }}</td>

            <td class="table-td min-w-[400px]">
              <LogisticsStepper
                :current-status="batch.currentStatus"
                :events="batch.events"
                :is-admin="isAdmin"
                @step-click="(status) => onUpdateStatus(batch, status)"
              />
            </td>

            <td class="table-td">
              {{ formatDate(batch.estimatedWarehouseDate) }}
            </td>

            <td v-if="isAdmin" class="table-td">
              <button
                @click="onUpdateStatus(batch, null)"
                class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                title="更新状态"
              >
                更新
              </button>
              <button
                @click="onDelete(batch)"
                class="ml-2 text-red-500 hover:text-red-700"
                title="删除批次"
              >
                <TrashIcon class="h-5 w-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!isLoading && batches.length === 0 && !errorMessage"
      class="p-6 bg-white rounded-lg shadow text-center text-stone-500"
    >
      <p>暂无物流数据。{{ isAdmin ? '点击右上角“新建批次”开始。' : '' }}</p>
    </div>
  </div>
</template>

<script setup>
// (移除了 onMounted, ref(batches), ref(isLoading), ref(errorMessage))
// (只保留了 props, emits, 和辅助函数)
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import LogisticsStepper from './LogisticsStepper.vue';
import { TrashIcon } from '@heroicons/vue/20/solid';

const props = defineProps({
  batches: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  }
});

const emit = defineEmits(['create-batch-request', 'update-status-request', 'delete-batch']);

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

// --- 事件冒泡 (Emit) ---
function onUpdateStatus(batch, targetStatus) {
  emit('update-status-request', { batch, targetStatus });
}

function onDelete(batch) {
  emit('delete-batch', batch);
}

// --- 辅助函数 ---
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
</script>

<style scoped>
/* (样式不变) */
.table-th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #f9fafb;
}
.table-td {
  padding: 1rem 1rem;
  white-space: nowrap;
  font-size: 0.875rem;
  color: #374151;
  vertical-align: middle;
}
.table-td:nth-child(3) {
   white-space: nowrap;
}
</style>