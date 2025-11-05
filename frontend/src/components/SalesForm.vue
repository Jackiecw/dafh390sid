<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-stone-900 mb-6">录入销售数据</h2>
    
    <form @submit.prevent="handleSubmit">
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div class="space-y-2">
          <label for="recordDate" class="block text-sm font-medium text-stone-700">记录日期 *</label>
          <input type="date" id="recordDate" v-model="formOtherData.recordDate" required 
                 class="form-input" />
        </div>

        <div class="space-y-2">
          <label for="country" class="block text-sm font-medium text-stone-700">国家 *</label>
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
          <label for="platform" class="block text-sm font-medium text-stone-700">平台 *</label>
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
          <label for="store" class="block text-sm font-medium text-stone-700">店铺名称 *</label>
          <select id="store" v-model="selectedStoreId" required 
                  :disabled="!selectedPlatform"
                  class="form-input disabled:bg-gray-100 disabled:cursor-not-allowed">
            <option disabled value="">请选择店铺...</option>
            <option v-for="store in storeOptions" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="product" class="block text-sm font-medium text-stone-700">商品 *</label>
          <select 
            id="product" 
            v-model="selectedProductId" 
            required 
            :disabled="!selectedStoreId || isLoadingProducts"
            class="form-input disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option disabled value="">
              {{ isLoadingProducts ? '加载商品中...' : '请选择商品...' }}
            </option>
            <option v-for="product in storeProducts" :key="product.id" :value="product.id">
              {{ product.name }} ({{ product.sku }})
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="salesVolume" class="block text-sm font-medium text-stone-700">销量 *</label>
          <input type="number" id="salesVolume" v-model="formOtherData.salesVolume" required 
                 class="form-input" />
        </div>
        
        <div class="space-y-2">
          <label for="revenue" class="block text-sm font-medium text-stone-700">销售额 *</label>
          <input type="number" step="0.01" id="revenue" v-model="formOtherData.revenue" required 
                 class="form-input" />
        </div>
        
        </div>

      <button type="submit" 
              class="mt-8 inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        提 交 数 据
      </button>

      <p v-if="successMessage" class="text-green-600 mt-4">{{ successMessage }}</p>
      <p v-if="errorMessage" class="text-red-600 mt-4">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth'; 
import apiClient from '../api';

// --- 1. 状态定义 (修改) ---

const authStore = useAuthStore(); 

const allStores = ref([]);
const isLoadingStores = ref(true);

const selectedCountry = ref(''); 
const selectedPlatform = ref('');
const selectedStoreId = ref(''); 

// ⬇️ 【新增】
const selectedProductId = ref(''); 
const storeProducts = ref([]);
const isLoadingProducts = ref(false);

const formOtherData = ref({
  recordDate: new Date().toISOString().split('T')[0],
  salesVolume: null,
  revenue: null,
  // ⬅️ 【删除】 adSpend
});

const successMessage = ref('');
const errorMessage = ref('');

// --- 2. 数据获取 (onMounted) (不变) ---
async function fetchStores() {
  isLoadingStores.value = true;
  try {
    const response = await apiClient.get('/admin/stores');
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


// --- 3. 级联逻辑 (Computed) (不变) ---

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


// --- 4. 级联逻辑 (Watch) (修改) ---

// (监视国家变化)
watch(selectedCountry, (newCountry) => {
  selectedPlatform.value = '';
  selectedStoreId.value = '';
  // ⬇️ 【新增】
  selectedProductId.value = '';
  storeProducts.value = [];
});

// (监视平台变化)
watch(selectedPlatform, (newPlatform) => {
  selectedStoreId.value = '';
  // ⬇️ 【新增】
  selectedProductId.value = '';
  storeProducts.value = [];
});

// ⬇️ 【新增】 监视店铺变化，获取商品
watch(selectedStoreId, async (newStoreId) => {
  selectedProductId.value = '';
  storeProducts.value = [];
  
  if (!newStoreId) return; // 如果清空了店铺，则停止

  isLoadingProducts.value = true;
  try {
    // (调用我们在后端创建的新路由)
    const response = await apiClient.get(`/api/stores/${newStoreId}/products`);
    storeProducts.value = response.data;
  } catch (error) {
    console.error('获取店铺商品失败:', error);
    errorMessage.value = '无法加载该店铺的商品列表。';
  } finally {
    isLoadingProducts.value = false;
  }
});


// --- 5. 提交逻辑 (修改) ---
const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';

  // ⬇️ 【修改】
  if (!selectedStoreId.value || !selectedProductId.value) {
    errorMessage.value = '请选择一个有效的店铺和商品';
    return;
  }

  // ⬇️ 【修改】
  const payload = {
    ...formOtherData.value,
    storeId: selectedStoreId.value, 
    productId: selectedProductId.value, // ⬅️ 【新增】
    salesVolume: parseInt(formOtherData.value.salesVolume) || 0,
    revenue: parseFloat(formOtherData.value.revenue) || 0,
    // adSpend... // ⬅️ 【删除】
  };

  try {
    const response = await apiClient.post('/sales', payload);
    successMessage.value = '数据提交成功！(ID: ' + response.data.id + ')';
    
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
/* (不变) */
.form-input {
  display: block;
  width: 100%;
  border-radius: 0.375rem; /* rounded-md */
  border: 1px solid #d4d4d4; /* border-stone-300 */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  padding: 0.5rem 0.75rem; /* 调整内边距 */
}
.form-input:focus {
  border-color: #4f46e5; /* focus:border-indigo-500 */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3); /* focus:ring-indigo-500 */
  outline: none;
}
</style>