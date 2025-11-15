<template>
  <section class="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm backdrop-blur">
    <header class="flex flex-col gap-4 border-b border-[#E5E7EB] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#3B82F6]">Weekly Entry</p>
        <h3 class="mt-1 text-2xl font-semibold text-[#1F2937]">填写周报</h3>
        <p class="mt-1 text-sm text-[#6B7280]">用统一的结构记录成果、计划以及阻碍。</p>
      </div>
      <div class="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-[#1D4ED8] shadow-inner">
        <p class="text-xs font-semibold uppercase tracking-wide text-[#60A5FA]">当前周</p>
        <p class="text-lg font-semibold text-[#1D4ED8]">第 {{ currentWeekIndex }} 周</p>
        <p class="text-xs text-[#3B82F6]">{{ formattedWeekStart }}</p>
      </div>
    </header>

    <form @submit.prevent="handleSubmit" class="space-y-8 px-6 py-6">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div class="space-y-2">
          <label for="weekStartDate" class="text-sm font-semibold text-[#1F2937]">周开始日期 *</label>
          <input
            type="date"
            id="weekStartDate"
            v-model="formData.weekStartDate"
            required
            class="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm transition placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
          />
          <p class="text-xs text-[#94A3B8]">系统会默认选取本周一，建议保持一致以便统计。</p>
        </div>
        <div class="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#1F2937]">
          <p class="font-semibold text-[#1F2937]">书写提示</p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-[#6B7280]">
            <li>总结突出成绩、关键数字和学习。</li>
            <li>计划拆分为 3-5 个可执行事项。</li>
            <li>遇到问题请写清阻碍与所需支持。</li>
          </ul>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <div class="space-y-2">
            <label for="summaryThisWeek" class="text-sm font-semibold text-[#1F2937]">本周总结 *</label>
            <textarea
              id="summaryThisWeek"
              rows="6"
              v-model="formData.summaryThisWeek"
              required
              class="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm transition placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
            ></textarea>
            <p class="text-xs text-[#94A3B8]">已输入 {{ summaryLength }} 字</p>
          </div>
          <div class="space-y-2">
            <label for="problemsEncountered" class="text-sm font-semibold text-[#1F2937]">遇到的问题</label>
            <textarea
              id="problemsEncountered"
              rows="4"
              v-model="formData.problemsEncountered"
              class="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm transition placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
            ></textarea>
          </div>
        </div>
        <div class="space-y-6">
          <div class="space-y-2">
            <label for="planNextWeek" class="text-sm font-semibold text-[#1F2937]">下周计划 *</label>
            <textarea
              id="planNextWeek"
              rows="6"
              v-model="formData.planNextWeek"
              required
              class="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm transition placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
            ></textarea>
            <p class="text-xs text-[#94A3B8]">已输入 {{ planLength }} 字</p>
          </div>
          <div class="space-y-2">
            <label for="other" class="text-sm font-semibold text-[#1F2937]">其他</label>
            <textarea
              id="other"
              rows="4"
              v-model="formData.other"
              class="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm transition placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 border-t border-[#E5E7EB] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-[#6B7280]">提交后可在“周报查看”中回顾与导出记录。</p>
        <button
          type="submit"
          class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#EFF6FF]0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B82F6]"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              d="M3 10.75l4.5 4.5L17 5.75"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          </svg>
          <span>提交周报</span>
        </button>
      </div>

      <div
        v-if="successMessage"
        class="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#10B981] shadow-inner"
      >
        {{ successMessage }}
      </div>
      <div
        v-if="errorMessage"
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-inner"
      >
        {{ errorMessage }}
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import apiClient from '../api';

const formatISODate = (date) => date.toISOString().split('T')[0];

const getCurrentWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday;
};

const buildInitialForm = () => ({
  weekStartDate: formatISODate(getCurrentWeekStart()),
  summaryThisWeek: '',
  planNextWeek: '',
  problemsEncountered: '',
  other: '',
});

const formData = ref(buildInitialForm());

const successMessage = ref('');
const errorMessage = ref('');

const formattedWeekStart = computed(() => {
  if (!formData.value.weekStartDate) return '--';
  return new Date(formData.value.weekStartDate).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
});

const currentWeekIndex = computed(() => {
  if (!formData.value.weekStartDate) return '--';
  const date = new Date(formData.value.weekStartDate);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date - firstDayOfYear) / 86400000);
  return Math.max(1, Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7));
});

const summaryLength = computed(() => formData.value.summaryThisWeek.trim().length);
const planLength = computed(() => formData.value.planNextWeek.trim().length);

const resetFeedback = () => {
  successMessage.value = '';
  errorMessage.value = '';
};

const resetForm = () => {
  formData.value = buildInitialForm();
};

const handleSubmit = async () => {
  resetFeedback();
  try {
    const response = await apiClient.post('/reports', formData.value);
    successMessage.value = `周报提交成功 (ID: ${response.data.id})`;
    resetForm();
  } catch (error) {
    console.error('提交失败:', error);
    if (error.response?.data?.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '提交失败，请检查网络或联系管理员。';
    }
  }
};
</script>
