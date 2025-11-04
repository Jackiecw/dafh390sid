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
                创建新店铺
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div v-if="isLoadingOptions" class="col-span-2 text-stone-500">
                  正在加载表单选项...
                </div>

                <template v-if="!isLoadingOptions">
                  <div class="input-group col-span-2">
                    <label for="name">店铺名称 (易读) *</label>
                    <input 
                      type="text" 
                      id="name" 
                      v-model="formData.name"
                      placeholder="例如: Shopee 印尼 Mall 店"
                    />
                  </div>

                  <div class="input-group">
                    <label for="platform">平台 *</label>
                    <select id="platform" v-model="formData.platform">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.platforms" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>

                  <div class="input-group">
                    <label for="country">国家 *</label>
                    <select id="country" v-model="formData.country">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.countries" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>

                  <div class="input-group">
                    <label for="status">状态 *</label>
                    <select id="status" v-model="formData.status">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.storeStatuses" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="input-group">
                    <label for="registeredAt">注册日期</label>
                    <input 
                      type="date" 
                      id="registeredAt" 
                      v-model="formData.registeredAt"
                    />
                  </div>

                  <div class="input-group col-span-2">
                    <label for="platformStoreId">平台店铺 ID (可选)</label>
                    <input 
                      type="text" 
                      id="platformStoreId" 
                      v-model="formData.platformStoreId"
                      placeholder="例如: 123456789"
                    />
                  </div>
                </template>
                
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
                  :disabled="isLoadingOptions"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
                >
                  创建店铺
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

// --- 1. Props 和 Emits ---
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  }
});
const emit = defineEmits(['close', 'store-created']);

// --- 2. 内部状态 ---
const defaultFormData = () => ({
  name: '',
  platform: '',
  country: '',
  status: 'ACTIVE',
  platformStoreId: '',
  registeredAt: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

// (用于存储下拉菜单选项)
const options = ref({
  platforms: [],
  countries: [],
  storeStatuses: [],
});
const isLoadingOptions = ref(false);

// --- 3. 核心逻辑 (API 调用) ---

// (获取下拉菜单选项)
async function fetchOptions() {
  if (options.value.platforms.length > 0) return; // (防止重复加载)
  
  isLoadingOptions.value = true;
  try {
    // (调用我们在 management.js 中创建的辅助接口)
    const response = await apiClient.get('/admin/management-options');
    options.value = response.data;
  } catch (error) {
    console.error('加载表单选项失败:', error);
    errorMessage.value = "无法加载表单选项，请重试。";
  } finally {
    isLoadingOptions.value = false;
  }
}

// (提交表单)
async function handleSubmit() {
  errorMessage.value = '';

  // (将空日期转为 null)
  const payload = {
    ...formData.value,
    registeredAt: formData.value.registeredAt || null
  };

  try {
    // (调用我们在 management.js 中创建的 POST /stores 接口)
    const response = await apiClient.post('/admin/stores', payload);
    emit('store-created', response.data);
    closeModal();
  } catch (error) {
    console.error('创建店铺失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '创建失败，请检查网络或联系管理员。';
    }
  }
}

// --- 4. 辅助函数 ---

// (当弹窗打开时，加载选项并重置表单)
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
    fetchOptions();
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
/* (复用 UserFormModal.vue 的样式) */
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
.input-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>