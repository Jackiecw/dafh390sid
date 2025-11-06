<template>
  <div class="dashboard-widget">
    <h4 class="dashboard-widget-title">待办</h4>
    
    <div v-if="isLoading" class="text-stone-500 text-sm">加载中...</div>
    <p v-if="!isLoading && todos.length === 0" class="text-stone-400 text-sm">
      暂无待办事项
    </p>

    <div class="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
      <div v-for="todo in todos" :key="todo.id" class="flex items-center group">
        <input 
          type="checkbox"
          :id="'todo-' + todo.id"
          :checked="todo.isCompleted"
          @change="() => handleToggleTodo(todo)"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label 
          :for="'todo-' + todo.id" 
          :class="[
            'ml-3 text-sm text-stone-700 w-full', 
            todo.isCompleted ? 'line-through text-stone-400' : ''
          ]"
        >
          {{ todo.content }}
        </label>
        <button 
          @click="() => handleDeleteTodo(todo.id)" 
          class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
        >
          <XCircleIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <form @submit.prevent="handleNewTodo" class="mt-4 flex space-x-2">
      <input 
        type="text" 
        v-model="newTodoText"
        placeholder="添加新待办..."
        class="form-input text-sm"
      />
      <button 
        type="submit" 
        :disabled="!newTodoText"
        class="p-2 bg-indigo-600 text-white rounded-lg shadow disabled:bg-indigo-300"
      >
        <PlusIcon class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import { PlusIcon, XCircleIcon } from '@heroicons/vue/20/solid';

const todos = ref([]);
const isLoading = ref(true);
const newTodoText = ref('');

async function fetchTodos() {
  isLoading.value = true;
  try {
    const response = await apiClient.get('/todos');
    todos.value = response.data;
  } catch (error) {
    console.error("加载待办事项失败:", error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchTodos);

async function handleToggleTodo(todo) {
  try {
    const updatedTodo = await apiClient.put(`/todos/${todo.id}`, { 
      isCompleted: !todo.isCompleted 
    });
    // 更新本地数据
    const index = todos.value.findIndex(t => t.id === todo.id);
    if (index !== -1) {
      todos.value[index].isCompleted = updatedTodo.isCompleted;
    }
  } catch (error) {
    console.error("更新待办失败:", error);
  }
}

async function handleDeleteTodo(id) {
  if (!confirm('确定删除这个待办事项吗？')) return;
  try {
    await apiClient.delete(`/todos/${id}`);
    todos.value = todos.value.filter(t => t.id !== id);
  } catch (error) {
    console.error("删除待办失败:", error);
  }
}

async function handleNewTodo() {
  if (!newTodoText.value.trim()) return;
  try {
    const response = await apiClient.post('/todos', { 
      content: newTodoText.value 
    });
    todos.value.push(response.data);
    newTodoText.value = '';
  } catch (error) {
    console.error("添加待办失败:", error);
  }
}
</script>

<style scoped>
/* (复用样式) */
.form-input {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.dashboard-widget {
  @apply bg-white p-6 rounded-lg shadow-lg h-full flex flex-col;
}
.dashboard-widget-title {
  @apply font-bold text-stone-900 mb-2;
}
</style>