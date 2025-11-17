<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Store Network</p>
          <h2 class="text-3xl font-semibold">店铺管理</h2>
          <p class="text-sm text-white/80">维护各渠道店铺的基础信息与状态。</p> </div>
        <button
          @click="openModal"
          class="rounded-2xl bg-white/90 px-5 py-3 text-sm font-semibold text-[#3B82F6] shadow-lg shadow-blue-500/30 transition hover:bg-white"
        >
          + 新建店铺
        </button>
      </div>
    </section>

    <p v-if="isLoading" class="text-sm text-[#6B7280]">正在加载店铺列表...</p>
    <p v-if="errorMessage" class="text-sm text-red-600 mb-4">{{ errorMessage }}</p>

    <section v-if="!isLoading && stores.length > 0" class="rounded-3xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-[#E5E7EB]">
        <thead class="bg-[#F9FAFB]">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">店铺名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">平台</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">国家 (Code)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">注册日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-[#E5E7EB]">
          <tr v-for="store in stores" :key="store.id" class="hover:bg-[#F9FAFB]">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F2937]">{{ store.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">{{ store.platform }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">
              {{ store.country.name }} ({{ store.countryCode }})
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span :class="['px-2 py-1 rounded-full text-xs font-semibold', getStatusClass(store.status)]">
                {{ store.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">{{ formatDate(store.registeredAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
              <button @click="handleEdit(store)" class="text-[#3B82F6] hover:text-[#2563EB]">编辑</button>
              <button v-if="isAdmin" @click="handleDelete(store)" class="text-red-500 hover:text-red-700">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="!isLoading && stores.length === 0 && !errorMessage" class="rounded-3xl border border-[#E5E7EB] bg-white p-6 text-center text-[#6B7280]">
      <p>您还没有创建任何店铺。点击右上角按钮开始创建吧。</p>
    </div>
  </div>

  <StoreFormModal
    :is-open="isModalOpen"
    :store-to-edit-id="currentStoreToEditId"
    @close="closeModal"
    @store-created="handleStoreCreated"
    @store-updated="handleStoreUpdated"
  />

  </template>


<script setup>
// ⬇️ 【已删除】StoreProductModal 导入
import { computed, ref, onMounted } from 'vue';
import apiClient from '../api';
import StoreFormModal from './StoreFormModal.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const stores = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const currentStoreToEditId = ref(null);

// ⬇️ 【已删除】isStoreProductModalOpen 和 currentStoreToAssign
const isAdmin = computed(() => authStore.role === 'admin');

async function fetchStores() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    // (这个接口在 P2 已更新, 不再返回 products)
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

function openModal() { isModalOpen.value = true; }
function closeModal() { 
  isModalOpen.value = false; 
  currentStoreToEditId.value = null; 
}

function handleStoreCreated(newStore) {
  fetchStores(); // (重新加载列表)
}

function handleEdit(store) {
  currentStoreToEditId.value = store.id;
  openModal();
}

function handleStoreUpdated() {
  fetchStores(); // (重新加载列表)
}

// ⬇️ 【已删除】handleAssignProducts 和 closeStoreProductModal

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

async function handleDelete(store) {
  if (!isAdmin.value) return;
  if (!confirm(`确定要删除店铺「${store.name}」吗？该操作不可撤销。`)) return;
  errorMessage.value = '';
  try {
    await apiClient.delete(`/admin/stores/${store.id}`);
    await fetchStores();
  } catch (error) {
    console.error('删除店铺失败:', error);
    errorMessage.value = error.response?.data?.error || '删除店铺失败，请稍后再试。';
  }
}
</script>