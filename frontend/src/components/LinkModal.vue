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
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 gap-4">
                
                <div class="input-group">
                  <label for="linkTitle">标题 *</label>
                  <input 
                    type="text" 
                    id="linkTitle" 
                    v-model="formData.title"
                    placeholder="例如: Shopee 印尼卖家中心"
                  />
                </div>

                <div class="input-group">
                  <label for="linkUrl">URL (链接地址) *</label>
                  <input 
                    type="text" 
                    id="linkUrl" 
                    v-model="formData.url"
                    placeholder="例如: https://seller.shopee.co.id/"
                  />
                </div>

                <div class="input-group">
                  <label for="linkDesc">备注 (说明)</label>
                  <input 
                    type="text" 
                    id="linkDesc" 
                    v-model="formData.description"
                    placeholder="例如: 财务后台 (可选)"
                  />
                </div>

                <div class="input-group">
                  <label for="linkOrder">显示顺序 (数字越小越靠前)</label>
                  <input 
                    type="number" 
                    id="linkOrder" 
                    v-model="formData.displayOrder"
                  />
                </div>
                
                <p v-if="errorMessage" class="text-red-600 text-sm col-span-2">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  取消
                </button>
                <button
                  type="button"
                  @click="handleSubmit"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                >
                  {{ submitButtonText }}
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
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

// --- 1. Props 和 Emits ---
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  linkToEdit: {
    type: Object,
    default: null,
  }
});
const emit = defineEmits(['close', 'link-created', 'link-updated']);

// --- 2. 内部状态 ---
const defaultFormData = () => ({
  title: '',
  url: '',
  description: '',
  displayOrder: 0,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

// --- 3. 计算属性 ---
const isEditMode = computed(() => !!props.linkToEdit);
const dialogTitle = computed(() => isEditMode.value ? '编辑链接' : '新建链接');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建');


// --- 4. 核心逻辑 (API 调用) ---
async function handleSubmit() {
  errorMessage.value = '';

  const payload = {
    ...formData.value,
    description: formData.value.description || null,
    displayOrder: parseInt(formData.value.displayOrder) || 0,
  };

  try {
    if (isEditMode.value) {
      // (A) 【编辑】模式
      const response = await apiClient.put(`/admin/links/${props.linkToEdit.id}`, payload);
      emit('link-updated', response.data);
    } else {
      // (B) 【创建】模式
      const response = await apiClient.post('/admin/links', payload);
      emit('link-created', response.data);
    }
    closeModal();
  } catch (error) {
    console.error('操作链接失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else if (error.response && error.response.data.details) {
      errorMessage.value = error.response.data.details.map(d => d.message).join('; ');
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 5. 辅助函数 ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (isEditMode.value) {
      // 【编辑】模式: 预填充表单
      formData.value = {
        title: props.linkToEdit.title,
        url: props.linkToEdit.url,
        description: props.linkToEdit.description || '',
        displayOrder: props.linkToEdit.displayOrder || 0,
      };
    } else {
      // 【创建】模式: 重置为空表单
      resetForm();
    }
  }
});

function closeModal() {
  emit('close');
}

function resetForm() {
  formData.value = defaultFormData();
  errorMessage.value = '';
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
.input-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.input-group input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>