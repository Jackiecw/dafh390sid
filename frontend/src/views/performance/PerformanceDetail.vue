<template>
  <div class="min-h-screen bg-gray-50 pb-12 print:bg-white print:pb-0">
    <!-- Header (Hidden when printing) -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
      <div class="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button @click="$router.back()" class="text-gray-500 hover:text-gray-700">
            &larr; 返回
          </button>
          <h1 class="text-lg font-bold text-gray-800">
            {{ review?.template?.name }} - {{ review ? formatMonth(review.month) : '' }}
          </h1>
          <span v-if="review" :class="getStatusBadgeClass(review.status)" class="px-2 py-0.5 rounded text-xs">
            {{ getStatusLabel(review.status) }}
          </span>
        </div>
        <div class="flex gap-3">
          <button @click="printReview" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            打印 / 导出PDF
          </button>
          <button 
            v-if="canReject"
            @click="rejectReview"
            class="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
          >
            驳回 / 退回修改
          </button>
          <button 
            v-if="canSubmit"
            @click="submitReview"
            class="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            提交 / 确认
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="review" class="max-w-5xl mx-auto mt-6 print:mt-0 print:w-full print:max-w-none">
      
      <!-- Process Flowchart (Screen only) -->
      <div class="mb-8 print:hidden">
        <div class="flex items-center justify-between relative">
          <div class="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10"></div>
          
          <div v-for="(step, index) in steps" :key="step.key" class="flex flex-col items-center bg-white px-2">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors"
              :class="getStepClass(step.key)"
            >
              {{ index + 1 }}
            </div>
            <span class="text-xs mt-1 font-medium text-gray-600">{{ step.label }}</span>
          </div>
        </div>
      </div>
      
      <!-- Print Header -->
      <div class="hidden print:block text-center mb-8 pt-8">
        <h1 class="text-2xl font-bold text-black mb-2">{{ review.template.name }}</h1>
        <div class="flex justify-center gap-8 text-sm text-gray-600">
          <span>被考核人: {{ review.employee.nickname }}</span>
          <span>部门: {{ review.employee.department || '无' }}</span> <!-- Assuming department exists or just placeholder -->
          <span>考核月份: {{ formatMonth(review.month) }}</span>
        </div>
      </div>

      <!-- Info Card (Screen only) -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 print:hidden">
        <div class="grid grid-cols-3 gap-6 text-sm">
          <div>
            <span class="text-gray-500 block mb-1">被考核人</span>
            <span class="font-medium text-gray-900">{{ review.employee.nickname }} ({{ review.employee.username }})</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">直属主管</span>
            <span class="font-medium text-gray-900">{{ review.manager.nickname }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">上级主管</span>
            <span class="font-medium text-gray-900">{{ review.director?.nickname || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Review Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-black">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-50 text-gray-700 font-semibold print:bg-gray-100 print:text-black border-b border-gray-200 print:border-black">
            <tr>
              <th class="px-4 py-3 w-24 border-r border-gray-200 print:border-black">维度</th>
              <th class="px-4 py-3 w-48 border-r border-gray-200 print:border-black">指标名称</th>
              <th class="px-4 py-3 border-r border-gray-200 print:border-black">评分标准</th>
              <th class="px-4 py-3 w-16 text-center border-r border-gray-200 print:border-black">权重</th>
              <th class="px-4 py-3 w-24 text-center border-r border-gray-200 print:border-black bg-blue-50 print:bg-transparent">自评</th>
              <th class="px-4 py-3 w-24 text-center border-r border-gray-200 print:border-black bg-yellow-50 print:bg-transparent">主管评</th>
              <th v-if="review.directorId" class="px-4 py-3 w-24 text-center bg-purple-50 print:bg-transparent">上级评</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 print:divide-black">
            <tr v-for="item in review.items" :key="item.id">
              <td class="px-4 py-3 font-medium border-r border-gray-200 print:border-black">{{ item.category }}</td>
              <td class="px-4 py-3 border-r border-gray-200 print:border-black">
                <div class="font-medium">{{ item.kpiName }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 border-r border-gray-200 print:border-black whitespace-pre-wrap">{{ item.description }}</td>
              <td class="px-4 py-3 text-center border-r border-gray-200 print:border-black">{{ item.weight }}%</td>
              
              <!-- Self Score -->
              <td class="px-2 py-2 border-r border-gray-200 print:border-black bg-blue-50/30 print:bg-transparent align-top text-center">
                <div v-if="canEditSelf">
                  <input v-model.number="item.selfScore" type="number" min="0" max="100" class="w-full border border-blue-200 rounded px-1 py-1 text-center focus:ring-1 focus:ring-blue-500 outline-none" placeholder="分">
                </div>
                <div v-else class="font-bold">
                  {{ item.selfScore }}
                </div>
              </td>

              <!-- Manager Score -->
              <td class="px-2 py-2 border-r border-gray-200 print:border-black bg-yellow-50/30 print:bg-transparent align-top">
                <div v-if="canEditManager">
                  <input v-model.number="item.managerScore" type="number" min="0" max="100" class="w-full border border-yellow-200 rounded px-1 py-1 text-center mb-1 focus:ring-1 focus:ring-yellow-500 outline-none" placeholder="分">
                  <textarea v-model="item.managerComment" rows="2" class="w-full border border-yellow-200 rounded px-1 py-1 text-xs resize-none focus:ring-1 focus:ring-yellow-500 outline-none" placeholder="评语"></textarea>
                </div>
                <div v-else class="text-center">
                  <div class="font-bold">{{ item.managerScore }}</div>
                  <div class="text-xs text-gray-500 text-left mt-1">{{ item.managerComment }}</div>
                </div>
              </td>

              <!-- Director Score -->
              <td v-if="review.directorId" class="px-2 py-2 bg-purple-50/30 print:bg-transparent align-top">
                <div v-if="canEditDirector">
                  <input v-model.number="item.directorScore" type="number" min="0" max="100" class="w-full border border-purple-200 rounded px-1 py-1 text-center mb-1 focus:ring-1 focus:ring-purple-500 outline-none" placeholder="分">
                  <textarea v-model="item.directorComment" rows="2" class="w-full border border-purple-200 rounded px-1 py-1 text-xs resize-none focus:ring-1 focus:ring-purple-500 outline-none" placeholder="评语"></textarea>
                </div>
                <div v-else class="text-center">
                  <div class="font-bold">{{ item.directorScore }}</div>
                  <div class="text-xs text-gray-500 text-left mt-1">{{ item.directorComment }}</div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 font-bold text-gray-900 border-t border-gray-200 print:border-black print:bg-white">
            <tr>
              <td colspan="4" class="px-4 py-3 text-right border-r border-gray-200 print:border-black">加权总分:</td>
              <td class="px-4 py-3 text-center border-r border-gray-200 print:border-black text-blue-700">{{ calculatedTotals.self }}</td>
              <td class="px-4 py-3 text-center border-r border-gray-200 print:border-black text-yellow-700">{{ calculatedTotals.manager }}</td>
              <td v-if="review.directorId" class="px-4 py-3 text-center text-purple-700">{{ calculatedTotals.director }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Summary Fields -->
      <div class="mt-8 space-y-6 print:space-y-4">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-black print:p-0">
          <h3 class="font-bold text-gray-800 mb-3 print:text-black">本月工作总结（存在的问题、计划改进方法）</h3>
          <textarea 
            v-if="canEditSelf"
            v-model="review.summaryThisMonth"
            rows="4"
            class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="请填写..."
          ></textarea>
          <div v-else class="whitespace-pre-wrap text-gray-700 print:text-black text-sm min-h-[3rem]">{{ review.summaryThisMonth || '无' }}</div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-black print:p-0">
          <h3 class="font-bold text-gray-800 mb-3 print:text-black">下月工作重点计划 (*)</h3>
          <textarea 
            v-if="canEditSelf"
            v-model="review.planNextMonth"
            rows="4"
            class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="请填写..."
          ></textarea>
          <div v-else class="whitespace-pre-wrap text-gray-700 print:text-black text-sm min-h-[3rem]">{{ review.planNextMonth || '无' }}</div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-black print:p-0">
          <h3 class="font-bold text-gray-800 mb-3 print:text-black">公司或部门存在的问题和建议</h3>
          <textarea 
            v-if="canEditSelf"
            v-model="review.companySuggestions"
            rows="4"
            class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="请填写..."
          ></textarea>
          <div v-else class="whitespace-pre-wrap text-gray-700 print:text-black text-sm min-h-[3rem]">{{ review.companySuggestions || '无' }}</div>
        </div>
      </div>

      <!-- Signatures (Print Only) -->
      <div class="hidden print:flex mt-12 justify-between px-12">
        <div class="text-center">
          <div class="mb-8">员工签字: __________________</div>
          <div>日期: __________________</div>
        </div>
        <div class="text-center">
          <div class="mb-8">主管签字: __________________</div>
          <div>日期: __________________</div>
        </div>
        <div v-if="review.directorId" class="text-center">
          <div class="mb-8">上级签字: __________________</div>
          <div>日期: __________________</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '../../api';
import { jwtDecode } from 'jwt-decode';

const route = useRoute();
const router = useRouter();
const review = ref(null);
const currentUser = ref(null);

// --- Computed Permissions ---

const canEditSelf = computed(() => {
  if (!review.value || !currentUser.value) return false;
  return review.value.status === 'SELF_REVIEW' && review.value.employeeId === currentUser.value.userId;
});

const canEditManager = computed(() => {
  if (!review.value || !currentUser.value) return false;
  return review.value.status === 'MANAGER_REVIEW' && review.value.managerId === currentUser.value.userId;
});

const canEditDirector = computed(() => {
  if (!review.value || !currentUser.value) return false;
  return review.value.status === 'DIRECTOR_REVIEW' && review.value.directorId === currentUser.value.userId;
});

const canSubmit = computed(() => {
  return canEditSelf.value || canEditManager.value || canEditDirector.value;
});

const canReject = computed(() => {
  if (!review.value || !currentUser.value) return false;
  if (review.value.status === 'MANAGER_REVIEW' && review.value.managerId === currentUser.value.userId) return true;
  if (review.value.status === 'DIRECTOR_REVIEW' && review.value.directorId === currentUser.value.userId) return true;
  return false;
});

const getStepClass = (stepKey) => {
  if (!review.value) return 'border-gray-200 text-gray-400';
  
  const statusOrder = ['DRAFT', 'SELF_REVIEW', 'MANAGER_REVIEW', 'DIRECTOR_REVIEW', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(review.value.status);
  const stepIndex = statusOrder.indexOf(stepKey);

  if (review.value.status === stepKey) {
    return 'border-blue-500 bg-blue-500 text-white'; // Current
  } else if (stepIndex < currentIndex) {
    return 'border-blue-500 bg-white text-blue-500'; // Completed
  } else {
    return 'border-gray-200 bg-white text-gray-400'; // Future
  }
};

// --- Logic ---

const calculatedTotals = computed(() => {
  if (!review.value) return { self: 0, manager: 0, director: 0 };
  
  let self = 0, manager = 0, director = 0;
  
  review.value.items.forEach(item => {
    const w = item.weight / 100;
    if (item.selfScore) self += item.selfScore * w;
    if (item.managerScore) manager += item.managerScore * w;
    if (item.directorScore) director += item.directorScore * w;
  });

  return {
    self: self.toFixed(2),
    manager: manager.toFixed(2),
    director: director.toFixed(2)
  };
});

const fetchReview = async () => {
  try {
    const res = await axios.get(`/reviews/${route.params.id}`);
    review.value = res.data;
  } catch (error) {
    console.error('Failed to fetch review', error);
    alert('无法加载考核详情');
  }
};

const saveReview = async (newStatus) => {
  try {
    const payload = {
      items: review.value.items.map(item => ({
        id: item.id,
        selfScore: item.selfScore,
        // selfComment: item.selfComment, // Removed
        managerScore: item.managerScore,
        managerComment: item.managerComment,
        directorScore: item.directorScore,
        directorComment: item.directorComment
      })),
      summaryThisMonth: review.value.summaryThisMonth,
      planNextMonth: review.value.planNextMonth,
      companySuggestions: review.value.companySuggestions
    };
    
    if (newStatus) {
      payload.status = newStatus;
    }

    await axios.put(`/reviews/${review.value.id}`, payload);
    await fetchReview(); // Reload
  } catch (error) {
    console.error('Failed to save review', error);
    alert('保存失败');
  }
};

const submitReview = async () => {
  if (!confirm('确定要提交吗？提交后将进入下一环节。')) return;
  
  let nextStatus = '';
  if (review.value.status === 'SELF_REVIEW') nextStatus = 'MANAGER_REVIEW';
  else if (review.value.status === 'MANAGER_REVIEW') {
    nextStatus = review.value.directorId ? 'DIRECTOR_REVIEW' : 'COMPLETED';
  }
  else if (review.value.status === 'DIRECTOR_REVIEW') nextStatus = 'COMPLETED';

  await saveReview(nextStatus);
};

const rejectReview = async () => {
  if (!confirm('确定要驳回吗？')) return;

  let prevStatus = '';
  if (review.value.status === 'MANAGER_REVIEW') prevStatus = 'SELF_REVIEW';
  else if (review.value.status === 'DIRECTOR_REVIEW') prevStatus = 'MANAGER_REVIEW';

  await saveReview(prevStatus);
};

const printReview = () => {
  window.print();
};

const formatMonth = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
};

const getStatusLabel = (status) => {
  const map = { 'DRAFT': '草稿', 'SELF_REVIEW': '待自评', 'MANAGER_REVIEW': '待主管评', 'DIRECTOR_REVIEW': '待终评', 'COMPLETED': '已完成', 'CANCELED': '已取消' };
  return map[status] || status;
};

const getStatusBadgeClass = (status) => {
  const map = { 'DRAFT': 'bg-gray-100 text-gray-600', 'SELF_REVIEW': 'bg-blue-100 text-blue-700', 'MANAGER_REVIEW': 'bg-yellow-100 text-yellow-700', 'DIRECTOR_REVIEW': 'bg-purple-100 text-purple-700', 'COMPLETED': 'bg-green-100 text-green-700', 'CANCELED': 'bg-red-100 text-red-700' };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const steps = [
  { key: 'DRAFT', label: '草稿' },
  { key: 'SELF_REVIEW', label: '自评' },
  { key: 'MANAGER_REVIEW', label: '主管评' },
  { key: 'DIRECTOR_REVIEW', label: '终评' },
  { key: 'COMPLETED', label: '完成' }
];

onMounted(() => {
  // Decode token to get current user info
  const token = localStorage.getItem('token');
  if (token) {
    currentUser.value = jwtDecode(token);
  }
  fetchReview();
});
</script>

<style>
@media print {
  @page {
    size: A4;
    margin: 10mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
