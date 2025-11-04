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
            <option v-for="country in countryOptions" :key="country" :value="country">
              {{ country }}
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
          <label for="salesVolume" class="block text-sm font-medium text-stone-700">销量 *</label>
          <input type="number" id="salesVolume" v-model="formOtherData.salesVolume" required 
                 class="form-input" />
        </div>
        
        <div class="space-y-2">
          <label for="revenue" class="block text-sm font-medium text-stone-700">销售额 *</label>
          <input type="number" step="0.01" id="revenue" v-model="formOtherData.revenue" required 
                 class="form-input" />
        </div>
        
        <div class="space-y-2">
          <label for="adSpend" class="block text-sm font-medium text-stone-700">广告花费</label>
          <input type="number" step="0.01" id="adSpend" v-model="formOtherData.adSpend" 
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
// ⬇️ 【修改】 导入 'computed', 'watch', 'onMounted'
import { ref, computed, watch, onMounted } from 'vue';
import apiClient from '../api';

// --- 1. 【新增】 状态定义 ---

// (用于存储从 API 获取的所有店铺列表)
const allStores = ref([]);
const isLoadingStores = ref(true);

// (用于三个级联下拉菜单的 v-model)
const selectedCountry = ref('');
const selectedPlatform = ref('');
const selectedStoreId = ref(''); // ⬅️ (关键) 我们最终要提交的是这个 ID

// (用于存储表单中剩余的字段)
const formOtherData = ref({
  recordDate: new Date().toISOString().split('T')[0],
  salesVolume: null,
  revenue: null,
  adSpend: null,
});

// (用于提交状态)
const successMessage = ref('');
const errorMessage = ref('');

// --- 2. 【新增】 数据获取 (onMounted) ---
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


// --- 3. 【新增】 级联逻辑 (Computed) ---

// (第一级: 国家)
const countryOptions = computed(() => {
  // 从 allStores 中提取所有 'country' 字段
  const countries = allStores.value.map(store => store.country);
  // 使用 Set 去重，然后转回数组并排序
  return [...new Set(countries)].sort();
});

// (第二级: 平台)
const platformOptions = computed(() => {
  if (!selectedCountry.value) return [];
  
  const platforms = allStores.value
    .filter(store => store.country === selectedCountry.value)
    .map(store => store.platform);
  
  return [...new Set(platforms)].sort();
});

// (第三级: 店铺)
const storeOptions = computed(() => {
  if (!selectedCountry.value || !selectedPlatform.value) return [];
  
  return allStores.value
    .filter(store => 
      store.country === selectedCountry.value &&
      store.platform === selectedPlatform.value
    )
    .sort((a, b) => a.name.localeCompare(b.name));
});


// --- 4. 【新增】 级联逻辑 (Watch) ---

// (监视国家变化)
watch(selectedCountry, (newCountry) => {
  // 当国家改变时，清空平台和店铺的选择
  selectedPlatform.value = '';
  selectedStoreId.value = '';
});

// (监视平台变化)
watch(selectedPlatform, (newPlatform) => {
  // 当平台改变时，清空店铺的选择
  selectedStoreId.value = '';
});


// --- 5. 【修改】 提交逻辑 ---
const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';

  // (检查 Store ID 是否已选择)
  if (!selectedStoreId.value) {
    errorMessage.value = '请选择一个有效的店铺';
    return;
  }

  // (准备要发送的数据)
  const payload = {
    ...formOtherData.value,
    storeId: selectedStoreId.value, // ⬅️ (关键)
    // (确保数字被正确转换)
    salesVolume: parseInt(formOtherData.value.salesVolume) || 0,
    revenue: parseFloat(formOtherData.value.revenue) || 0,
    adSpend: parseFloat(formOtherData.value.adSpend) || 0,
  };

  try {
    const response = await apiClient.post('/sales', payload);
    successMessage.value = '数据提交成功！(ID: ' + response.data.id + ')';
    
    // (可选) 成功后重置表单
    // resetForm(); 
    
  } catch (error) {
    console.error('提交失败:', error.response);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '提交失败，请检查网络或联系管理员';
    }
  }
};

// (可选的重置函数)
// function resetForm() {
//   selectedCountry.value = '';
//   selectedPlatform.value = '';
//   selectedStoreId.value = '';
//   formOtherData.value = {
//     recordDate: new Date().toISOString().split('T')[0],
//     salesVolume: null,
//     revenue: null,
//     adSpend: null,
//   };
// }
</script>

<style scoped>
/* (辅助样式) */
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