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
                  <label for="countryCode">国家代码 (Code) *</label>
                  <input 
                    type="text" 
                    id="countryCode" 
                    v-model="formData.code"
                    placeholder="例如: ID, VN (创建后不可修改)"
                    :disabled="isEditMode"
                    class="disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div class="input-group">
                  <label for="countryName">国家名称 (Name) *</label>
                  <input 
                    type="text" 
                    id="countryName" 
                    v-model="formData.name"
                    placeholder="例如: Indonesia, Vietnam"
                  />
                </div>
                
                <div class="input-group">
                  <label for="establishedAt">设立日期</label>
                  <input 
                    type="date" 
                    id="establishedAt" 
                    v-model="formData.establishedAt"
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
  countryToEditId: {
    type: String,
    default: null,
  }
});
const emit = defineEmits(['close', 'country-created', 'country-updated']);

// --- 2. 内部状态 ---
const defaultFormData = () => ({
  code: '',
  name: '',
  establishedAt: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

// --- 3. 计算属性 ---
const isEditMode = computed(() => !!props.countryToEditId);
const dialogTitle = computed(() => isEditMode.value ? '编辑国家' : '创建新国家');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建国家');


// --- 4. 核心逻辑 (API 调用) ---

// (获取单个国家的详情)
async function fetchCountryDetails() {
  if (!isEditMode.value) return;
  
  // (注意: 后端没有 GET /countries/:id 接口，但我们可以从 GET /countries 列表中筛选)
  // (为了简单起见，我们假设父组件会传入完整的 countryToEdit 对象)
  // (更新：我们还是在父组件中获取详情，然后传入)
  // (更新2：后端已有 /stores/:id，我们应该也为 /countries/:id 添加一个)
  // (注：在 `management.js` 中我们没有添加 GET /:id，所以我们在此处获取列表并筛选)
  
  try {
    // (获取列表)
    const response = await apiClient.get('/admin/countries');
    const country = response.data.find(c => c.id === props.countryToEditId);
    
    if (country) {
      formData.value = {
        code: country.code,
        name: country.name,
        establishedAt: country.establishedAt ? new Date(country.establishedAt).toISOString().split('T')[0] : null,
      };
    } else {
      errorMessage.value = '未找到要编辑的国家。';
    }
  } catch (error) {
    console.error('获取国家详情失败:', error);
    errorMessage.value = '无法加载国家详情。';
  }
}

// (提交表单)
async function handleSubmit() {
  errorMessage.value = '';

  const payload = {
    ...formData.value,
    establishedAt: formData.value.establishedAt || null
  };

  try {
    if (isEditMode.value) {
      // (A) 【编辑】模式
      const response = await apiClient.put(`/admin/countries/${props.countryToEditId}`, payload);
      emit('country-updated', response.data);
    } else {
      // (B) 【创建】模式
      const response = await apiClient.post('/admin/countries', payload);
      emit('country-created', response.data);
    }
    closeModal();
  } catch (error) {
    console.error('操作国家失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 5. 辅助函数 ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
    if (isEditMode.value) {
      fetchCountryDetails();
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