<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">财务管理</h2>

    <div class="border-b border-stone-300">
      <nav class="flex space-x-4">
        
        <button 
          v-if="canEntry"
          @click="currentTab = 'entry'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'entry' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          支出录入
        </button>

        <button 
          v-if="canView"
          @click="currentTab = 'management'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'management' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          支出查询
        </button>

        <button 
          v-if="isAdmin || canExport"
          @click="currentTab = 'batch'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'batch' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          批量操作
        </button>
        </nav>
    </div>

    <div>
      <div v-if="currentTab === 'entry'">
        <FinanceForm />
      </div>
      <div v-if="currentTab === 'management'">
        <FinanceManagement />
      </div>
      <div v-if="currentTab === 'batch' && (isAdmin || canExport)">
        <FinanceBatchOps />
      </div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import FinanceForm from './FinanceForm.vue';
import FinanceManagement from './FinanceManagement.vue';
import FinanceBatchOps from './FinanceBatchOps.vue'; // ⬅️ 【新增】

const authStore = useAuthStore();

// 1. 检查用户是否具备“录入”和“查询”的子权限
const canEntry = computed(() => authStore.permissions.includes('FINANCE_ENTRY'));
const canView = computed(() => authStore.permissions.includes('FINANCE_VIEW'));
const isAdmin = computed(() => authStore.role === 'admin');
const canExport = computed(() => authStore.permissions.includes('FINANCE_EXPORT')); // ⬅️ 【新增】

// 2. 决定默认显示哪个标签页
const getDefaultTab = () => {
  // 优先级：管理员/财务 默认看查询，运营默认看录入
  if (canView.value && (authStore.role === 'admin' || canExport.value)) {
    return 'management';
  }
  if (canEntry.value) {
    return 'entry';
  }
  // 备用
  return canView.value ? 'management' : 'batch'; 
};

const currentTab = ref(getDefaultTab()); 
</script>