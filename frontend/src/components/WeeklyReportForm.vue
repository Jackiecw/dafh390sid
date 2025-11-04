<template>
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
    <h2 class="text-2xl font-bold text-stone-900 mb-6">填写周报</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="space-y-6">
        
        <div class="space-y-2">
          <label for="weekStartDate" class="block text-sm font-medium text-stone-700">周开始日期 *</label>
          <input type="date" id="weekStartDate" v-model="formData.weekStartDate" required 
                 class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>

        <div class="space-y-2">
          <label for="summaryThisWeek" class="block text-sm font-medium text-stone-700">本周总结 *</label>
          <textarea id="summaryThisWeek" rows="5" v-model="formData.summaryThisWeek" required
                    class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
        </div>

        <div class="space-y-2">
          <label for="planNextWeek" class="block text-sm font-medium text-stone-700">下周计划 *</label>
          <textarea id="planNextWeek" rows="5" v-model="formData.planNextWeek" required
                    class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
        </div>

        <div class="space-y-2">
          <label for="problemsEncountered" class="block text-sm font-medium text-stone-700">遇到的问题</label>
          <textarea id="problemsEncountered" rows="3" v-model="formData.problemsEncountered"
                    class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
        </div>

        <div class="space-y-2">
          <label for="other" class="block text-sm font-medium text-stone-700">其他</label>
          <textarea id="other" rows="3" v-model="formData.other"
                    class="block w-full rounded-md border-stone-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
        </div>
      </div>

      <button type="submit" 
              class="mt-8 inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        提 交 周 报
      </button>

      <p v-if="successMessage" class="text-green-600 mt-4">{{ successMessage }}</p>
      <p v-if="errorMessage" class="text-red-600 mt-4">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
// ( <script setup> 部分保持不变 )
import { ref } from 'vue';
import apiClient from '../api';

const formData = ref({
  weekStartDate: new Date().toISOString().split('T')[0],
  summaryThisWeek: '',
  planNextWeek: '',
  problemsEncountered: '',
  other: '',
});
const successMessage = ref('');
const errorMessage = ref('');

const handleSubmit = async () => {
  successMessage.value = '';
  errorMessage.value = '';
  try {
    const response = await apiClient.post('/reports', formData.value);
    successMessage.value = '周报提交成功！(ID: ' + response.data.id + ')';
  } catch (error) {
    console.error('提交失败:', error.response);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '提交失败，请检查网络或联系管理员';
    }
  }
};
</script>