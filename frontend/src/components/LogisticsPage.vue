<template>
  <div class="space-y-8">
    <section
      class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            Supply Chain
          </p>
          <h2 class="text-3xl font-semibold">生产与物流管理</h2>
          <p class="text-sm text-white/80">
            跟踪从工厂到海外仓的全链路状态。
          </p>
        </div>
        </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex gap-3">
        <button
          @click="currentTab = 'management'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'management'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]',
          ]"
        >
          批次管理 (表格)
        </button>
        <button
          @click="currentTab = 'kanban'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'kanban'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]',
          ]"
        >
          物流看板 (可视化)
        </button>
      </nav>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
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
      
      <div v-if="currentTab === 'kanban'">
        <LogisticsKanban
          :batches="batches"
          :is-loading="isLoading"
          :is-admin="isAdmin"
          @update-status-request="handleUpdateStatusRequest"
        />
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

// --- 统一的数据状态 ---
const batches = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

// --- 统一的弹窗状态 ---
const isFormModalOpen = ref(false);
const isEventModalOpen = ref(false);
const selectedBatchForEvent = ref(null);
const targetStatusForEvent = ref(null);

// --- 统一的数据获取 ---
async function fetchData() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/logistics/data');
    batches.value = response.data;
  } catch (error)
 {
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