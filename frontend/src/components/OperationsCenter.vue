<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Ops Control</p>
          <h2 class="text-3xl font-semibold">运营中心</h2>
          <p class="text-sm text-white/80">按国家维度查看责任人矩阵和执行 SOP。</p>
        </div>
        <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
          <p class="text-xs text-white/70">可见国家</p>
          <p class="text-xl font-semibold">{{ countries.length }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <p v-if="isLoadingCountries" class="px-4 py-2 text-sm text-[#6B7280]">正在加载国家...</p>
        <button
          v-for="country in countries"
          :key="country.code"
          @click="currentCountryCode = country.code"
          :class="[
            'rounded-full px-4 py-2 text-sm font-semibold transition',
            currentCountryCode === country.code
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          {{ country.name }}
        </button>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex gap-3">
        <button
          @click="currentSubTab = 'matrix'"
          :class="[
            'rounded-full px-4 py-2 text-sm font-semibold',
            currentSubTab === 'matrix'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          责任人矩阵
        </button>
        <button
          @click="currentSubTab = 'sop'"
          disabled
          class="rounded-full px-4 py-2 text-sm font-semibold text-[#94A3B8] bg-[#F9FAFB] cursor-not-allowed"
        >
          SOP 文档 (未来)
        </button>
      </nav>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

      <div v-if="currentSubTab === 'matrix' && currentCountryCode">
        <ResponsibilityTable :country-code="currentCountryCode" />
      </div>

      <div v-if="currentSubTab === 'sop'" class="rounded-2xl bg-[#F9FAFB] p-6 text-center text-sm text-[#6B7280]">
        <p>SOP 文档功能正在规划中，敬请期待。</p>
      </div>
    </section>
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