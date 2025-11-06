<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">周报中心</h2>

    <div class="border-b border-stone-300">
      <nav class="flex space-x-4">
        <button 
          v-if="canFillReports"
          @click="currentTab = 'entry'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'entry' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          周报填写
        </button>
        <button 
          v-if="canViewReports"
          @click="currentTab = 'management'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'management' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          周报查看
        </button>
      </nav>
    </div>

    <div>
      <div v-if="currentTab === 'entry'">
        <WeeklyReportForm />
      </div>
      <div v-if="currentTab === 'management'">
        <ViewReports />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import WeeklyReportForm from './WeeklyReportForm.vue';
import ViewReports from './ViewReports.vue';

const authStore = useAuthStore();

// 1. 检查用户是否具备“填写”和“查看”的子权限
const canFillReports = computed(() => authStore.permissions.includes('WEEKLY_REPORT'));
const canViewReports = computed(() => authStore.permissions.includes('VIEW_REPORTS'));

// 2. 决定默认显示哪个标签页
// (如果用户能填写，默认显示填写；否则如果能查看，默认显示查看)
const getDefaultTab = () => {
  if (canFillReports.value) {
    return 'entry';
  }
  if (canViewReports.value) {
    return 'management';
  }
  return 'entry'; // (默认)
};

const currentTab = ref(getDefaultTab()); 
</script>