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
                编辑每周重点 ({{ weekDateStr }})
              </DialogTitle>
              
              <div class="mt-4">
                <div class="input-group">
                  <label for="focus-content">重点内容 *</label>
                  <textarea 
                    id="focus-content" 
                    rows="8" 
                    v-model="content" 
                    class="form-input"
                    placeholder="请输入本周团队的重点关注内容..."
                  ></textarea>
                </div>
                <p v-if="errorMessage" class="text-red-600 text-sm mt-2">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  取消
                </button>
                <button type="button" @click="handleSubmit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  保存
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
import { ref, watch, computed } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  focusData: { type: Object, default: null }, // (当前已有的重点)
  weekDate: { type: Date, required: true }  // (当前周一的日期)
});
const emit = defineEmits(['close', 'focus-saved']);

const content = ref('');
const errorMessage = ref('');

const weekDateStr = computed(() => {
  if (!props.weekDate) return '';
  return new Date(props.weekDate).toISOString().split('T')[0];
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMessage.value = '';
    // (如果已有数据，则加载；否则显示空)
    content.value = props.focusData ? props.focusData.content : '';
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  try {
    const payload = {
      weekStartDate: props.weekDate.toISOString(),
      content: content.value,
    };
    
    // (后端使用 upsert，所以 POST 同时处理新建和更新)
    await apiClient.post('/admin/calendar/weekly-focus', payload);
    emit('focus-saved');
    
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '保存失败';
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* (复用样式) */
.input-group { display: flex; flex-direction: column; }
.input-group label { margin-bottom: 0.5rem; color: #333; font-weight: bold; font-size: 0.875rem; }
.form-input { padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
</style>