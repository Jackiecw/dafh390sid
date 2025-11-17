<template>
  <div class="space-y-8">
    <section
      class="rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#60A5FA] p-8 text-white shadow-xl shadow-blue-900/20"
    >
      <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Supply Chain
          </p>
          <div>
            <h2 class="text-3xl font-semibold">生产与物流管理</h2>
            <p class="text-sm text-white/80">
              跟踪从工厂到海外仓的全链路状态，快速定位堵点批次。
            </p>
          </div>
        </div>

        <div class="grid flex-1 gap-4 sm:grid-cols-3">
          <div
            v-for="stat in heroStats"
            :key="stat.label"
            class="rounded-2xl bg-white/15 p-4 backdrop-blur-sm"
          >
            <p class="text-xs uppercase tracking-wide text-white/70">{{ stat.label }}</p>
            <p class="mt-2 text-3xl font-semibold">{{ stat.value }}</p>
            <p class="text-sm text-white/70">{{ stat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in tabOptions"
            :key="tab.key"
            @click="currentTab = tab.key"
            :class="[
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
              currentTab === tab.key
                ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-200'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]',
            ]"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.badge !== null"
              class="rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold"
            >
              {{ tab.badge }}
            </span>
          </button>
        </div>
        <button
          v-if="isAdmin"
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8]"
        >
          <span>＋</span>
          <span>新建批次</span>
        </button>
      </div>

      <transition name="fade">
        <p v-if="errorMessage" class="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600">
          {{ errorMessage }}
        </p>
      </transition>

      <div v-if="isLoading" class="mt-6 grid gap-4 md:grid-cols-2">
        <div
          v-for="n in 4"
          :key="n"
          class="animate-pulse rounded-2xl bg-gray-100 p-6"
        >
          <div class="mb-4 h-4 w-1/3 rounded bg-gray-200"></div>
          <div class="mb-2 h-6 w-2/3 rounded bg-gray-200"></div>
          <div class="h-4 w-full rounded bg-gray-200"></div>
        </div>
      </div>

      <div v-else class="mt-6">
        <div v-show="currentTab === 'management'">
          <LogisticsBatchManagement
            :batches="batches"
            :is-loading="isLoading"
            :error-message="errorMessage"
            @create-batch-request="openCreateModal"
            @update-status-request="handleUpdateStatusRequest"
            @delete-batch="handleDelete"
          />
        </div>

        <div v-show="currentTab === 'kanban'">
          <LogisticsKanban
            :batches="batches"
            :is-loading="isLoading"
            :is-admin="isAdmin"
            @update-status-request="handleUpdateStatusRequest"
          />
        </div>
      </div>
    </section>

    <LogisticsBatchFormModal
      :is-open="isFormModalOpen"
      @close="closeFormModal"
      @batch-created="handleBatchCreated"
    />

    <LogisticsEventModal
      :is-open="isEventModalOpen"
      :batch-id="selectedBatchForEvent?.id"
      :batch-number="selectedBatchForEvent?.batchNumber"
      :target-status="targetStatusForEvent"
      @close="closeEventModal"
      @event-created="handleEventCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

import LogisticsBatchManagement from './LogisticsBatchManagement.vue';
import LogisticsKanban from './LogisticsKanban.vue';
import LogisticsBatchFormModal from './LogisticsBatchFormModal.vue';
import LogisticsEventModal from './LogisticsEventModal.vue';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

const currentTab = ref('management');

// --- 统一的数据状�?---
const batches = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

// --- 统一的弹窗状�?---
const isFormModalOpen = ref(false);
const isEventModalOpen = ref(false);
const selectedBatchForEvent = ref(null);
const targetStatusForEvent = ref(null);

const IN_PROGRESS_STATUSES = [
  'FACTORY',
  'WAREHOUSE_READY',
  'CONTAINER_LOADED',
  'EXPORT_CUSTOMS',
  'SHIPPING',
  'IMPORT_CUSTOMS',
  'LOCAL_DELIVERY',
];

const heroStats = computed(() => {
  const total = batches.value.length;
  const running = batches.value.filter((batch) =>
    IN_PROGRESS_STATUSES.includes(batch.currentStatus)
  ).length;
  const delayed = batches.value.filter((batch) => {
    if (!batch.estimatedWarehouseDate) return false;
    const eta = new Date(batch.estimatedWarehouseDate);
    return eta < new Date() && batch.currentStatus !== 'COMPLETED';
  }).length;

  return [
    { label: '全部批次', value: total || '—', desc: '系统中记录的批次' },
    { label: '在制 / 在途', value: running || '—', desc: '尚未入仓' },
    { label: '可能延误', value: delayed || '—', desc: '超出预计入仓' },
  ];
});

const tabOptions = computed(() => [
  { key: 'management', label: '批次管理 (表格)', badge: batches.value.length },
  {
    key: 'kanban',
    label: '物流看板 (可视化)',
    badge: batches.value.filter((batch) => batch.currentStatus !== 'COMPLETED').length,
  },
]);

// --- 统一的数据获�?---
async function fetchData() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/logistics/data');
    batches.value = response.data;
  } catch (error) {
    console.error('获取物流数据失败:', error);
    errorMessage.value = '获取数据失败，请检查权限或联系管理员。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchData();
});

// --- 弹窗控制 (Create) ---
function openCreateModal() {
  isFormModalOpen.value = true;
}
function closeFormModal() {
  isFormModalOpen.value = false;
}
function handleBatchCreated(newBatch) {
  batches.value.unshift(newBatch);
  closeFormModal();
}

// --- 弹窗控制 (Update) ---
function handleUpdateStatusRequest({ batch, targetStatus }) {
  selectedBatchForEvent.value = batch;
  targetStatusForEvent.value = targetStatus;
  isEventModalOpen.value = true;
}
function closeEventModal() {
  isEventModalOpen.value = false;
  selectedBatchForEvent.value = null;
  targetStatusForEvent.value = null;
}
function handleEventCreated() {
  fetchData(); // (更新状态后, 重新获取所有数据)
  closeEventModal();
}

// --- CRUD 操作 (Delete) ---
async function handleDelete(batch) {
  if (confirm(`确定要删除批次 "${batch.batchNumber}" 吗？此操作不可逆！`)) {
    try {
      await apiClient.delete(`/admin/logistics/batches/${batch.id}`);
      fetchData(); // 重新加载数据
    } catch (error) {
      errorMessage.value = error.response?.data?.error || '删除失败';
    }
  }
}
</script>
