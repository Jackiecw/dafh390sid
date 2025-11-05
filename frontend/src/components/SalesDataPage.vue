<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">销售数据</h2>

    <div class="border-b border-stone-300">
      <nav class="flex space-x-4">
        <button 
          @click="currentTab = 'management'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'management' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          数据管理
        </button>
        <button 
          @click="currentTab = 'entry'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'entry' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          数据录入
        </button>
      </nav>
    </div>

    <div>
      <div v-if="currentTab === 'management'">
        <SalesDataManagement />
      </div>
      <div v-if="currentTab === 'entry'">
        <SalesForm />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SalesForm from './SalesForm.vue';
import SalesDataManagement from './SalesDataManagement.vue';

// 默认显示“数据管理”
const currentTab = ref('management'); 
</script>