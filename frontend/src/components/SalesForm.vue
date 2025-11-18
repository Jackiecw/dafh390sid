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

        <div class="space-y-2">
          <label for="country" class="form-label">国家 *</label>
          <select id="country" v-model="selectedCountry" required class="form-input">
            <option disabled value="">
              {{ isLoadingStores ? '正在加载...' : '请选择国家...' }}
            </option>
            <option v-for="country in countryOptions" :key="country.code" :value="country.code">
              {{ country.name }} ({{ country.code }})
            </option>
          </select>
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
          <label for="revenue" class="form-label">销售额 (原币种) *</label>
          <input type="number" step="0.01" id="revenue" v-model="formOtherData.revenue" required 
                 class="form-input" />
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

// --- 状态定义 ---

const authStore = useAuthStore(); 

const allStores = ref([]);
const isLoadingStores = ref(true);

// 级联选择状态
const selectedCountry = ref(''); 
const selectedPlatform = ref('');
const selectedStoreId = ref(''); 

// ⬇️ 【修改】从 Product 变为 Listing
const selectedListingId = ref(''); 
const storeListings = ref([]);
const isLoadingListings = ref(false);

const formOtherData = ref({
  recordDate: new Date().toISOString().split('T')[0],
  salesVolume: null,
  revenue: null,
  notes: '',
});

const successMessage = ref('');
const errorMessage = ref('');

// --- 数据获取 ---

async function fetchStores() {
  isLoadingStores.value = true;
  try {
    const response = await apiClient.get('/stores-list'); 
    allStores.value = response.data;
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    errorMessage.value = '无法加载店铺选项，请联系管理员。';
  } finally {
    isLoadingStores.value = false;
  }
}

onMounted(() => {
  fetchStores();
});

// --- 级联逻辑 (Computed) ---

const countryOptions = computed(() => {
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authStore.role === 'admin') {
    return allUniqueCountries; 
  }
  const userCountryCodes = authStore.operatedCountries; 
  return allUniqueCountries.filter(country => 
    userCountryCodes.includes(country.code)
  );
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

// --- 级联逻辑 (Watch) ---

watch(selectedCountry, () => {
  selectedPlatform.value = '';
  selectedStoreId.value = '';
  selectedListingId.value = '';
  storeListings.value = [];
});

watch(selectedPlatform, () => {
  selectedStoreId.value = '';
  selectedListingId.value = '';
  storeListings.value = [];
});

// ⬇️ 【修改】监视店铺变化，获取 Listing
watch(selectedStoreId, async (newStoreId) => {
  selectedListingId.value = '';
  storeListings.value = [];
  errorMessage.value = '';
  
  if (!newStoreId) return; 

  isLoadingListings.value = true;
  try {
    // 调用新接口
    const response = await apiClient.get(`/stores/${newStoreId}/listings`);
    storeListings.value = response.data;
  } catch (error) {
    console.error('获取店铺链接失败:', error);
    errorMessage.value = '无法加载该店铺的商品链接。';
  } finally {
    isLoadingListings.value = false;
  }
});

// --- 提交逻辑 ---

const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';

  if (!selectedStoreId.value || !selectedListingId.value) {
    errorMessage.value = '请选择一个有效的店铺和商品链接';
    return;
  }

  // ⬇️ 【修改】根据 listingId 找到对应的 productId
  const targetListing = storeListings.value.find(l => l.id === selectedListingId.value);
  if (!targetListing) {
    errorMessage.value = '链接数据异常，请刷新重试';
    return;
  }

  const payload = {
    ...formOtherData.value,
    storeId: selectedStoreId.value, 
    listingId: selectedListingId.value, // ⬅️ 发送链接 ID
    productId: targetListing.product.id, // ⬅️ 发送产品 ID (后端为了兼容性仍需要)
    salesVolume: parseInt(formOtherData.value.salesVolume) || 0,
    revenue: parseFloat(formOtherData.value.revenue) || 0,
    notes: formOtherData.value.notes || null,
  };

  try {
    const response = await apiClient.post('/sales', payload);
    successMessage.value = '数据提交成功！(ID: ' + response.data.id + ')';
    
    // 重置部分表单
    formOtherData.value.salesVolume = null;
    formOtherData.value.revenue = null;
    // formOtherData.value.notes = ''; // 可选：清空备注

  } catch (error) {
    console.error('提交失败:', error.response);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '提交失败，请检查网络或联系管理员';
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