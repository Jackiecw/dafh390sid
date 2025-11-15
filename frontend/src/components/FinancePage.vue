<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Finance Control</p>
          <h2 class="text-3xl font-semibold">财务管理</h2>
          <p class="text-sm text-white/80">统一录入与查询支出，支持批量导出与下载。</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur">
            <p class="text-white/70">可录入</p>
            <p class="text-xl font-semibold">{{ canEntry ? '是' : '否' }}</p>
          </div>
          <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur">
            <p class="text-white/70">可导出</p>
            <p class="text-xl font-semibold">{{ isAdmin || canExport ? '是' : '否' }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex flex-wrap gap-3">
        <button
          v-if="canEntry"
          @click="currentTab = 'entry'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'entry'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          支出录入
        </button>
        <button
          v-if="canView"
          @click="currentTab = 'management'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'management'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          支出查询
        </button>
        <button
          v-if="isAdmin || canExport"
          @click="currentTab = 'batch'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'batch'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          批量操作
        </button>
      </nav>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div v-if="currentTab === 'entry'">
        <FinanceForm />
      </div>
      <div v-else-if="currentTab === 'management'">
        <FinanceManagement />
      </div>
      <div v-else-if="currentTab === 'batch' && (isAdmin || canExport)">
        <FinanceBatchOps />
      </div>
    </section>
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
