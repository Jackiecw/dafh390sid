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
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                创建新商品
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div v-if="isLoadingOptions" class="col-span-2 text-stone-500">
                  正在加载表单选项...
                </div>

                <template v-if="!isLoadingOptions">
                  <div class="input-group col-span-2 md:col-span-1">
                    <label for="sku">商品 SKU (型号) *</label>
                    <input 
                      type="text" 
                      id="sku" 
                      v-model="formData.sku"
                      placeholder="例如: AV-P001"
                    />
                  </div>

                  <div class="input-group col-span-2 md:col-span-1">
                    <label for="name">商品名称 *</label>
                    <input 
                      type="text" 
                      id="name" 
                      v-model="formData.name"
                      placeholder="例如: Aviewlux S1 Pro 投影仪"
                    />
                  </div>

                  <div class="input-group">
                    <label for="category">品类 *</label>
                    <select id="category" v-model="formData.category">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.productCategories" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>

                  <div class="input-group">
                    <label for="cost">采购价 (RMB) *</label>
                    <input 
                      type="number" 
                      id="cost" 
                      v-model.number="formData.cost"
                      placeholder="0.00"
                    />
                  </div>

                  <div class="input-group col-span-2">
                    <label for="imageUrl">图片 URL (可选)</label>
                    <input 
                      type="text" 
                      id="imageUrl" 
                      v-model="formData.imageUrl"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div class="input-group col-span-2">
                    <label for="description">配置简述 (可选)</label>
                    <textarea 
                      id="description" 
                      rows="3"
                      v-model="formData.description"
                      placeholder="例如: 1080P, 500 ANSI, ..."
                    ></textarea>
                  </div>
                  
                  <div class="input-group">
                    <label for="weightKg">重量 (kg) (可选)</label>
                    <input 
                      type="number" 
                      id="weightKg" 
                      v-model.number="formData.weightKg"
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div class="input-group">
                    <label for="volumeM3">体积 (m³) (可选)</label>
                    <input 
                      type="number" 
                      id="volumeM3" 
                      v-model.number="formData.volumeM3"
                      placeholder="0.0"
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
                  创建商品
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

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  }
});
const emit = defineEmits(['close', 'product-created']);

const defaultFormData = () => ({
  sku: '',
  name: '',
  category: '',
  cost: 0,
  imageUrl: '',
  description: '',
  weightKg: null,
  volumeM3: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

const options = ref({
  productCategories: [],
});
const isLoadingOptions = ref(false);

async function fetchOptions() {
  if (options.value.productCategories.length > 0) return; 
  
  isLoadingOptions.value = true;
  try {
    const response = await apiClient.get('/admin/management-options');
    options.value.productCategories = response.data.productCategories;
  } catch (error) {
    console.error('加载表单选项失败:', error);
    errorMessage.value = "无法加载表单选项，请重试。";
  } finally {
    isLoadingOptions.value = false;
  }
}

async function handleSubmit() {
  errorMessage.value = '';

  const payload = {
    ...formData.value,
    weightKg: formData.value.weightKg || null,
    volumeM3: formData.value.volumeM3 || null,
    imageUrl: formData.value.imageUrl || null,
    description: formData.value.description || null,
  };

  try {
    const response = await apiClient.post('/admin/products', payload);
    emit('product-created', response.data);
    closeModal();
  } catch (error)
{
    console.error('创建商品失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '创建失败，请检查网络或联系管理员。';
    }
  }
}

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
.input-group input,
.input-group select,
.input-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>