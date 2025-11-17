<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-gray-900"
              >
                更新批次状态 ({{ batchNumber }})
              </DialogTitle>

              <div class="mt-4 grid grid-cols-1 gap-4">
                <div class="input-group">
                  <label for="status">更新到状态 *</label>
                  <select id="status" v-model="formData.status" class="form-input">
                    <option
                      v-for="opt in statusOptions"
                      :key="opt.key"
                      :value="opt.key"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="eventDate">事件日期 *</label>
                  <input
                    type="date"
                    id="eventDate"
                    v-model="formData.eventDate"
                    class="form-input"
                  />
                </div>

                <div class="input-group">
                  <label for="notes">备注 (例如: 柜号, 提单号, 船名)</label>
                  <textarea
                    id="notes"
                    rows="3"
                    v-model="formData.notes"
                    class="form-input"
                  ></textarea>
                </div>

                <p v-if="errorMessage" class="text-sm text-red-600">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  @click="handleSubmit"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  确认更新
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  batchId: { type: String, default: null },
  batchNumber: { type: String, default: '' },
  targetStatus: { type: String, default: null },
});

const emit = defineEmits(['close', 'event-created']);

const statusOptions = [
  { key: 'FACTORY', label: '生产中' },
  { key: 'WAREHOUSE_READY', label: '待出库' },
  { key: 'CONTAINER_LOADED', label: '已装柜' },
  { key: 'EXPORT_CUSTOMS', label: '出口清关' },
  { key: 'SHIPPING', label: '国际运输' },
  { key: 'IMPORT_CUSTOMS', label: '进口清关' },
  { key: 'LOCAL_DELIVERY', label: '本地派送' },
  { key: 'COMPLETED', label: '已入仓' },
];

const defaultFormData = () => ({
  status: props.targetStatus || 'FACTORY',
  eventDate: new Date().toISOString().split('T')[0],
  notes: '',
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      errorMessage.value = '';
      formData.value = defaultFormData();
      if (props.targetStatus) {
        formData.value.status = props.targetStatus;
      }
    }
  }
);

async function handleSubmit() {
  errorMessage.value = '';
  if (!props.batchId) {
    errorMessage.value = '未找到批次ID，请关闭重试。';
    return;
  }

  try {
    const payload = {
      ...formData.value,
      notes: formData.value.notes || null,
    };
    
    // ⬇️ --- 【修正】 ---
    await apiClient.post(
      `/admin/logistics/batches/${props.batchId}/events`, // (移除 /api)
      payload
    );
    // ⬆️ --- 【修正】 ---
    
    emit('event-created');
    closeModal();
  } catch (error) {
    console.error('更新状态失败:', error);
    errorMessage.value = error.response?.data?.error || '操作失败';
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* (样式不变) */
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
.input-group input,
.input-group select,
.input-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>