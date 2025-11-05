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
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div class="input-group col-span-2">
                  <label for="sku">SKU (型号) *</label>
                  <input type="text" id="sku" v-model="formData.sku" />
                </div>

                <div class="input-group col-span-2">
                  <label for="name">商品名称 *</label>
                  <input type="text" id="name" v-model="formData.name" />
                </div>
                
                <div class="input-group">
                  <label for="category">分类 *</label>
                  <select id="category" v-model="formData.category">
                    <option disabled value="">请选择...</option>
                    <option v-for="opt in options.categories" :key="opt" :value="opt">
                      {{ opt }}
                    </option>
                  </select>
                </div>
                
                <div class="input-group">
                  <label for="cost">成本价</label>
                  <input type="number" step="0.01" id="cost" v-model="formData.cost" />
                </div>
                
                <div class="input-group">
                  <label for="weightKg">重量 (kg)</label>
                  <input type="number" step="0.01" id="weightKg" v-model="formData.weightKg" placeholder="例如: 1.25" />
                </div>
                
                <div class="input-group">
                  <label for="volumeM3">体积 (m³)</label>
                  <input type="number" step="0.001" id="volumeM3" v-model="formData.volumeM3" placeholder="例如: 0.03" />
                </div>

                <div class="input-group col-span-2">
                  <label for="dimensionsMm">尺寸 (mm)</label>
                  <input type="text" id="dimensionsMm" v-model="formData.dimensionsMm" placeholder="例如: 300*200*100" />
                </div>
                <div class="input-group col-span-2">
                  <label for="description">简介</label>
                  <textarea id="description" rows="3" v-model="formData.description"></textarea>
                </div>
                
                <div class="input-group col-span-2">
                  <label for="productImage">商品图片 ({{ isEditMode ? '替换' : '上传' }})</label>
                  <input 
                    type="file" 
                    id="productImage" 
                    @change="onFileSelected"
                    accept="image/png, image/jpeg"
                    class="block w-full text-sm text-stone-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-indigo-50 file:text-indigo-700
                           hover:file:bg-indigo-100"
                  />
                  <img v-if="previewUrl" :src="previewUrl" class="mt-2 h-24 w-24 object-cover rounded">
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

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  productToEditId: { type: String, default: null }
});
const emit = defineEmits(['close', 'product-created', 'product-updated']);

// ⬇️ 【修改】
const defaultFormData = () => ({
  sku: '',
  name: '',
  category: '',
  cost: null,
  weightKg: null, 
  volumeM3: null, 
  dimensionsMm: '', // ⬅️ 新增
  description: '',
  imageUrl: ''
});

const formData = ref(defaultFormData());
const options = ref({ categories: [] });
const selectedFile = ref(null); 
const previewUrl = ref(null); 
const errorMessage = ref('');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

const isEditMode = computed(() => !!props.productToEditId);
const dialogTitle = computed(() => isEditMode.value ? '编辑商品' : '创建新商品');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建商品');

// (不变) 文件选择
function onFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(file); 
  }
}

// (不变) 获取选项
async function fetchOptions() {
  try {
    const response = await apiClient.get('/admin/product-options');
    options.value = response.data;
  } catch (error) {
    errorMessage.value = "无法加载分类选项。";
  }
}

// (修改) 获取详情
async function fetchProductDetails() {
  if (!isEditMode.value) return;
  try {
    const response = await apiClient.get('/admin/products');
    const product = response.data.find(p => p.id === props.productToEditId);

    if (product) {
      // ⬇️ 【修改】 确保所有字段都被填充
      formData.value = {
        sku: product.sku,
        name: product.name,
        category: product.category,
        cost: product.cost,
        weightKg: product.weightKg, 
        volumeM3: product.volumeM3, 
        dimensionsMm: product.dimensionsMm, // ⬅️ 新增
        description: product.description,
        imageUrl: product.imageUrl
      };
      
      selectedFile.value = null; 
      if (product.imageUrl) {
        previewUrl.value = `${apiBaseUrl}${product.imageUrl}`; 
      } else {
        previewUrl.value = null;
      }
    }
  } catch (error) {
    errorMessage.value = '无法加载商品详情。';
  }
}

// (关键) 提交表单 (使用 FormData)
async function handleSubmit() {
  errorMessage.value = '';

  // 1. 创建 FormData
  const payload = new FormData();
  
  // 2. ⬇️ 【修改】 附加所有文本字段
  payload.append('sku', formData.value.sku);
  payload.append('name', formData.value.name);
  payload.append('category', formData.value.category);
  payload.append('cost', formData.value.cost || '');
  payload.append('weightKg', formData.value.weightKg || ''); 
  payload.append('volumeM3', formData.value.volumeM3 || ''); 
  payload.append('dimensionsMm', formData.value.dimensionsMm || ''); // ⬅️ 新增
  payload.append('description', formData.value.description || '');

  // 3. (不变) 附加文件
  if (selectedFile.value) {
    payload.append('productImage', selectedFile.value);
  }

  try {
    let response;
    if (isEditMode.value) {
      response = await apiClient.put(`/admin/products/${props.productToEditId}`, payload);
      emit('product-updated', response.data);
    } else {
      response = await apiClient.post('/admin/products', payload);
      emit('product-created', response.data);
    }
    closeModal();
  } catch (error) {
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络。';
    }
  }
}

// (不变) Watch
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm(); 
    fetchOptions();
    if (isEditMode.value) {
      fetchProductDetails();
    }
  } else {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
  }
});

function closeModal() { emit('close'); }

// (不变) Reset
function resetForm() {
  formData.value = defaultFormData();
  selectedFile.value = null;
  previewUrl.value = null;
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
.input-group input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>