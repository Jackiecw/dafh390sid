<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">常用链接</h2>
      <button 
        v-if="isAdmin"
        @click="handleCreate"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        <PlusIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
        新建链接
      </button>
    </div>

    <p v-if="isLoading" class="text-stone-500">正在加载链接列表...</p>
    <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <div v-if="!isLoading && links.length === 0 && !errorMessage" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>
        目前还没有常用链接。
        <span v-if="isAdmin">点击右上角按钮添加一个。</span>
      </p>
    </div>

    <div v-if="!isLoading && links.length > 0" 
         class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      
      <div v-for="link in links" :key="link.id" class="relative group">
        
        <a :href="link.url" target="_blank" rel="noopener noreferrer"
           class="block bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col justify-between min-h-[100px]">
          
          <p class="font-semibold text-lg text-indigo-700 group-hover:text-indigo-800 break-words">
            {{ link.title }}
          </p>
          
          <p class="text-sm text-stone-500 mt-1 break-words">
            {{ link.description || '点击跳转' }}
          </p>
        </a>
        
        <div v-if="isAdmin" 
             class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
          <button @click="handleEdit(link)" title="编辑"
                  class="bg-white p-1.5 rounded-full shadow hover:bg-stone-100 text-stone-600 hover:text-indigo-600">
            <PencilIcon class="h-4 w-4" />
          </button>
          <button @click="handleDelete(link)" title="删除"
                  class="bg-white p-1.5 rounded-full shadow hover:bg-stone-100 text-stone-600 hover:text-red-600">
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  </div>
  
  <LinkModal
    :is-open="isModalOpen"
    :link-to-edit="currentLinkToEdit"
    @close="closeModal"
    @link-created="handleLinkChange"
    @link-updated="handleLinkChange"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import LinkModal from './LinkModal.vue'; // 导入新弹窗
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/vue/20/solid';

const links = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

// 权限
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

// 弹窗状态
const isModalOpen = ref(false);
const currentLinkToEdit = ref(null);

// 1. 获取所有链接 (使用 data.js 中的公共 API)
async function fetchLinks() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/links');
    links.value = response.data;
  } catch (error) {
    console.error('获取链接失败:', error);
    errorMessage.value = '获取链接列表失败。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchLinks();
});

// 2. 控制弹窗
function closeModal() {
  isModalOpen.value = false;
  currentLinkToEdit.value = null;
}

// 3. Admin: 创建
function handleCreate() {
  currentLinkToEdit.value = null;
  isModalOpen.value = true;
}

// 4. Admin: 编辑
function handleEdit(link) {
  currentLinkToEdit.value = link;
  isModalOpen.value = true;
}

// 5. Admin: 删除
async function handleDelete(link) {
  if (confirm(`确定要删除 "${link.title}" 吗？`)) {
    try {
      await apiClient.delete(`/admin/links/${link.id}`);
      fetchLinks(); // 删除后重新加载
    } catch (error) {
      console.error('删除失败:', error);
      errorMessage.value = error.response?.data?.error || '删除失败';
    }
  }
}

// 6. 弹窗提交成功后的回调
function handleLinkChange() {
  fetchLinks();
  closeModal();
}
</script>