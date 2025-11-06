<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                新建周期任务
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 gap-4">
                <div class="input-group">
                  <label for="taskContent">任务内容 *</label>
                  <textarea 
                    id="taskContent" 
                    rows="3"
                    v-model="formData.content"
                    placeholder="例如: 检查 Shopee 印尼站广告花费"
                    class="form-input"
                  ></textarea>
                </div>

                <div class="input-group">
                  <label for="taskPeriod">周期 *</label>
                  <select id="taskPeriod" v-model="formData.period" class="form-input">
                    <option value="DAILY">每日</option>
                    <option value="WEEKLY">每周</option>
                    <option value="MONTHLY">每月</option>
                  </select>
                </div>
                
                <p v-if="errorMessage" class="text-red-600 text-sm">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  取消
                </button>
                <button type="button" @click="handleSubmit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  创建
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
});
const emit = defineEmits(['close', 'task-created']);

const defaultFormData = () => ({
  content: '',
  period: 'DAILY',
});
const formData = ref(defaultFormData());
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';
  if (!formData.value.content) {
    errorMessage.value = '任务内容不能为空';
    return;
  }
  
  try {
    const response = await apiClient.post('/recurring-tasks', formData.value);
    emit('task-created', response.data);
    closeModal();
  } catch (error) {
    console.error('创建任务失败:', error);
    errorMessage.value = error.response?.data?.error || '创建失败';
  }
}

function closeModal() {
  emit('close');
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    formData.value = defaultFormData();
    errorMessage.value = '';
  }
});
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
.input-group .form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>