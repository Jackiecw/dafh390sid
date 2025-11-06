<template>
  <div class="space-y-6 flex flex-col h-full">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">工作日历</h2>
      <button 
        v-if="isAdmin"
        @click="openAdminModal"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        + 指派日程
      </button>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-xl font-bold text-stone-900">
          每周重点 ({{ formatWeek(currentWeek) }})
        </h3>
        <button 
          v-if="isAdmin"
          @click="openFocusModal"
          class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          编辑
        </button>
      </div>
      <p v-if="isLoading.focus" class="text-stone-500 text-sm">加载中...</p>
      <p v-else-if="weeklyFocus" class="text-stone-700 whitespace-pre-wrap">
        {{ weeklyFocus.content }}
      </p>
      <p v-else class="text-stone-400 text-sm">
        本周暂无重点内容。
      </p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-lg flex-1 flex flex-col">
      <p v-if="isLoading.events" class="text-stone-500 text-sm p-4">
        正在加载日历事件...
      </p>
      <VCalendar
        v-else
        class="custom-calendar flex-1" 
        :attributes="calendarAttributes"
        :masks="{ title: 'YYYY年 MMMM' }"
        is-expanded
        @did-move="handleMonthChange"
        @dayclick="handleDayClick"
        layout="vertical"
      >
        <template #day-content="{ day, attributes }">
          <div class="flex flex-col h-full z-10 overflow-hidden">
            <span class="day-label text-sm">{{ day.day }}</span>
            <div class="flex-grow overflow-y-auto overflow-x-hidden">
              <button
                v-for="attr in attributes"
                :key="attr.key"
                class="event-button"
                :class="getEventColorClass(attr.customData.color)"
                @click.stop="handleEventClick(attr.customData)"
              >
                {{ attr.customData.title }}
              </button>
            </div>
          </div>
        </template>
      </VCalendar>
    </div>
  </div>
  
  <CalendarEventModal
    :is-open="isEventModalOpen"
    :event-data="selectedEvent"
    :selected-date="selectedDate"
    @close="closeEventModal"
    @event-saved="handleSave"
    @event-deleted="handleSave"
  />

  <AdminEventModal
    :is-open="isAdminModalOpen"
    @close="isAdminModalOpen = false"
    @event-assigned="handleSave"
  />

  <WeeklyFocusModal
    :is-open="isFocusModalOpen"
    :focus-data="weeklyFocus"
    :week-date="currentWeek"
    @close="isFocusModalOpen = false"
    @focus-saved="handleSave"
  />

</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Calendar as VCalendar } from 'v-calendar';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

import CalendarEventModal from './CalendarEventModal.vue';
import AdminEventModal from './AdminEventModal.vue';
import WeeklyFocusModal from './WeeklyFocusModal.vue';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

const isLoading = ref({ events: true, focus: true });
const weeklyFocus = ref(null); 
const events = ref([]); 

const currentWeek = ref(getMonday(new Date())); 
const currentMonthRange = ref(getMonthRange(new Date())); 

const isEventModalOpen = ref(false);
const isAdminModalOpen = ref(false);
const isFocusModalOpen = ref(false);

const selectedEvent = ref(null); 
const selectedDate = ref(null); 

function getMonday(d) {
  d = new Date(d);
  d.setHours(0, 0, 0, 0); 
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
}

function getMonthRange(d) {
  const year = d.getFullYear();
  const month = d.getMonth();
  const startDate = new Date(year, month - 1, 15);
  const endDate = new Date(year, month + 1, 15);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

function formatDate(dateString) {
  return new Date(dateString).toISOString().split('T')[0];
}

function formatWeek(date) {
  const start = formatDate(date);
  const end = formatDate(new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000));
  return `${start} ~ ${end}`;
}

function getEventColorClass(color) {
  const colorMap = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };
  return colorMap[color] || 'bg-gray-500';
}

async function fetchWeeklyFocus(weekDate) {
  isLoading.value.focus = true;
  try {
    const response = await apiClient.get('/calendar/weekly-focus', {
      params: { week: formatDate(weekDate) }
    });
    weeklyFocus.value = response.data;
  } catch (error) {
    console.error("加载每周重点失败:", error);
  } finally {
    isLoading.value.focus = false;
  }
}

async function fetchEvents(range) {
  isLoading.value.events = true;
  try {
    const response = await apiClient.get('/calendar/events', {
      params: {
        start: range.start,
        end: range.end,
      }
    });
    events.value = response.data;
  } catch (error) {
    console.error("加载日历事件失败:", error);
  } finally {
    isLoading.value.events = false;
  }
}

const calendarAttributes = computed(() => {
  return events.value.map(event => ({
    key: event.id,
    highlight: {
      color: event.color,
      fillMode: 'light',
    },
    dates: {
      start: new Date(event.startAt),
      end: new Date(event.endAt)
    },
    customData: event, 
  }));
});

onMounted(() => {
  fetchWeeklyFocus(currentWeek.value);
  fetchEvents(currentMonthRange.value);
});

function handleMonthChange(pages) {
  const newDate = pages[0].viewDays[15].date; 
  currentMonthRange.value = getMonthRange(newDate);
  currentWeek.value = getMonday(newDate); 

  fetchEvents(currentMonthRange.value);
  fetchWeeklyFocus(currentWeek.value);
}

function handleDayClick(day) {
  selectedEvent.value = null;
  selectedDate.value = day.date;
  isEventModalOpen.value = true; 
}

function handleEventClick(eventData) {
  selectedEvent.value = eventData;
  selectedDate.value = null;
  isEventModalOpen.value = true; 
}

function openAdminModal() {
  isAdminModalOpen.value = true; 
}

function openFocusModal() {
  isFocusModalOpen.value = true; 
}

function closeEventModal() {
  isEventModalOpen.value = false;
  selectedEvent.value = null;
  selectedDate.value = null;
}

function handleSave() {
  fetchEvents(currentMonthRange.value);
  fetchWeeklyFocus(currentWeek.value);
  isEventModalOpen.value = false;
  isAdminModalOpen.value = false;
  isFocusModalOpen.value = false;
}
</script>

<style lang="postcss">
@import "../style.css" reference;

/* ⬇️ 【修改】 确保 v-calendar 容器和周视图撑满高度 */
.custom-calendar.vc-container {
  @apply border-0 h-full w-full flex flex-col;
}
.custom-calendar .vc-weeks {
  @apply flex-1 grid grid-rows-6 w-full;
}
/* ⬆️ 【修改】 */

.custom-calendar .vc-header {
  @apply mb-4;
}
.custom-calendar .vc-title {
  @apply text-lg font-bold text-stone-900;
}
.custom-calendar .vc-weekday {
  @apply text-stone-500 font-semibold;
}

/* ⬇️ 【修改】 让日期格子撑满所在的网格行 */
.custom-calendar .vc-day {
  @apply h-full;
}
.custom-calendar .vc-day-content {
  @apply flex flex-col h-full overflow-hidden;
}
/* ⬆️ 【修改】 */

.custom-calendar .day-label {
  @apply text-sm text-stone-800;
}
.custom-calendar .event-button {
  @apply w-full text-left text-xs font-medium text-white p-1 rounded-sm mb-0.5 truncate;
}
</style>