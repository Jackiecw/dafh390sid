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
                修改销售数据
              </DialogTitle>
              
              <div v-if="isLoading" class="mt-4 p-6 text-center text-stone-500">
                正在加载表单选项...
              </div>

              <form v-if="!isLoading" @submit.prevent="handleSubmit" class="mt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div class="space-y-2">
                    <label for="edit_recordDate" class="form-label">记录日期 *</label>
                    <input type="date" id="edit_recordDate" v-model="formData.recordDate" required class="form-input" />
                  </div>

                  <div class="space-y-2">
                    <label for="edit_country" class="form-label">国家 *</label>
                    <select id="edit_country" v-model="selectedCountry" required class="form-input">
                      <option disabled value="">请选择国家...</option>
                      <option v-for="country in countryOptions" :key="country.code" :value="country.code">
                        {{ country.name }} ({{ country.code }})
                      </option>
                    </select>
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_platform" class="form-label">平台 *</label>
                    <select id="edit_platform" v-model="selectedPlatform" required :disabled="!selectedCountry" class="form-input disabled:bg-gray-100">
                      <option disabled value="">请选择平台...</option>
                      <option v-for="platform in platformOptions" :key="platform" :value="platform">
                        {{ platform }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_store" class="form-label">店铺名称 *</label>
                    <select id="edit_store" v-model="formData.storeId" required :disabled="!selectedPlatform" class="form-input disabled:bg-gray-100">
                      <option disabled value="">请选择店铺...</option>
                      <option v-for="store in storeOptions" :key="store.id" :value="store.id">
                        {{ store.name }}
                      </option>
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label for="edit_product" class="form-label">商品 *</label>
                    <select id="edit_product" v-model="formData.productId" required :disabled="!formData.storeId || isLoadingProducts" class="form-input disabled:bg-gray-100">
                      <option disabled value="">
                        {{ isLoadingProducts ? '加载商品中...' : '请选择商品...' }}
                      </option>
                      <option v-for="product in storeProducts" :key="product.id" :value="product.id">
                        {{ product.name }} ({{ product.sku }})
                      </option>
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label for="edit_salesVolume" class="form-label">销量 *</label>
                    <input type="number" id="edit_salesVolume" v-model="formData.salesVolume" required class="form-input" />
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_revenue" class="form-label">销售额 *</label>
                    <input type="number" step="0.01" id="edit_revenue" v-model="formData.revenue" required class="form-input" />
                  </div>
                  
                  <div class="space-y-2 md:col-span-2">
                    <label for="edit_notes" class="form-label">备注 (可选)</label>
                    <textarea id="edit_notes" rows="3" v-model="formData.notes" class="form-input"></textarea>
                  </div>

                </div>
                
                <p v-if="errorMessage" class="text-red-600 text-sm mt-4">
                  {{ errorMessage }}
                </p>

                <div class="mt-6 flex justify-end space-x-4">
                  <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    取消
                  </button>
                  <button type="submit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    保存更改
                  </button>
                </div>
              </form>
              
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
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  saleDataToEdit: { type: Object, default: null }
});
const emit = defineEmits(['close', 'sale-updated']);

const authStore = useAuthStore();
const formData = ref({});
const isLoading = ref(false);
const errorMessage = ref('');

// --- 级联菜单状态 ---
const allStores = ref([]);
const storeProducts = ref([]);
const isLoadingProducts = ref(false);
const selectedCountry = ref('');
const selectedPlatform = ref('');

// --- 级联菜单逻辑 (同 SalesForm) ---
async function fetchStores() {
  try {
    const response = await apiClient.get('/admin/stores');
    allStores.value = response.data;
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    errorMessage.value = '无法加载店铺选项。';
  }
}

const countryOptions = computed(() => {
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  if (authStore.role === 'admin') return allUniqueCountries; 
  const userCountryCodes = authStore.operatedCountries; 
  return allUniqueCountries.filter(country => userCountryCodes.includes(country.code));
});

const platformOptions = computed(() => {
  if (!selectedCountry.value) return [];
  const platforms = allStores.value
    .filter(store => store.countryCode === selectedCountry.value)
    .map(store => store.platform);
  return [...new Set(platforms)].sort();
});

const storeOptions = computed(() => {
  if (!selectedCountry.value || !selectedPlatform.value) return [];
  return allStores.value
    .filter(store => 
      store.countryCode === selectedCountry.value &&
      store.platform === selectedPlatform.value
    )
    .sort((a, b) => a.name.localeCompare(b.name));
});

// (级联) 重置
watch(selectedCountry, (newVal) => {
  if (newVal !== formData.value.store?.countryCode) {
    selectedPlatform.value = '';
    formData.value.storeId = '';
    formData.value.productId = '';
  }
});
watch(selectedPlatform, (newVal) => {
  if (newVal !== formData.value.store?.platform) {
    formData.value.storeId = '';
    formData.value.productId = '';
  }
});

// (级联) 获取商品
watch(() => formData.value.storeId, async (newStoreId, oldStoreId) => {
  if (newStoreId === oldStoreId) return; // (防止初始化时重复调用)
  
  formData.value.productId = ''; // 清空商品选择
  storeProducts.value = [];
  
  if (!newStoreId) return;
  
  isLoadingProducts.value = true;
  try {
    const response = await apiClient.get(`/stores/${newStoreId}/products`);
    storeProducts.value = response.data;
  } catch (error) {
    errorMessage.value = '无法加载该店铺的商品列表。';
  } finally {
    isLoadingProducts.value = false;
  }
});

// --- 弹窗核心逻辑 ---
watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.saleDataToEdit) {
    isLoading.value = true;
    errorMessage.value = '';
    
    // 1. 复制数据到表单
    formData.value = {
      ...props.saleDataToEdit,
      // (确保日期是 YYYY-MM-DD 格式)
      recordDate: new Date(props.saleDataToEdit.recordDate).toISOString().split('T')[0],
      notes: props.saleDataToEdit.notes || ''
    };

    // 2. 加载所有店铺选项
    await fetchStores();

    // 3. (关键) 触发级联菜单
    selectedCountry.value = props.saleDataToEdit.store.countryCode;
    selectedPlatform.value = props.saleDataToEdit.store.platform;
    // (formData.value.storeId 已在上面设置)
    
    // 4. (关键) 单独加载当前店铺的商品列表
    isLoadingProducts.value = true;
    try {
      const response = await apiClient.get(`/stores/${props.saleDataToEdit.storeId}/products`);
      storeProducts.value = response.data;
    } catch (error) {
      errorMessage.value = '无法加载商品列表。';
    } finally {
      isLoadingProducts.value = false;
    }
    
    isLoading.value = false;
  }
});

// --- 提交 ---
async function handleSubmit() {
  errorMessage.value = '';
  
  // (准备 payload，移除多余的嵌套对象)
  const payload = {
    recordDate: formData.value.recordDate,
    storeId: formData.value.storeId,
    productId: formData.value.productId,
    salesVolume: parseInt(formData.value.salesVolume) || 0,
    revenue: parseFloat(formData.value.revenue) || 0,
    notes: formData.value.notes || null
  };

  try {
    const response = await apiClient.put(
      `/sales-data/${props.saleDataToEdit.id}`, 
      payload
    );
    emit('sale-updated', response.data);
  } catch (error) {
    console.error('更新失败:', error);
    errorMessage.value = error.response?.data?.error || '更新失败，请重试。';
  }
}

function closeModal() {
  emit('close');
}

</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.form-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
</style>