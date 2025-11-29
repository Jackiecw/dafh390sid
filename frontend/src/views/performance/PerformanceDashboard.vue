<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">绩效考核中心</h1>
      <div class="flex gap-3">
        <router-link 
          to="/performance/templates"
          class="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          管理模板
        </router-link>
        <button 
          @click="openAssignModal"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span>+ 发起考核</span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 mb-6">
      <button 
        @click="activeTab = 'my'"
        :class="['px-6 py-3 font-medium text-sm transition-colors relative', activeTab === 'my' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700']"
      >
        我的绩效
        <div v-if="activeTab === 'my'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
      </button>
      <button 
        @click="activeTab = 'pending'"
        :class="['px-6 py-3 font-medium text-sm transition-colors relative', activeTab === 'pending' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700']"
      >
        待办考核
        <span v-if="pendingReviews.length > 0" class="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{{ pendingReviews.length }}</span>
        <div v-if="activeTab === 'pending'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
      </button>
    </div>

    <!-- Content -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <div v-else>
      <!-- My Reviews List -->
      <div v-if="activeTab === 'my'" class="space-y-4">
        <div v-if="myReviews.length === 0" class="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          暂无考核记录
        </div>
        <div 
          v-for="review in myReviews" 
          :key="review.id"
          class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
          @click="$router.push(`/performance/reviews/${review.id}`)"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
              {{ new Date(review.month).getMonth() + 1 }}月
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">{{ review.template.name }}</h3>
              <p class="text-sm text-gray-500">
                考核月份: {{ formatMonth(review.month) }} | 主管: {{ review.manager.nickname }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span :class="getStatusBadgeClass(review.status)" class="px-3 py-1 rounded-full text-xs font-medium">
              {{ getStatusLabel(review.status) }}
            </span>
            <div class="text-right">
              <div class="text-sm text-gray-500">最终得分</div>
              <div class="font-bold text-lg text-gray-800">{{ review.finalScore || '-' }}</div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>
      </div>

      <!-- Pending Reviews List -->
      <div v-if="activeTab === 'pending'" class="space-y-4">
        <div v-if="pendingReviews.length === 0" class="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          暂无待办考核
        </div>
        <div 
          v-for="review in pendingReviews" 
          :key="review.id"
          class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-yellow-400"
          @click="$router.push(`/performance/reviews/${review.id}`)"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
              {{ review.employee.nickname[0] }}
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">{{ review.employee.nickname }} 的考核</h3>
              <p class="text-sm text-gray-500">
                {{ review.template.name }} | {{ formatMonth(review.month) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span :class="getStatusBadgeClass(review.status)" class="px-3 py-1 rounded-full text-xs font-medium">
              {{ getStatusLabel(review.status) }}
            </span>
            <button class="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors">
              去处理
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Assign Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-6">发起绩效考核</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">被考核人</label>
            <select v-model="assignForm.employeeId" class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>请选择员工</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.nickname }} ({{ user.username }})</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">考核模板</label>
            <select v-model="assignForm.templateId" class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>请选择模板</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">考核月份</label>
            <input type="month" v-model="assignForm.month" class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">直属主管 (初评)</label>
            <select v-model="assignForm.managerId" class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>请选择主管</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.nickname }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              上级主管 (终评) 
              <span class="text-xs text-gray-400 font-normal ml-1">可选，留空则自动推算或无终评</span>
            </label>
            <select v-model="assignForm.directorId" class="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">(自动推算 / 无)</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.nickname }}</option>
            </select>
          </div>
        </div>

        <div class="mt-8 flex justify-end gap-3">
          <button @click="showAssignModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
          <button @click="submitAssign" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">确认发起</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from '../../api';

const activeTab = ref('my');
const loading = ref(true);
const myReviews = ref([]);
const pendingReviews = ref([]);
const showAssignModal = ref(false);

const users = ref([]);
const templates = ref([]);

const assignForm = ref({
  employeeId: '',
  templateId: '',
  month: new Date().toISOString().slice(0, 7), // YYYY-MM
  managerId: '',
  directorId: ''
});

const fetchData = async () => {
  loading.value = true;
  try {
    const [myRes, pendingRes] = await Promise.all([
      axios.get('/reviews/my'),
      axios.get('/reviews/pending')
    ]);
    myReviews.value = myRes.data;
    pendingReviews.value = pendingRes.data;
  } catch (error) {
    console.error('Failed to fetch reviews', error);
  } finally {
    loading.value = false;
  }
};

const fetchOptions = async () => {
  try {
    const [usersRes, templatesRes] = await Promise.all([
      axios.get('/admin/users'),
      axios.get('/templates')
    ]);
    users.value = usersRes.data;
    templates.value = templatesRes.data;
  } catch (error) {
    console.error('Failed to fetch options', error);
  }
};

const openAssignModal = () => {
  fetchOptions();
  showAssignModal.value = true;
};

const submitAssign = async () => {
  try {
    await axios.post('/reviews/assign', assignForm.value);
    showAssignModal.value = false;
    alert('发起成功');
    fetchData(); // Refresh list
  } catch (error) {
    console.error('Failed to assign review', error);
    alert(error.response?.data?.error || '发起失败');
  }
};

const formatMonth = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
};

const getStatusLabel = (status) => {
  const map = {
    'DRAFT': '草稿',
    'SELF_REVIEW': '待自评',
    'MANAGER_REVIEW': '待主管评',
    'DIRECTOR_REVIEW': '待终评',
    'COMPLETED': '已完成',
    'CANCELED': '已取消'
  };
  return map[status] || status;
};

const getStatusBadgeClass = (status) => {
  const map = {
    'DRAFT': 'bg-gray-100 text-gray-600',
    'SELF_REVIEW': 'bg-blue-100 text-blue-700',
    'MANAGER_REVIEW': 'bg-yellow-100 text-yellow-700',
    'DIRECTOR_REVIEW': 'bg-purple-100 text-purple-700',
    'COMPLETED': 'bg-green-100 text-green-700',
    'CANCELED': 'bg-red-100 text-red-700'
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

onMounted(() => {
  fetchData();
});
</script>
