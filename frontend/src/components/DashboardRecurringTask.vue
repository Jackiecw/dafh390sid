<template>
  <div class="dashboard-widget">
    <div class="flex justify-between items-center mb-2">
      <h4 class="dashboard-widget-title">周期任务</h4>
      <button @click="isModalOpen = true" class="text-indigo-600 hover:text-indigo-800">
        <PlusCircleIcon class="h-5 w-5" />
      </button>
    </div>

    <div v-if="isLoading" class="text-stone-500 text-sm">加载中...</div>
    <p v-if="!isLoading && tasks.length === 0" class="text-stone-400 text-sm">
      暂无周期任务
    </p>

    <div class="space-y-3 mt-4 max-h-48 overflow-y-auto pr-2">
      <div v-if="dailyTasks.length > 0">
        <label class="text-xs font-bold text-stone-500">每日</label>
        <div v-for="task in dailyTasks" :key="task.id" class="flex items-center group">
          <input 
            type="checkbox"
            :id="'task-' + task.id"
            :checked="isTaskCompleted(task)"
            @change="() => handleToggleTask(task, isTaskCompleted(task))"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label 
            :for="'task-' + task.id" 
            :class="[
              'ml-3 text-sm text-stone-700 w-full', 
              isTaskCompleted(task) ? 'line-through text-stone-400' : ''
            ]"
          >
            {{ task.content }}
          </label>
          <button @click="() => handleDeleteTask(task)" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <XCircleIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div v-if="weeklyTasks.length > 0">
        <label class="text-xs font-bold text-stone-500">每周</label>
         <div v-for="task in weeklyTasks" :key="task.id" class="flex items-center group">
          <input 
            type="checkbox"
            :id="'task-' + task.id"
            :checked="isTaskCompleted(task)"
            @change="() => handleToggleTask(task, isTaskCompleted(task))"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label :for="'task-' + task.id" :class="['ml-3 text-sm text-stone-700 w-full', isTaskCompleted(task) ? 'line-through text-stone-400' : '']">
            {{ task.content }}
          </label>
          <button @click="() => handleDeleteTask(task)" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <XCircleIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div v-if="monthlyTasks.length > 0">
        <label class="text-xs font-bold text-stone-500">每月</label>
         <div v-for="task in monthlyTasks" :key="task.id" class="flex items-center group">
          <input 
            type="checkbox"
            :id="'task-' + task.id"
            :checked="isTaskCompleted(task)"
            @change="() => handleToggleTask(task, isTaskCompleted(task))"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label :for="'task-' + task.id" :class="['ml-3 text-sm text-stone-700 w-full', isTaskCompleted(task) ? 'line-through text-stone-400' : '']">
            {{ task.content }}
          </label>
           <button @click="() => handleDeleteTask(task)" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            <XCircleIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <RecurringTaskModal 
    :is-open="isModalOpen"
    @close="isModalOpen = false"
    @task-created="handleTaskCreated"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import apiClient from '../api';
import { PlusCircleIcon, XCircleIcon } from '@heroicons/vue/20/solid';
import RecurringTaskModal from './RecurringTaskModal.vue';

const tasks = ref([]);
const isLoading = ref(true);
const isModalOpen = ref(false);

// --- 1. 数据获取 ---
async function fetchTasks() {
  isLoading.value = true;
  try {
    const response = await apiClient.get('/recurring-tasks');
    tasks.value = response.data;
  } catch (error) {
    console.error("加载周期任务失败:", error);
  } finally {
    isLoading.value = false;
  }
}
onMounted(fetchTasks);

// --- 2. 筛选 (Computed) ---
const dailyTasks = computed(() => tasks.value.filter(t => t.period === 'DAILY'));
const weeklyTasks = computed(() => tasks.value.filter(t => t.period === 'WEEKLY'));
const monthlyTasks = computed(() => tasks.value.filter(t => t.period === 'MONTHLY'));

// --- 3. 核心：检查状态 (前端重置逻辑) ---
// (这部分已由后端在 GET /api/recurring-tasks 中处理)
const isTaskCompleted = (task) => {
  return !!task.lastCompletedAt;
};

// --- 4. CRUD ---
async function handleToggleTask(task, isCurrentlyCompleted) {
  try {
    const updatedTask = await apiClient.put(`/recurring-tasks/${task.id}/toggle`, { 
      isCompleted: !isCurrentlyCompleted 
    });
    // 更新本地数据
    const index = tasks.value.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks.value[index].lastCompletedAt = updatedTask.lastCompletedAt;
    }
  } catch (error) {
    console.error("更新任务失败:", error);
  }
}

async function handleDeleteTask(task) {
  if (!confirm(`确定删除周期任务 "${task.content}" 吗？`)) return;
  try {
    await apiClient.delete(`/recurring-tasks/${task.id}`);
    tasks.value = tasks.value.filter(t => t.id !== task.id);
  } catch (error) {
    console.error("删除任务失败:", error);
  }
}

function handleTaskCreated(newTask) {
  tasks.value.push(newTask);
  isModalOpen.value = false;
}

</script>

<style lang="postcss" scoped>
/* ⬇️ 【修复】 重新添加此行 */
@import "tailwindcss" reference;

/* (复用样式) */
.dashboard-widget {
  @apply bg-white p-6 rounded-lg shadow-lg h-full flex flex-col;
}
.dashboard-widget-title {
  @apply font-bold text-stone-900;
}
</style>