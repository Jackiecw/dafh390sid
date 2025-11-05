<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">店铺管理</h2>
      <button 
        @click="openModal" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        + 新建店铺
      </button>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载店铺列表...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div v-if="!isLoading && stores.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">店铺名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">平台</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">国家 (Code)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">在售商品 (SKU)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">注册日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="store in stores" :key="store.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ store.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ store.platform }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              {{ store.country ? store.country.name : 'N/A' }} 
              ({{ store.countryCode }})
            </td>
            
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              <span :class="['px-2 py-1 rounded-full text-xs font-semibold', getStatusClass(store.status)]">
                {{ store.status }}
              </span>
            </td>

            <td class="px-6 py-4 text-sm text-stone-500" style="min-width: 200px;">
              <div class="flex flex-wrap gap-1">
                <span v-if="!store.products || store.products.length === 0" class="px-2 py-0.5 text-xs text-gray-400">
                  未分配
                </span>
                <span v-else v-for="product in store.products" :key="product.sku"
                      class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {{ product.sku }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ formatDate(store.registeredAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
              <button @click="handleEdit(store)" class="text-indigo-600 hover:text-indigo-900">
                编辑
              </button>
              <button @click="handleAssignProducts(store)" class="text-green-600 hover:text-green-900">
                分配商品
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoading && stores.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>您还没有创建任何店铺。点击右上角按钮开始创建。</p>
    </div>
  </div>

  <StoreFormModal
    :is-open="isModalOpen"
    :store-to-edit-id="currentStoreToEditId" 
    @close="closeModal"
    @store-created="handleStoreCreated"
    @store-updated="handleStoreUpdated" 
  />

  <StoreProductModal
    :is-open="isStoreProductModalOpen"
    :store="currentStoreToAssign"
    @close="closeStoreProductModal"
  />
</template>

<script setup>
// ( <script setup> 部分保持不变 )
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import StoreFormModal from './StoreFormModal.vue';
import StoreProductModal from './StoreProductModal.vue'; 

const stores = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const currentStoreToEditId = ref(null);

const isStoreProductModalOpen = ref(false);
const currentStoreToAssign = ref(null);

async function fetchStores() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/stores');
    stores.value = response.data; // (数据将自动包含 products)
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    errorMessage.value = '获取店铺列表失败，请稍后重试。';
  } finally {
    isLoading.value = false;
  }
}
onMounted(() => {
  fetchStores();
});

function openModal() { isModalOpen.value = true; }
function closeModal() { 
  isModalOpen.value = false; 
  currentStoreToEditId.value = null; 
}

function handleStoreCreated(newStore) {
  fetchStores();
}

function handleEdit(store) {
  currentStoreToEditId.value = store.id;
  openModal();
}

function handleStoreUpdated() {
  fetchStores();
}

function handleAssignProducts(store) {
  currentStoreToAssign.value = store;
  isStoreProductModalOpen.value = true;
}
function closeStoreProductModal() {
  isStoreProductModalOpen.value = false;
  currentStoreToAssign.value = null;
  fetchStores(); // (可选) 分配后刷新列表
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
function getStatusClass(status) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'INACTIVE': return 'bg-yellow-100 text-yellow-800';
    case 'BANNED':
    case 'CLOSED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
</script>