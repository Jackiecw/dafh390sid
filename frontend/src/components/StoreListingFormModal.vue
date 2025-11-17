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
                {{ isEditMode ? '编辑在售商品' : '上架新商品' }}
              </DialogTitle>

              <div v-if="isLoading" class="mt-4 p-6 text-center text-stone-500">
                {{ isLoadingMessage }}
              </div>

              <div v-else class="mt-4 grid grid-cols-1 gap-4">
                <div class="input-group">
                  <label for="productId">1. 选择产品（产品目录） *</label>
                  <select id="productId" v-model="formData.productId" class="form-input" :disabled="isEditMode">
                    <option disabled value="">请选择...</option>
                    <option v-for="product in allProducts" :key="product.id" :value="product.id">
                      {{ product.sku }} · {{ product.name }}
                    </option>
                  </select>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="input-group">
                    <label for="countryCode">2. 选择上架国家 *</label>
                    <select
                      id="countryCode"
                      v-model="selectedCountryCode"
                      class="form-input"
                      :disabled="isEditMode"
                    >
                      <option disabled value="">请选择...</option>
                      <option v-for="country in allCountries" :key="country.code" :value="country.code">
                        [{{ country.code }}] {{ country.name }}
                      </option>
                    </select>
                  </div>

                  <div class="input-group">
                    <label for="storeId">3. 选择上架店铺 *</label>
                    <select
                      id="storeId"
                      v-model="formData.storeId"
                      class="form-input"
                      :disabled="isEditMode || filteredStores.length === 0"
                    >
                      <option disabled value="">请选择...</option>
                      <option v-for="store in filteredStores" :key="store.id" :value="store.id">
                        [{{ store.countryCode }}] {{ store.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="input-group">
                  <label for="storeTitle">4. 商品标题 *</label>
                  <input
                    id="storeTitle"
                    type="text"
                    v-model="formData.storeTitle"
                    placeholder="例如：Vega Pro 官方旗舰款"
                  />
                </div>

                <div class="input-group">
                  <label for="productCode">5. 商品代码 *</label>
                  <input
                    id="productCode"
                    type="text"
                    v-model="formData.productCode"
                    placeholder="例如：Vega Pro - 1"
                  />
                </div>

                <div class="input-group">
                  <label for="currentPrice">
                    6. 售价
                    <span class="text-xs text-[#6B7280]">（当地货币：{{ currentCurrencyLabel }}）*</span>
                  </label>
                  <input
                    id="currentPrice"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    v-model="formData.currentPrice"
                    placeholder="请输入在售价格"
                  />
                </div>

                <div class="input-group">
                  <label for="platformUrl">7. 商品链接（可选）</label>
                  <input
                    id="platformUrl"
                    type="text"
                    v-model="formData.platformUrl"
                    placeholder="https://shopee.co.id/..."
                  />
                </div>

                <div class="input-group">
                  <label for="storeImageUrl">8. 商品主图（{{ isEditMode ? '替换' : '上传' }}）</label>
                  <input
                    id="storeImageUrl"
                    type="file"
                    @change="onFileSelected"
                    accept="image/png, image/jpeg"
                    class="block w-full text-sm text-stone-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <img v-if="previewUrl" :src="previewUrl" class="mt-3 h-48 w-48 rounded-xl object-cover shadow" />
                </div>

                <p v-if="errorMessage" class="text-sm text-red-600">
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
                  class="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
                >
                  {{ isEditMode ? '保存修改' : '确认上架' }}
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
import { ref, computed, watch } from 'vue';
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
  listingToEditId: { type: String, default: null },
});
const emit = defineEmits(['close', 'listing-created', 'listing-updated']);

const defaultFormData = () => ({
  productId: '',
  storeId: '',
  storeTitle: '',
  productCode: '',
  currentPrice: '',
  platformUrl: '',
});

const formData = ref(defaultFormData());
const allProducts = ref([]);
const allStores = ref([]);
const allCountries = ref([]);
const currencyMap = ref({});
const selectedCountryCode = ref('');
const isLoading = ref(false);
const isLoadingMessage = ref('');

const selectedFile = ref(null);
const previewUrl = ref(null);
const errorMessage = ref('');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

const isEditMode = computed(() => !!props.listingToEditId);
const filteredStores = computed(() => {
  if (!selectedCountryCode.value) return [];
  return allStores.value.filter((store) => store.countryCode === selectedCountryCode.value);
});
const currentCurrencyLabel = computed(() => {
  if (!selectedCountryCode.value) return '请选择国家';
  return currencyMap.value[selectedCountryCode.value] || '当地货币';
});

async function fetchCreateOptions() {
  isLoading.value = true;
  isLoadingMessage.value = '正在加载产品与店铺列表...';
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/store-listings/options');
    applyOptionPayload(response.data);
    if (!selectedCountryCode.value && allCountries.value.length > 0) {
      selectedCountryCode.value = allCountries.value[0].code;
    }
    if (!formData.value.productId && allProducts.value.length > 0) {
      formData.value.productId = allProducts.value[0].id;
    }
  } catch (error) {
    console.error('加载选项失败:', error);
    errorMessage.value = '无法加载产品或店铺列表，请重试。';
  } finally {
    isLoading.value = false;
  }
}

async function fetchListingDetails() {
  if (!isEditMode.value) return;
  isLoading.value = true;
  isLoadingMessage.value = '正在加载商品详情...';
  errorMessage.value = '';
  try {
    const [listingRes, optionsRes] = await Promise.all([
      apiClient.get(`/admin/store-listings/${props.listingToEditId}`),
      apiClient.get('/admin/store-listings/options'),
    ]);
    applyOptionPayload(optionsRes.data);

    const listing = listingRes.data;
    selectedCountryCode.value =
      listing.store?.countryCode || listing.store?.country?.code || selectedCountryCode.value || '';

    formData.value = {
      productId: listing.productId,
      storeId: listing.storeId,
      storeTitle: listing.storeTitle || '',
      productCode: listing.productCode || '',
      currentPrice: listing.currentPrice ?? '',
      platformUrl: listing.platformUrl || '',
    };

    if (listing.storeImageUrl) {
      previewUrl.value = `${apiBaseUrl}${listing.storeImageUrl}`;
    }
  } catch (error) {
    console.error('加载详情失败:', error);
    errorMessage.value = '加载此商品详情失败，请关闭后重试。';
  } finally {
    isLoading.value = false;
  }
}

function applyOptionPayload(payload = {}) {
  allProducts.value = payload.products || [];
  allStores.value = payload.stores || [];
  allCountries.value = payload.countries || [];
  currencyMap.value = payload.currencyMap || {};
}

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

async function handleSubmit() {
  errorMessage.value = '';
  isLoading.value = true;
  isLoadingMessage.value = isEditMode.value ? '正在保存修改...' : '正在上架商品...';

  const payload = new FormData();
  payload.append('storeTitle', formData.value.storeTitle || '');
  payload.append('productCode', formData.value.productCode || '');
  payload.append('currentPrice', formData.value.currentPrice || 0);
  payload.append('platformUrl', formData.value.platformUrl || '');

  if (selectedFile.value) {
    payload.append('storeImageUrl', selectedFile.value);
  }

  try {
    if (isEditMode.value) {
      const response = await apiClient.put(`/admin/store-listings/${props.listingToEditId}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      emit('listing-updated', response.data);
    } else {
      payload.append('productId', formData.value.productId);
      payload.append('storeId', formData.value.storeId);
      const response = await apiClient.post('/admin/store-listings', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      emit('listing-created', response.data);
    }
    closeModal();
  } catch (error) {
    console.error('操作失败:', error);
    if (error.response && error.response.data?.details) {
      errorMessage.value = error.response.data.details.map((d) => d.message).join('; ');
    } else {
      errorMessage.value = error.response?.data?.error || '操作失败，请稍后重试。';
    }
  } finally {
    isLoading.value = false;
  }
}

watch(selectedCountryCode, () => {
  if (!filteredStores.value.some((store) => store.id === formData.value.storeId)) {
    formData.value.storeId = filteredStores.value[0]?.id || '';
  }
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      resetForm();
      if (isEditMode.value) {
        fetchListingDetails();
      } else {
        fetchCreateOptions();
      }
    } else {
      if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
      }
    }
  }
);

function closeModal() {
  emit('close');
}

function resetForm() {
  formData.value = defaultFormData();
  selectedFile.value = null;
  previewUrl.value = null;
  errorMessage.value = '';
  isLoadingMessage.value = '';
  selectedCountryCode.value = '';
}
</script>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #111827;
  font-weight: 600;
  font-size: 0.9rem;
}
.input-group input,
.input-group select {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  background-color: #fff;
}
.input-group select:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
.form-input {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  background-color: #fff;
}
</style>
