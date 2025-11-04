<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">周报查看</h2>

    <p v-if="isLoading" class="text-stone-500">正在加载周报列表...</p>
    <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>

    <div v-if="!isLoading && reports.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">周开始日期</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">提交人</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">提交时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr v-for="report in reports" :key="report.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ formatDate(report.weekStartDate) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ report.author.nickname }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ formatDateTime(report.createdAt) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="openReportModal(report)" class="text-indigo-600 hover:text-indigo-900">
                查看详情
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoading && reports.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>目前还没有人提交周报。</p>
    </div>
  </div>

  <ReportDetailModal
    :is-open="isModalOpen"
    :report="selectedReport"
    @close="closeReportModal"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import ReportDetailModal from './ReportDetailModal.vue'; // ⬅️ 【新增】

// --- (API 和加载逻辑不变) ---
const reports = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

async function fetchReports() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/reports');
    reports.value = response.data;
  } catch (error) {
    console.error('获取周报列表失败:', error);
    if (error.response && error.response.status === 403) {
      errorMessage.value = '您没有权限查看此内容。';
    } else {
      errorMessage.value = '获取周报列表失败，请稍后重试。';
    }
  } finally {
    isLoading.value = false;
  }
}
onMounted(() => {
  fetchReports();
});


// --- 【新增】(弹窗控制逻辑) ---
const isModalOpen = ref(false);
const selectedReport = ref(null);

function openReportModal(report) {
  selectedReport.value = report;
  isModalOpen.value = true;
}
function closeReportModal() {
  isModalOpen.value = false;
  // (可选：关闭时清空，防止闪烁)
  // selectedReport.value = null; 
}


// --- (辅助函数) ---
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  // (简单格式 YYYY/M/D HH:mm)
  return new Date(dateString).toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>