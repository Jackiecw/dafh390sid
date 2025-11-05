
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
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">图片</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">SKU</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">商品名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">分类</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="product in products" :key="product.id">
            <td class="px-6 py-4">
              <img :src="getImageUrl(product.imageUrl)" alt="product" class="h-12 w-12 object-cover rounded">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ product.sku }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ product.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ product.category }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
              <button @click="handleEdit(product)" class="text-indigo-600 hover:text-indigo-900">
                编辑
              </button>
              <button @click="handleDelete(product)" class="text-red-600 hover:text-red-900">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ProductFormModal
    :is-open="isModalOpen"
    :product-to-edit-id="currentProductToEditId" 
    @close="closeModal"
    @product-created="handleProductCreated"
    @product-updated="handleProductUpdated" 
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import ProductFormModal from './ProductFormModal.vue';

const products = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const currentProductToEditId = ref(null);
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', ''); // (获取 http://localhost:3000)

async function fetchProducts() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/products');
    products.value = response.data;
  } catch (error) {
    errorMessage.value = '获取商品列表失败。';
  } finally {
    isLoading.value = false;
  }
}
onMounted(() => { fetchProducts(); });

function getImageUrl(imageUrl) {
  if (!imageUrl) return 'https://via.placeholder.com/150'; // 默认图片
  // 拼接后端 URL 和相对路径
  return `${apiBaseUrl}${imageUrl}`;
}

function openModal() { isModalOpen.value = true; }
function closeModal() { 
  isModalOpen.value = false; 
  currentProductToEditId.value = null; 
}

function handleProductCreated(newProduct) {
  products.value.unshift(newProduct);
}

function handleEdit(product) {
  currentProductToEditId.value = product.id;
  openModal();
}

function handleProductUpdated(updatedProduct) {
  const index = products.value.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products.value[index] = updatedProduct;
  }
}

async function handleDelete(product) {
  if (confirm(`确定要删除 ${product.sku} (${product.name}) 吗？此操作不可逆！`)) {
    try {
      await apiClient.delete(`/admin/products/${product.id}`);
      products.value = products.value.filter(p => p.id !== product.id);
    } catch (error) {
      if (error.response && error.response.data.error) {
        alert(error.response.data.error);
      } else {
        alert('删除失败');
      }
    }
  }
}
</script>