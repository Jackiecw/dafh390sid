<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                日程
              </DialogTitle>

              <div class="mt-4">
                <TabGroup>
                  <TabList class="flex space-x-1 rounded-xl bg-indigo-100 p-1">
                    <Tab v-for="category in ['本周重点', '今日', '明日']"
                         :key="category"
                         v-slot="{ selected }"
                         as="template"
                    >
                      <button :class="[
                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                        'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-indigo-200 ring-white',
                        selected
                          ? 'bg-white text-indigo-700 shadow'
                          : 'text-indigo-500 hover:bg-white/[0.12] hover:text-indigo-600',
                      ]">
                        {{ category }}
                      </button>
                    </Tab>
                  </TabList>

                  <TabPanels class="mt-4">
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[220px]">
                      <div class="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 class="font-bold text-stone-900 mb-1">团队聚焦</h4>
                          <p class="text-xs text-stone-500 mb-2">由管理员统一发布</p>
                          <div class="p-3 bg-white rounded border border-stone-200 text-sm text-stone-700 whitespace-pre-wrap min-h-[120px]">
                            {{ teamFocusDisplay }}
                          </div>
                        </div>
                        <div>
                          <h4 class="font-bold text-stone-900 mb-1">我的行动计划</h4>
                          <p class="text-xs text-stone-500 mb-2">上周周报中的“下周计划”</p>
                          <div class="p-3 bg-white rounded border border-stone-200 text-sm text-stone-700 whitespace-pre-wrap min-h-[120px]">
                            {{ personalPlanDisplay }}
                          </div>
                        </div>
                      </div>
                    </TabPanel>
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[220px]">
                      <div v-if="isLoadingDaily" class="text-stone-400 text-center py-6">正在整理今日日程…</div>
                      <div v-else-if="dailyError" class="text-red-500 text-center text-sm py-6">{{ dailyError }}</div>
                      <div v-else>
                        <p class="text-xs uppercase tracking-wide text-stone-500">{{ dailySummaries.today.dateLabel }}</p>
                        <p class="text-sm text-stone-600 mb-4">{{ dailySummaries.today.summary }}</p>
                        <ul v-if="dailySummaries.today.items.length" class="space-y-3">
                          <li v-for="item in dailySummaries.today.items" :key="item.id" class="flex gap-3 text-sm">
                            <span class="text-indigo-600 font-semibold min-w-[80px]">{{ item.timeLabel }}</span>
                            <div>
                              <p class="text-stone-800 font-medium">{{ item.title }}</p>
                              <p class="text-xs text-stone-500">{{ item.meta }}</p>
                            </div>
                          </li>
                        </ul>
                        <p v-else class="text-stone-400 text-sm">今日暂无日程安排</p>
                        <p v-if="dailySummaries.today.moreCount" class="text-xs text-stone-400 mt-2">
                          还有 {{ dailySummaries.today.moreCount }} 条日程
                        </p>
                      </div>
                    </TabPanel>
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[220px]">
                      <div v-if="isLoadingDaily" class="text-stone-400 text-center py-6">正在整理明日日程…</div>
                      <div v-else-if="dailyError" class="text-red-500 text-center text-sm py-6">{{ dailyError }}</div>
                      <div v-else>
                        <p class="text-xs uppercase tracking-wide text-stone-500">{{ dailySummaries.tomorrow.dateLabel }}</p>
                        <p class="text-sm text-stone-600 mb-4">{{ dailySummaries.tomorrow.summary }}</p>
                        <ul v-if="dailySummaries.tomorrow.items.length" class="space-y-3">
                          <li v-for="item in dailySummaries.tomorrow.items" :key="item.id" class="flex gap-3 text-sm">
                            <span class="text-indigo-600 font-semibold min-w-[80px]">{{ item.timeLabel }}</span>
                            <div>
                              <p class="text-stone-800 font-medium">{{ item.title }}</p>
                              <p class="text-xs text-stone-500">{{ item.meta }}</p>
                            </div>
                          </li>
                        </ul>
                        <p v-else class="text-stone-400 text-sm">明日暂无日程安排</p>
                        <p v-if="dailySummaries.tomorrow.moreCount" class="text-xs text-stone-400 mt-2">
                          还有 {{ dailySummaries.tomorrow.moreCount }} 条日程
                        </p>
                      </div>
                    </TabPanel>
                  </TabPanels>
                </TabGroup>
              </div>

              <div class="mt-6 flex justify-end">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                >
                  关闭
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  planNextWeek: {
    type: String,
    default: '',
  },
  teamFocus: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close']);

const personalPlanDisplay = computed(() => {
  return props.planNextWeek?.trim() ? props.planNextWeek : '暂无计划内容，请在周报中填写“下周计划”。';
});
const teamFocusDisplay = computed(() => {
  return props.teamFocus?.trim() ? props.teamFocus : '管理员尚未发布本周聚焦内容。';
});

const isLoadingDaily = ref(false);
const dailyError = ref('');
const dailySummaries = ref({
  today: createEmptyDailySummary(0),
  tomorrow: createEmptyDailySummary(1),
});

watch(() => props.isOpen, (open) => {
  if (open) {
    loadDailySummaries();
  }
});

function createEmptyDailySummary(offset) {
  const base = addDays(startOfDay(new Date()), offset);
  return {
    dateLabel: formatDayLabel(base),
    summary: '暂无日程安排',
    items: [],
    moreCount: 0,
  };
}

async function loadDailySummaries() {
  try {
    isLoadingDaily.value = true;
    dailyError.value = '';
    const todayStart = startOfDay(new Date());
    const dayAfterTomorrow = addDays(todayStart, 2);
    const response = await apiClient.get('/calendar/events', {
      params: {
        start: todayStart.toISOString(),
        end: dayAfterTomorrow.toISOString(),
      },
    });
    const events = Array.isArray(response.data) ? response.data : [];
    dailySummaries.value.today = summarizeDay(events, todayStart, addDays(todayStart, 1));
    dailySummaries.value.tomorrow = summarizeDay(events, addDays(todayStart, 1), dayAfterTomorrow);
  } catch (error) {
    console.error('获取日程摘要失败:', error);
    dailyError.value = error.response?.data?.error || error.message || '无法加载日程摘要';
    dailySummaries.value.today = createEmptyDailySummary(0);
    dailySummaries.value.tomorrow = createEmptyDailySummary(1);
  } finally {
    isLoadingDaily.value = false;
  }
}

function summarizeDay(events, dayStart, dayEnd) {
  const dayEvents = events
    .filter((event) => {
      const start = new Date(event.startAt);
      const end = new Date(event.endAt || event.startAt);
      return start < dayEnd && end > dayStart;
    })
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  const items = dayEvents.slice(0, 5).map((event) => {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt || event.startAt);
    const timeLabel = event.isAllDay
      ? '全天'
      : `${formatTime(start)} - ${formatTime(end)}`;
    return {
      id: event.id,
      title: event.title,
      timeLabel,
      meta: event.createdByAdmin ? '管理员指派' : '个人日程',
    };
  });

  return {
    dateLabel: formatDayLabel(dayStart),
    summary: dayEvents.length ? `共有 ${dayEvents.length} 个日程` : '暂无日程安排',
    items,
    moreCount: Math.max(dayEvents.length - items.length, 0),
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatTime(date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDayLabel(date) {
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'long' });
}

function closeModal() {
  emit('close');
}
</script>
