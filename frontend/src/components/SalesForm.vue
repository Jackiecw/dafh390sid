<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-stone-900 mb-6">录入销售数据</h2>
    
    <form @submit.prevent="handleSubmit">
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div class="space-y-2">
          <label for="recordDate" class="form-label">记录日期 *</label>
          <input type="date" id="recordDate" v-model="formOtherData.recordDate" required 
                 class="form-input" />
        </div>

        <!-- Country selection moved to parent -->
        <div class="space-y-2" v-if="!selectedCountry">
           <p class="text-red-500 text-sm font-bold">请先在上方选择国家</p>
        </div>
        
        <div class="space-y-2">
          <label for="platform" class="form-label">平台 *</label>
          <select id="platform" v-model="selectedPlatform" required 
                  :disabled="!selectedCountry" 
                  class="form-input disabled:bg-gray-100 disabled:cursor-not-allowed">
            <option disabled value="">请选择平台...</option>
            <option v-for="platform in platformOptions" :key="platform" :value="platform">
              {{ platform }}
            </option>
          </select>
        </div>
        
        <div class="space-y-2">
          <label for="store" class="form-label">店铺名称 *</label>
          <select id="store" v-model="selectedStoreId" required 
                  :disabled="!selectedPlatform"
                  class="form-input disabled:bg-gray-100 disabled:cursor-not-allowed">
            <option disabled value="">请选择店铺...</option>
            <option v-for="store in storeOptions" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </div>

        <div class="space-y-2 md:col-span-2">
          <label for="listing" class="form-label">
            选择商品链接 (Listing) *
            <span class="text-xs font-normal text-stone-500 ml-1">格式: [商品代码] 标题 (SKU)</span>
          </label>
          <select 
            id="listing" 
            v-model="selectedListingId" 
            required 
            :disabled="!selectedStoreId || isLoadingListings"
            class="form-input disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option disabled value="">
              {{ isLoadingListings ? '加载链接中...' : '请选择具体链接...' }}
            </option>
            <option v-for="listing in storeListings" :key="listing.id" :value="listing.id">
              <template v-if="listing.productCode">
                [{{ listing.productCode }}]
              </template>
              {{ listing.storeTitle || '未命名链接' }} 
              ({{ listing.product.sku }})
            </option>
          </select>
          <p v-if="storeListings.length === 0 && selectedStoreId && !isLoadingListings" class="text-xs text-red-500">
            该店铺下暂无上架商品，请先去「店铺在售」板块上架。
          </p>
        </div>

        <div class="space-y-2">
          <label for="salesVolume" class="form-label">销量 *</label>
          <input type="number" id="salesVolume" v-model="formOtherData.salesVolume" required 
                 class="form-input" />
        </div>
        
        <div class="space-y-2">
          <label for="revenue" class="form-label">销售额 *</label>
          <div class="relative rounded-md shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span class="text-gray-500 sm:text-sm font-bold">{{ formOtherData.currency || 'CNY' }}</span>
            </div>
            <input type="number" step="0.01" id="revenue" v-model="formOtherData.revenue" required 
                 class="form-input pr-12 text-right font-mono text-lg" placeholder="0.00" />
          </div>
        </div>

        <div class="space-y-2">
          <label for="platformOrderId" class="form-label">平台订单号 *</label>
          <input type="text" id="platformOrderId" v-model="formOtherData.platformOrderId" required
                 class="form-input" placeholder="例如: 230101ABC..." />
        </div>

        <div class="space-y-2">
          <label for="orderStatus" class="form-label">订单状态 *</label>
          <select id="orderStatus" v-model="formOtherData.orderStatus" required class="form-input">
            <option value="" disabled>请选择状态...</option>
            <option v-for="status in orderStatusOptions" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>
        
        <div class="space-y-2 md:col-span-2">
          <label for="notes" class="form-label">备注 (可选)</label>
          <textarea id="notes" rows="2" v-model="formOtherData.notes"
                    class="form-input"></textarea>
        </div>
      </div>

      <button type="submit" 
              class="mt-8 inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        提 交 数 据
      </button>

      <p v-if="successMessage" class="text-green-600 mt-4 text-sm font-medium">{{ successMessage }}</p>
      <p v-if="errorMessage" class="text-red-600 mt-4 text-sm">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import useStoreListings from '../composables/useStoreListings';

const props = defineProps(['selectedCountry']);

const authStore = useAuthStore();
const {
  stores,
  fetchStores,
  storesLoading,
  storesError,
  getStoresByCountry,
  getStoresByCountryAndPlatform,
  permittedCountries,
  fetchListings,
} = useStoreListings();
const isLoadingStores = storesLoading;

// const selectedCountry = ref(''); // Removed, using prop
const selectedPlatform = ref('');
const selectedStoreId = ref('');
const selectedListingId = ref('');
const storeListings = ref([]);
const isLoadingListings = ref(false);

const formOtherData = ref({
  recordDate: new Date().toISOString().split('T')[0],
  salesVolume: null,
  revenue: null,
  currency: 'CNY',
  notes: '',
  platformOrderId: '',
  orderStatus: ''
});

const successMessage = ref('');
const errorMessage = ref('');

onMounted(() => {
  fetchStores();
});

watch(() => storesError.value, (val) => {
  if (val) {
    errorMessage.value = val;
  }
});

const platformOptions = computed(() => {
  if (!props.selectedCountry) return [];
  const platforms = getStoresByCountry(props.selectedCountry).map((store) => store.platform);
  return [...new Set(platforms)].sort();
});

const storeOptions = computed(() => {
  if (!props.selectedCountry || !selectedPlatform.value) return [];
  return getStoresByCountryAndPlatform(props.selectedCountry, selectedPlatform.value).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
});

const currencyMap = {
  'ID': 'IDR',
  'TH': 'THB',
  'VN': 'VND',
  'MY': 'MYR',
  'PH': 'PHP',
  'SG': 'SGD',
  'OTHER': 'USD'
};

const orderStatusOptions = [
  'Completed',
  'Pending',
  'Cancelled',
  'Refunded',
  'Returned'
];

watch(() => props.selectedCountry, (newVal) => {
  selectedPlatform.value = '';
  selectedStoreId.value = '';
  selectedListingId.value = '';
  storeListings.value = [];
  
  if (newVal && currencyMap[newVal]) {
    formOtherData.value.currency = currencyMap[newVal];
  } else {
    formOtherData.value.currency = 'USD';
  }
});

watch(selectedPlatform, () => {
  selectedStoreId.value = '';
  selectedListingId.value = '';
  storeListings.value = [];
});

watch(selectedStoreId, async (newStoreId) => {
  selectedListingId.value = '';
  storeListings.value = [];
  errorMessage.value = '';

  if (!newStoreId) return;

  isLoadingListings.value = true;
  try {
    storeListings.value = await fetchListings(newStoreId);
  } catch (error) {
    console.error('????????:', error);
    errorMessage.value = error.message || '?????????????';
  } finally {
    isLoadingListings.value = false;
  }
});

const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';

  if (!selectedStoreId.value || !selectedListingId.value) {
    errorMessage.value = '????????????????';
    return;
  }

  const targetListing = storeListings.value.find((l) => l.id === selectedListingId.value);
  if (!targetListing) {
    errorMessage.value = '????????????';
    return;
  }

  const payload = {
    ...formOtherData.value,
    storeId: selectedStoreId.value,
    listingId: selectedListingId.value,
    productId: targetListing.product.id,
    salesVolume: parseInt(formOtherData.value.salesVolume, 10) || 0,
    revenue: parseFloat(formOtherData.value.revenue) || 0,
    currency: formOtherData.value.currency || 'CNY',
    notes: formOtherData.value.notes || null,
    platformOrderId: formOtherData.value.platformOrderId || null,
    orderStatus: formOtherData.value.orderStatus || null,
  };

  if (!payload.platformOrderId || !payload.orderStatus) {
      errorMessage.value = '请填写平台订单号和订单状态';
      return;
  }

  try {
    const response = await apiClient.post('/sales', payload);
    successMessage.value = `???????ID: ${response.data.id}?`;

    formOtherData.value.salesVolume = null;
    formOtherData.value.revenue = null;
  } catch (error) {
    console.error('????:', error.response);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '?????????????????';
    }
  }
};
</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem;
}
.form-input {
  display: block;
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid #d4d4d4;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  background-color: #fff;
}
.form-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3);
  outline: none;
}
.form-input:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
