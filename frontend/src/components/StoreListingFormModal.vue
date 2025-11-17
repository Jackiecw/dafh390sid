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
                上架新商品
              </DialogTitle>
              
              <div v-if="isLoading" class="mt-4 p-6 text-center text-stone-500">
                正在加载产品和店铺列表...
              </div>

              <div v-else class="mt-4 grid grid-cols-1 gap-4">
                
                <div class="input-group">
                  <label for="productId">1. 选择“我有的产品” (产品目录) *</label>
                  <select id="productId" v-model="formData.productId" class="form-input">
                    <option disabled value="">请选择...</option>
                    <option v-for="product in allProducts" :key="product.id" :value="product.id">
                      {{ product.sku }} ({{ product.name }})
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="storeId">2. 选择要上架的店铺 *</label>
                  <select id="storeId" v-model="formData.storeId" class="form-input">
                    <option disabled value="">请选择...</option>
                    <option v-for="store in allStores" :key="store.id" :value="store.id">
                      [{{ store.countryCode }}] {{ store.name }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="storeTitle">3. 填写店铺标题 *</label>
                  <input 
                    type="text" 
                    id="storeTitle" 
                    v-model="formData.storeTitle"
                    placeholder="例如: Proyektor Mini C01..."
                  />
                </div>
                
                <div class="input-group">
                  <label for="currentPrice">4. 售价 (当地货币) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    id="currentPrice" 
                    v-model="formData.currentPrice"
                    placeholder="例如: 599000 (IDR) 或 99.9 (USD)"
                  />
                </div>
                
                <div class="input-group">
                  <label for="platformUrl">5. 商品链接 (可选)</label>
                  <input 
                    type="text" 
                    id="platformUrl" 
                    v-model="formData.platformUrl"
                    placeholder="https://shopee.co.id/..."
                  />
                </div>

                <div class="input-group">
                  <label for="storeImageUrl">6. 店铺主图 (可选)</label>
                  <input 
                    type="file" 
                    id="storeImageUrl" 
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
                  :disabled="isLoading"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
                >
                  确认上架
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
const emit = defineEmits(['close', 'listing-created']);

// --- 1. 状态 ---
const defaultFormData = () => ({
  productId: '',
  storeId: '',
  storeTitle: '',
  currentPrice: null,
  platformUrl: '',
});

const formData = ref(defaultFormData());
const allProducts = ref([]); // (我有的产品)
const allStores = ref([]);
const isLoading = ref(false);

const selectedFile = ref(null); 
const previewUrl = ref(null); 
const errorMessage = ref('');

// --- 2. 数据获取 ---
async function fetchOptions() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const [productsRes, storesRes] = await Promise.all([
      apiClient.get('/admin/products'), // (获取 "我有的产品" 列表)
      apiClient.get('/admin/stores')     // (获取 "店铺" 列表)
    ]);
    allProducts.value = productsRes.data;
    allStores.value = storesRes.data;
  } catch (error) {
    console.error('加载选项失败:', error);
    errorMessage.value = "无法加载产品或店铺列表，请重试。";
  } finally {
    isLoading.value = false;
  }
}

// (文件选择)
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

// --- 3. 提交 ---
async function handleSubmit() {
  errorMessage.value = '';
  isLoading.value = true;

  const payload = new FormData();
  
  // (附加文本字段)
  payload.append('productId', formData.value.productId);
  payload.append('storeId', formData.value.storeId);
  payload.append('storeTitle', formData.value.storeTitle);
  payload.append('currentPrice', formData.value.currentPrice || 0);
  payload.append('platformUrl', formData.value.platformUrl || '');

  // (附加文件)
  if (selectedFile.value) {
    payload.append('storeImageUrl', selectedFile.value);
  }

  try {
    // (调用我们在 P2 创建的新 API)
    const response = await apiClient.post('/admin/store-listings', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    emit('listing-created', response.data); // (通知父组件)
    closeModal();
  } catch (error) {
    console.error('上架失败:', error);
    if (error.response && error.response.data.details) {
      errorMessage.value = error.response.data.details.map(d => d.message).join('; ');
    } else {
      errorMessage.value = error.response?.data?.error || '操作失败';
    }
  } finally {
    isLoading.value = false;
  }
}


// --- 4. 辅助函数 ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
    fetchOptions();
  } else {
     if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
  }
});

function closeModal() {
  emit('close');
}
function resetForm() {
  formData.value = defaultFormData();
  selectedFile.value = null;
  previewUrl.value = null;
  errorMessage.value = '';
  allProducts.value = [];
  allStores.value = [];
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
.input-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: #fff;
}
</style>