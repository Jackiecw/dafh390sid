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
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">国家</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">注册日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="store in stores" :key="store.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ store.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ store.platform }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ store.country }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              <span :class="['px-2 py-1 rounded-full text-xs font-semibold', getStatusClass(store.status)]">
                {{ store.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ formatDate(store.registeredAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="handleEdit(store)" class="text-indigo-600 hover:text-indigo-900">
                编辑
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
    :store-to-edit-id="currentStoreToEditId" @close="closeModal"
    @store-created="handleStoreCreated"
    @store-updated="handleStoreUpdated" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import StoreFormModal from './StoreFormModal.vue';

const stores = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);

// ⬇️ 【新增】
const currentStoreToEditId = ref(null);

// (获取店铺列表) (不变)
async function fetchStores() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    // (调用 management.js 中的 GET /stores)
    const response = await apiClient.get('/admin/stores');
    stores.value = response.data;
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

// ⬇️ 【修改】 (弹窗控制)
function openModal() { isModalOpen.value = true; }
function closeModal() { 
  isModalOpen.value = false; 
  currentStoreToEditId.value = null; // (新增) 重置 ID
}

// (不变)
function handleStoreCreated(newStore) {
  // (在不刷新的情况下，将新店铺添加到列表顶部)
  stores.value.unshift(newStore);
}

// ⬇️ 【新增】 (编辑逻辑)
function handleEdit(store) {
  currentStoreToEditId.value = store.id;
  openModal();
}

// ⬇️ 【新增】 (更新 UI 逻辑)
function handleStoreUpdated(updatedStore) {
  const index = stores.value.findIndex(s => s.id === updatedStore.id);
  if (index !== -1) {
    stores.value[index] = updatedStore;
  }
}


// (辅助函数) (不变)
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