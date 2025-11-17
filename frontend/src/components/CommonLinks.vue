<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Quick Access</p>
          <h2 class="text-3xl font-semibold">常用链接</h2>
          <p class="text-sm text-white/80">收藏常用的后台、文档与协作工具，快速跳转。</p>
        </div>
        <button
          v-if="isAdmin"
          @click="handleCreate"
          class="rounded-2xl bg-white/90 px-5 py-3 text-sm font-semibold text-[#3B82F6] shadow-lg shadow-blue-500/30 transition hover:bg-white"
        >
          <PlusIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
          新建链接
        </button>
      </div>
    </section>

    <p v-if="isLoading" class="text-sm text-[#6B7280]">正在加载链接列表...</p>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <div
      v-if="!isLoading && links.length === 0 && !errorMessage"
      class="rounded-3xl border border-[#E5E7EB] bg-white p-6 text-center text-[#6B7280]"
    >
      <p>
        目前还没有常用链接。
        <span v-if="isAdmin">点击右上角按钮添加一个吧。</span>
      </p>
    </div>

    <div
      v-if="!isLoading && links.length > 0"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
    >
      <div
        v-for="link in links"
        :key="link.id"
        class="group relative rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <a :href="link.url" target="_blank" rel="noopener noreferrer" class="flex h-full flex-col justify-between">
          <p class="text-lg font-semibold text-[#1F2937] break-words">
            {{ link.title }}
          </p>
          <p class="mt-2 text-sm text-[#6B7280] break-words">
            {{ link.description || '点击跳转' }}
          </p>
        </a>

        <div
          v-if="isAdmin"
          class="absolute top-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100"
        >
          <button
            @click="handleEdit(link)"
            title="编辑"
            class="rounded-full bg-white p-1.5 text-[#64748B] shadow hover:text-[#3B82F6]"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button
            @click="handleDelete(link)"
            title="删除"
            class="rounded-full bg-white p-1.5 text-[#64748B] shadow hover:text-red-600"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
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
  </div>
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
