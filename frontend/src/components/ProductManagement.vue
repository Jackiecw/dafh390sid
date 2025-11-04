<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">商品管理</h2>
      <button 
        @click="openModal" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        + 新建商品
      </button>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载商品列表...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div v-if="!isLoading && products.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">SKU (型号)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">商品名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">品类</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">采购价 (RMB)</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="product in products" :key="product.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ product.sku }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ product.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              <span class="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                {{ product.category }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ product.cost.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoading && products.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>您还没有创建任何商品。点击右上角按钮开始创建。</p>
    </div>
  </div>

  <ProductFormModal
    :is-open="isModalOpen"
    @close="closeModal"
    @product-created="handleProductCreated"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
// ⬇️ 干净的导入语句
import ProductFormModal from './ProductFormModal.vue';

const products = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);

async function fetchProducts() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/products');
    products.value = response.data;
  } catch (error) {
    console.error('获取商品列表失败:', error);
    errorMessage.value = '获取商品列表失败，请稍后重试。';
  } finally {
    isLoading.value = false;
  }
}
onMounted(() => {
  fetchProducts();
});

// (弹窗控制)
function openModal() { isModalOpen.value = true; }
function closeModal() { isModalOpen.value = false; }
function handleProductCreated(newProduct) {
  products.value.unshift(newProduct);
}
</script>