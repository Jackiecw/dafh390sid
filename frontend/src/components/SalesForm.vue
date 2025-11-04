<template>
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-stone-900 mb-6">录入销售数据</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div class="space-y-2">
          <label for="recordDate" class="block text-sm font-medium text-stone-700">记录日期 *</label>
          <input type="date" id="recordDate" v-model="formData.recordDate" required 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="platform" class="block text-sm font-medium text-stone-700">平台 *</label>
          <input type="text" id="platform" v-model="formData.platform" required placeholder="例如: Shopee" 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="storeName" class="block text-sm font-medium text-stone-700">店铺名称 *</label>
          <input type="text" id="storeName" v-model="formData.storeName" required placeholder="例如: Aviewlux ID Store" 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="country" class="block text-sm font-medium text-stone-700">国家 *</label>
          <input type="text" id="country" v-model="formData.country" required placeholder="例如: ID" 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="salesVolume" class="block text-sm font-medium text-stone-700">销量 *</label>
          <input type="number" id="salesVolume" v-model="formData.salesVolume" required 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="revenue" class="block text-sm font-medium text-stone-700">销售额 *</label>
          <input type="number" step="0.01" id="revenue" v-model="formData.revenue" required 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="adSpend" class="block text-sm font-medium text-stone-700">广告花费</label>
          <input type="number" step="0.01" id="adSpend" v-model="formData.adSpend" 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div class="space-y-2">
          <label for="productSku" class="block text-sm font-medium text-stone-700">产品 SKU</label>
          <input type="text" id="productSku" v-model="formData.productSku" 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
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
// ( <script setup> 部分保持不变 )
import { ref } from 'vue';
import apiClient from '../api';

const formData = ref({
  recordDate: new Date().toISOString().split('T')[0],
  platform: '',
  storeName: '',
  country: '',
  productSku: '',
  salesVolume: 0,
  revenue: 0.0,
  adSpend: 0.0,
});
const successMessage = ref('');
const errorMessage = ref('');

const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';
  try {
    const response = await apiClient.post('/sales', formData.value);
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