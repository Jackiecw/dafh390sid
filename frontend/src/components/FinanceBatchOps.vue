<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    
    <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow-lg space-y-4">
      <h3 class="text-xl font-bold text-stone-900 mb-2">批量导入支出</h3>
      <p class="text-sm text-stone-500">
        请下载模板，按照模板格式填写数据后上传。 (仅限管理员)
      </p>

      <button
        @click="handleDownloadTemplate"
        class="inline-flex items-center rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 transition"
      >
        <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
        下载 Excel 模板
      </button>

      <div class="border-t pt-4">
        <label for="file-upload" class="form-label">上传已填写的 Excel 文件 *</label>
        <input 
          id="file-upload"
          type="file"
          @change="onFileSelected"
          accept=".xlsx, .xls"
          class="block w-full text-sm text-stone-500
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-indigo-50 file:text-indigo-700
                 hover:file:bg-indigo-100"
        />
        <button
          @click="handleUpload"
          :disabled="!selectedFile || isLoading.import"
          class="mt-4 inline-flex justify-center rounded-lg border border-transparent bg-green-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition disabled:bg-gray-400"
        >
          <ArrowUpTrayIcon class="h-5 w-5 mr-2" />
          {{ isLoading.import ? '上传中...' : '开始导入' }}
        </button>
      </div>

      <div v-if="importResult" class="mt-4 space-y-2">
        <p :class="['font-semibold', importResult.failedCount > 0 ? 'text-red-600' : 'text-green-600']">
          {{ importResult.message }}
        </p>
        <p class="text-sm text-stone-700">
          成功导入: {{ importResult.importedCount }} 条
        </p>
        <p v-if="importResult.failedCount > 0" class="text-sm text-red-600">
          失败: {{ importResult.failedCount }} 条
        </p>
        <div v-if="importResult.failedRows && importResult.failedRows.length > 0" 
             class="p-3 bg-red-50 border border-red-200 rounded-md max-h-40 overflow-y-auto">
          <p class="text-sm font-semibold text-red-700">失败详情:</p>
          <ul class="list-disc list-inside">
            <li v-for="fail in importResult.failedRows" :key="fail.row" class="text-xs text-red-700">
              Excel 第 {{ fail.row }} 行: {{ fail.error }}
            </li>
          </ul>
        </div>
      </div>

    </div>
    
    <div v-if="isAdmin && !canExport" class="bg-white p-6 rounded-lg shadow-lg space-y-4 text-stone-400">
      (导出功能卡片占位)
    </div>

    <div v-if="canExport" class="bg-white p-6 rounded-lg shadow-lg space-y-4">
      <h3 class="text-xl font-bold text-stone-900 mb-2">批量导出支出</h3>
      <p class="text-sm text-stone-500">
        根据日期范围导出支出数据为 Excel 文件。
      </p>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="exportStartDate" class="form-label">开始日期 *</label>
          <input type="date" id="exportStartDate" v-model="exportDates.startDate" class="form-input" />
        </div>
        <div class="space-y-2">
          <label for="exportEndDate" class="form-label">结束日期 *</label>
          <input type="date" id="exportEndDate" v-model="exportDates.endDate" class="form-input" />
        </div>
      </div>
      
      <button
        @click="handleExport"
        :disabled="!exportDates.startDate || !exportDates.endDate || isLoading.export"
        class="mt-4 inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition disabled:bg-gray-400"
      >
        <ArrowDownOnSquareIcon class="h-5 w-5 mr-2" />
        {{ isLoading.export ? '导出中...' : '导出数据' }}
      </button>

      <p v-if="exportError" class="text-red-600 text-sm mt-2">{{ exportError }}</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; // ⬅️ 【新增】 导入 computed
import apiClient from '../api';
import { useAuthStore } from '../stores/auth'; // ⬅️ 【新增】 导入 auth
import { 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  ArrowDownOnSquareIcon 
} from '@heroicons/vue/20/solid';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// --- 权限 ---
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');
const canExport = computed(() => authStore.permissions.includes('FINANCE_EXPORT'));

// --- 状态 ---
const isLoading = ref({ import: false, export: false });
const selectedFile = ref(null);

// 导入
const importResult = ref(null);

// 导出
const today = new Date().toISOString().split('T')[0];
const firstDayOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];
const exportDates = ref({
  startDate: firstDayOfMonth,
  endDate: today,
});
const exportError = ref('');


// --- 1. 导入逻辑 ---

function onFileSelected(event) {
  selectedFile.value = event.target.files[0];
  importResult.value = null; // 重置结果
}

async function handleUpload() {
  if (!selectedFile.value) return;

  isLoading.value.import = true;
  importResult.value = null;

  const payload = new FormData();
  payload.append('expenseFile', selectedFile.value);

  try {
    const response = await apiClient.post('/admin/expenses/import', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    importResult.value = response.data;
  } catch (error) {
    console.error('导入失败:', error);
    importResult.value = {
      message: '导入失败!',
      importedCount: 0,
      failedCount: 0,
      failedRows: [{ row: '?', error: error.response?.data?.error || '上传失败，请检查文件格式或联系管理员' }]
    };
  } finally {
    isLoading.value.import = false;
  }
}

// --- 2. 模板下载逻辑 ---

function handleDownloadTemplate() {
  const headers = [
    '支出日期', '项目描述', '金额', 
    '付款方式', '付款方', '收款方', 
    '票据状态', '是否垫付(Y/N)', '报销日期',
    '归属店铺名称', '备注'
  ];
  
  const exampleData = [
    [
      '2025-11-10', 'Facebook 广告费', 1500.50, 
      '信用卡', '公司招行卡', 'Facebook', 
      '无票', 'N', '', 
      'Shopee 印尼 Mall 店', '11月第一周'
    ],
    [
      '2025-11-11', 'Tiktok 达人营销', 500, 
      '银行转账', '运营A', 'Tiktok Agency', 
      '普票', 'Y', '2025-11-30', 
      'Tiktok 越南', 'KOL 合作'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
  
  // (设置列宽)
  ws['!cols'] = [
    { wch: 12 }, // 支出日期
    { wch: 30 }, // 项目描述
    { wch: 10 }, // 金额
    { wch: 12 }, // 付款方式
    { wch: 15 }, // 付款方
    { wch: 15 }, // 收款方
    { wch: 10 }, // 票据状态
    { wch: 15 }, // 是否垫付
    { wch: 12 }, // 报销日期
    { wch: 30 }, // 归属店铺名称
    { wch: 30 }  // 备注
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '支出模板');
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    '支出批量导入模板.xlsx'
  );
}


// --- 3. 导出逻辑 (不变) ---

async function handleExport() {
  isLoading.value.export = true;
  exportError.value = '';

  try {
    // (我们将在阶段 3.3 中创建这个后端 API)
    const response = await apiClient.get('/admin/expenses/export', {
      params: {
        startDate: exportDates.value.startDate,
        endDate: exportDates.value.endDate
      },
      responseType: 'blob', // ⬅️ (关键) 告诉 axios 我们在下载文件
    });
    
    // (使用 file-saver)
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `支出报表_${exportDates.value.startDate}_至_${exportDates.value.endDate}.xlsx`);

  } catch (error) {
    console.error('导出失败:', error);
    exportError.value = '导出失败，请重试。';
  } finally {
    isLoading.value.export = false;
  }
}

</script>

<style scoped>
/* (复用样式) */
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.form-input {
  display: block;
  width: 100%;
  border-radius: 0.375rem; /* rounded-md */
  border: 1px solid #d4d4d4; /* border-stone-300 */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  padding: 0.75rem;
  font-size: 1rem;
}
.form-input:focus {
  border-color: #4f46e5; /* focus:border-indigo-500 */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3); /* focus:ring-indigo-500 */
  outline: none;
}
</style>