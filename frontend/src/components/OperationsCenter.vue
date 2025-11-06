<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">运营中心</h2>

    <div class="border-b border-stone-300">
      <nav class="flex space-x-4">
        <p v-if="isLoadingCountries" class="py-2 px-4 text-sm font-medium text-stone-500">
          正在加载国家...
        </p>
        <button 
          v-for="country in countries"
          :key="country.code"
          @click="currentCountryCode = country.code"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentCountryCode === country.code
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          {{ country.name }}
        </button>
        </nav>
    </div>

    <div class="border-b border-stone-200">
      <nav class="flex space-x-4">
        <button 
          @click="currentSubTab = 'matrix'"
          :class="[
            'py-2 px-1 text-sm font-medium',
            currentSubTab === 'matrix'
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          责任人矩阵
        </button>
        <button 
          @click="currentSubTab = 'sop'"
          disabled
          class="py-2 px-1 text-sm font-medium text-stone-400 cursor-not-allowed"
        >
          SOP 文档 (未来)
        </button>
      </nav>
    </div>

    <div>
      <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

      <div v-if="currentSubTab === 'matrix' && currentCountryCode">
        <ResponsibilityTable :country-code="currentCountryCode" />
      </div>

      <div v-if="currentSubTab === 'sop'" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
        <p>SOP 文档功能正在规划中...</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import ResponsibilityTable from './ResponsibilityTable.vue'; // ⬅️ 导入核心组件
import { useAuthStore } from '../stores/auth'; // ⬅️ 【新增】 1. 导入 auth store

const countries = ref([]);
const isLoadingCountries = ref(true);
const errorMessage = ref('');

const currentCountryCode = ref(null); // (例如: 'ID')
const currentSubTab = ref('matrix'); // (默认显示 'matrix')

const authStore = useAuthStore(); // ⬅️ 【新增】 2. 获取 auth store 实例

async function fetchCountries() {
  isLoadingCountries.value = true;
  errorMessage.value = '';
  try {
    // (我们从 /api/countries 获取列表，这是一个受 authMiddleware 保护的路由)
    const response = await apiClient.get('/countries');
    
    // ⬇️ 【修改】 3. 根据角色过滤国家列表
    const allCountries = response.data;
    
    if (authStore.role === 'admin') {
      // (A) 管理员：看到所有国家
      countries.value = allCountries;
    } else {
      // (B) 运营专员：只看自己“运营”的国家
      const userOperatedCodes = authStore.operatedCountries; // (例如: ['ID', 'VN'])
      countries.value = allCountries.filter(country => 
        userOperatedCodes.includes(country.code)
      );
    }
    // ⬆️ 【修改】
    
    // (关键) 默认选中第一个国家
    if (countries.value.length > 0) {
      currentCountryCode.value = countries.value[0].code;
    }

  } catch (error) {
    console.error('获取国家列表失败:', error);
    errorMessage.value = '无法加载国家列表。';
  } finally {
    isLoadingCountries.value = false;
  }
}

onMounted(() => {
  fetchCountries();
});
</script>