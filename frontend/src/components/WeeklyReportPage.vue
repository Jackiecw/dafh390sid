<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-8 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Weekly Rhythm</p>
          <h2 class="mt-2 text-3xl font-semibold">周报中心</h2>
          <p class="mt-2 text-sm text-white/80">回顾本周成果、记录问题并制定下一步计划。</p>
        </div>
        <div class="grid gap-4 text-sm sm:grid-cols-2">
          <div class="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
            <p class="text-white/70">本周周期</p>
            <p class="mt-1 text-xl font-semibold">{{ currentWeekRange }}</p>
          </div>
          <div class="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
            <p class="text-white/70">建议提交日</p>
            <p class="mt-1 text-xl font-semibold">{{ reminderDate }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-[#E5E7EB] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">Weekly Control</p>
          <h3 class="mt-1 text-2xl font-semibold text-[#1F2937]">周报概览</h3>
        </div>
        <p class="text-sm text-[#6B7280]">保持节奏，让团队同步每周重点。</p>
      </div>

      <div class="px-6 pt-4">
        <nav class="flex flex-wrap gap-3">
          <button
            v-if="canFillReports"
            @click="currentTab = 'entry'"
            :class="[
              'rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B82F6]',
              currentTab === 'entry'
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
            ]"
          >
            周报填写
          </button>
          <button
            v-if="canViewReports"
            @click="currentTab = 'management'"
            :class="[
              'rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3B82F6]',
              currentTab === 'management'
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30'
                : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
            ]"
          >
            周报查看
          </button>
        </nav>
      </div>

      <div class="rounded-b-3xl bg-[#F9FAFB] px-6 py-6">
        <div v-if="currentTab === 'entry'">
          <WeeklyReportForm />
        </div>
        <div
          v-else-if="currentTab === 'management'"
          class="-mx-6 rounded-b-3xl border-t border-stone-200 bg-white px-6 pb-6 pt-4"
        >
          <ViewReports />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import WeeklyReportForm from './WeeklyReportForm.vue';
import ViewReports from './ViewReports.vue';

const authStore = useAuthStore();

const canFillReports = computed(() => authStore.permissions.includes('WEEKLY_REPORT'));
const canViewReports = computed(() => authStore.permissions.includes('VIEW_REPORTS'));

const getDefaultTab = () => {
  if (canFillReports.value) {
    return 'entry';
  }
  if (canViewReports.value) {
    return 'management';
  }
  return 'entry';
};

const currentTab = ref(getDefaultTab());

const formatDisplayDate = (date) =>
  date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });

const getWeekBoundaries = (baseDate) => {
  const workingDate = new Date(baseDate);
  const day = workingDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  workingDate.setDate(workingDate.getDate() + diff);
  workingDate.setHours(0, 0, 0, 0);
  const end = new Date(workingDate);
  end.setDate(workingDate.getDate() + 6);
  return {
    start: workingDate,
    end,
  };
};

const activeWeek = computed(() => getWeekBoundaries(new Date()));

const currentWeekRange = computed(
  () => `${formatDisplayDate(activeWeek.value.start)} - ${formatDisplayDate(activeWeek.value.end)}`
);

const reminderDate = computed(() => {
  const friday = new Date(activeWeek.value.start);
  friday.setDate(activeWeek.value.start.getDate() + 4);
  return formatDisplayDate(friday);
});
</script>
