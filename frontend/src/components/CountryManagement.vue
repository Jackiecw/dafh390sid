<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">国家管理</h2>
      <button 
        @click="openModal" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        + 新建国家
      </button>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载国家列表...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div v-if="!isLoading && countries.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">国家名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">国家代码 (Code)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">设立日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="country in countries" :key="country.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ country.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ country.code }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ formatDate(country.establishedAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="handleEdit(country)" class="text-indigo-600 hover:text-indigo-900">
                编辑
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoading && countries.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>您还没有创建任何国家。点击右上角按钮开始创建。</p>
    </div>
  </div>

  <CountryFormModal
    :is-open="isModalOpen"
    :country-to-edit-id="currentCountryToEditId"
    @close="closeModal"
    @country-created="handleCountryCreated"
    @country-updated="handleCountryUpdated"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import CountryFormModal from './CountryFormModal.vue'; // ⬅️ 导入新弹窗

const countries = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const currentCountryToEditId = ref(null);

// (获取国家列表)
async function fetchCountries() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/countries');
    countries.value = response.data;
  } catch (error) {
    console.error('获取国家列表失败:', error);
    errorMessage.value = '获取国家列表失败，请稍后重试。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchCountries();
});

// (弹窗控制)
function openModal() { isModalOpen.value = true; }
function closeModal() { 
  isModalOpen.value = false; 
  currentCountryToEditId.value = null;
}

// (创建后)
function handleCountryCreated(newCountry) {
  countries.value.unshift(newCountry);
}

// (编辑)
function handleEdit(country) {
  currentCountryToEditId.value = country.id;
  openModal();
}

// (更新后)
function handleCountryUpdated(updatedCountry) {
  const index = countries.value.findIndex(c => c.id === updatedCountry.id);
  if (index !== -1) {
    countries.value[index] = updatedCountry;
  }
}

// (辅助函数)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
</script>