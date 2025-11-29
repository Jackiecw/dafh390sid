<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <button @click="$router.back()" class="text-gray-500 hover:text-gray-700">
          &larr; 返回
        </button>
        <h1 class="text-2xl font-bold text-gray-800">绩效模板管理</h1>
      </div>
      <button 
        @click="openCreateModal"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <span>+ 新建模板</span>
      </button>
    </div>

    <!-- Template List -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="template in templates" 
        :key="template.id"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
        @click="openPreviewModal(template)"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ template.name }}</h3>
          <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {{ template.items.length }} 项指标
          </span>
        </div>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ template.description || '暂无描述' }}</p>
        <div class="text-xs text-gray-400">
          创建于: {{ new Date(template.createdAt).toLocaleDateString() }}
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">新建绩效模板</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <span class="text-2xl">&times;</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
          <div class="space-y-4 mb-8">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
              <input 
                v-model="form.name"
                type="text" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="例如：2023年销售部月度考核"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea 
                v-model="form.description"
                rows="2"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="简要描述该模板的适用范围..."
              ></textarea>
            </div>
          </div>

          <div class="mb-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-800">考核指标 (KPI)</h3>
            <div class="flex items-center gap-4">
              <div :class="{'text-green-600 font-bold': totalWeight === 100, 'text-red-500 font-bold': totalWeight !== 100}">
                当前总权重: {{ totalWeight }}%
              </div>
              <button 
                @click="addItem"
                class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors"
              >
                + 添加指标
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="(item, index) in form.items" 
              :key="index"
              class="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-100"
            >
              <div class="w-24">
                <input 
                  v-model="item.category"
                  placeholder="维度"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                >
              </div>
              <div class="flex-1">
                <input 
                  v-model="item.kpiName"
                  placeholder="指标名称"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none mb-1"
                >
                <input 
                  v-model="item.description"
                  placeholder="评分标准/说明"
                  class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-gray-600"
                >
              </div>
              <div class="w-20">
                <input 
                  v-model.number="item.weight"
                  type="number"
                  placeholder="权重"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                >
              </div>
              <button 
                @click="removeItem(index)"
                class="text-red-400 hover:text-red-600 p-1"
                title="删除"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            @click="submitTemplate"
            :disabled="totalWeight !== 100 || !form.name"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            创建模板
          </button>
        </div>
      </div>
    </div>
    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">{{ selectedTemplate?.name }}</h2>
          <button @click="showPreviewModal = false" class="text-gray-400 hover:text-gray-600">
            <span class="text-2xl">&times;</span>
          </button>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
          <p class="text-gray-600 mb-6">{{ selectedTemplate?.description || '暂无描述' }}</p>
          
          <h3 class="font-semibold text-gray-800 mb-4">考核指标</h3>
          <div class="space-y-4">
            <div v-for="item in selectedTemplate?.items" :key="item.id" class="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div class="flex justify-between items-start mb-2">
                <div class="font-medium text-gray-900">
                  <span class="text-gray-500 text-sm mr-2">[{{ item.category }}]</span>
                  {{ item.kpiName }}
                </div>
                <div class="text-blue-600 font-bold">{{ item.weight }}%</div>
              </div>
              <p class="text-sm text-gray-600">{{ item.description }}</p>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 flex justify-end">
          <button 
            @click="showPreviewModal = false"
            class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from '../../api';

const templates = ref([]);
const showModal = ref(false);
const showPreviewModal = ref(false);
const selectedTemplate = ref(null);

const form = ref({
  name: '',
  description: '',
  items: [
    { category: '业绩指标', kpiName: '', description: '', weight: 0 }
  ]
});

const totalWeight = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
});

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/templates');
    templates.value = res.data;
  } catch (error) {
    console.error('Failed to fetch templates', error);
  }
};

const openCreateModal = () => {
  form.value = {
    name: '',
    description: '',
    items: [
      { category: '业绩指标', kpiName: '', description: '', weight: 0 }
    ]
  };
  showModal.value = true;
};

const openPreviewModal = (template) => {
  selectedTemplate.value = template;
  showPreviewModal.value = true;
};

const addItem = () => {
  form.value.items.push({ category: '', kpiName: '', description: '', weight: 0 });
};

const removeItem = (index) => {
  form.value.items.splice(index, 1);
};

const submitTemplate = async () => {
  if (totalWeight.value !== 100) {
    alert('总权重必须等于 100');
    return;
  }
  try {
    await axios.post('/templates', form.value);
    showModal.value = false;
    fetchTemplates();
  } catch (error) {
    console.error('Failed to create template', error);
    alert(error.response?.data?.error || '创建失败');
  }
};

onMounted(() => {
  fetchTemplates();
});
</script>
