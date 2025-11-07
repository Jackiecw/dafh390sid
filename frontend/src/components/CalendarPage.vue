<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center space-x-4">
        <h2 class="text-3xl font-bold text-stone-900">工作日历</h2>
        
        <div class="flex items-center space-x-2">
          <button @click="onClickNav('prev')" class="p-2 rounded-lg hover:bg-stone-200 transition">
            <ChevronLeftIcon class="h-5 w-5 text-stone-600" />
          </button>
          <button @click="onClickNav('next')" class="p-2 rounded-lg hover:bg-stone-200 transition">
            <ChevronRightIcon class="h-5 w-5 text-stone-600" />
          </button>
          <button @click="onClickNav('today')" class="text-sm font-medium text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">
            今天
          </button>
        </div>
        <h3 class="text-xl font-semibold text-stone-700">
          {{ currentMonthDisplay }}
        </h3>
      </div>

      <button 
        @click="handleNewEventClick" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition w-full md:w-auto"
      >
        <PlusIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
        新建日程
      </button>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg" style="height: 75vh;">
      <Calendar
        ref="calendarRef"
        :view="'month'"
        :options="tuiOptions"
        :events="events"
        @selectDateTime="onSelectDateTime"
        @clickEvent="onClickEvent"
        @beforeUpdateEvent="onBeforeUpdateEvent"
      />
    </div>

    <p v-if="apiError" class="text-red-600">{{ apiError }}</p>
  </div>

  <EventModal
    :is-open="isModalOpen"
    :event-to-edit="selectedEvent"
    :selected-date-range="selectedDateRange"
    @close="closeModal"
    @save="handleEventSave"
    @delete="handleEventDelete"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';

import Calendar from 'toast-ui-calendar-vue3';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid';

import EventModal from './EventModal.vue';

// --- 状态定义 (不变) ---
const authStore = useAuthStore();
const apiError = ref(null);
const calendarRef = ref(null); 
const events = ref([]); 
const currentMonthDisplay = ref('');
const isModalOpen = ref(false);
const selectedEvent = ref(null); 
const selectedDateRange = ref(null); 

// --- 核心：Toast UI 配置 (不变) ---
const tuiOptions = {
  defaultView: 'month',
  useCreationPopup: false, 
  useDetailPopup: false,   
  isReadOnly: false,
  gridSelection: true,     
  month: {
    visibleWeeksCount: 6,
  },
  calendars: [
    { id: 'primary', name: '我的日程', backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#ffffff' },
    { id: 'admin', name: '管理员指派', backgroundColor: '#db2777', borderColor: '#db2777', color: '#ffffff' }
  ],
  template: {
    allday(event) { return `<span style="color: ${event.color};">[全天] ${event.title}</span>`; },
    time(event) { return `<span>${event.title}</span>`; }
  }
};

// --- 数据获取与转换 (不变) ---
const getCalendarInstance = () => {
  return calendarRef.value?.getInstance ? calendarRef.value.getInstance() : calendarRef.value;
};

function updateMonthDisplay() {
  const cal = getCalendarInstance();
  if (!cal) return;
  const date = cal.getDate();
  currentMonthDisplay.value = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

async function fetchEvents() {
  const cal = getCalendarInstance();
  if (!cal) return;
  apiError.value = null;
  
  const startDate = cal.getDateRangeStart().toDate();
  const endDate = cal.getDateRangeEnd().toDate();

  try {
    const response = await apiClient.get('/calendar/events', {
      params: { start: startDate.toISOString(), end: endDate.toISOString() }
    });

    events.value = response.data.map(event => ({
      id: event.id,
      title: event.title,
      start: event.startAt,
      end: event.endAt,
      isAllday: event.isAllDay,
      category: event.isAllDay ? 'allday' : 'time',
      calendarId: event.createdByAdmin ? 'admin' : 'primary',
      backgroundColor: event.createdByAdmin ? '#db2777' : '#4f46e5',
      borderColor: event.createdByAdmin ? '#db2777' : '#4f46e5',
      color: '#ffffff',
      raw: event
    }));
  } catch (error) {
    console.error("获取日历事件失败:", error);
    apiError.value = "无法加载日历事件，请刷新重试。";
  }
}

onMounted(() => {
  setTimeout(() => {
    updateMonthDisplay();
    fetchEvents();
  }, 100);
});

// --- 交互事件 (不变) ---

function onClickNav(type) {
  const cal = getCalendarInstance();
  if (!cal) return;
  if (type === 'prev') cal.prev();
  else if (type === 'next') cal.next();
  else if (type === 'today') cal.today();
  updateMonthDisplay();
  fetchEvents(); 
}

function onSelectDateTime(info) {
  selectedDateRange.value = { start: info.start.toDate(), end: info.end.toDate(), isAllday: info.isAllday };
  selectedEvent.value = null;
  isModalOpen.value = true;
}

function onClickEvent(info) {
  selectedEvent.value = info.event; 
  selectedDateRange.value = null;
  isModalOpen.value = true;
}

async function onBeforeUpdateEvent(info) {
  const { event, changes } = info;

  if (event.raw.createdByAdmin && authStore.role !== 'admin') {
    alert('权限不足：无法修改由管理员指派的日程。');
    fetchEvents();
    return;
  }

  const url = authStore.role === 'admin' 
    ? `/admin/calendar/events/${event.id}` 
    : `/calendar/events/${event.id}`;
    
  const payload = {
    title: changes.title || event.title,
    startAt: changes.start ? new Date(changes.start).toISOString() : new Date(event.start).toISOString(),
    endAt: changes.end ? new Date(changes.end).toISOString() : new Date(event.end).toISOString(),
    isAllDay: 'isAllday' in changes ? changes.isAllday : event.isAllday,
  };
  
  try {
    await apiClient.put(url, payload);
    fetchEvents();
  } catch (error) {
    console.error('拖拽更新失败:', error);
    apiError.value = `保存失败: ${error.response?.data?.error || '未知错误'}`;
    fetchEvents();
  }
}

// --- 模态框控制 (不变) ---
function handleNewEventClick() {
  const today = new Date();
  selectedDateRange.value = { start: today, end: today, isAllday: false };
  selectedEvent.value = null;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedEvent.value = null;
  selectedDateRange.value = null;
}

async function handleEventSave(payload) {
  apiError.value = '';
  try {
    const isAdmin = authStore.role === 'admin';
    
    if (payload.id) {
      const url = isAdmin ? `/admin/calendar/events/${payload.id}` : `/calendar/events/${payload.id}`;
      await apiClient.put(url, payload);
    } else {
      const url = isAdmin ? '/admin/calendar/events' : '/calendar/events';
      await apiClient.post(url, payload);
    }
    
    closeModal();
    fetchEvents(); 
    
  } catch (error) {
    console.error('保存日程失败:', error);
    apiError.value = `保存失败: ${error.response?.data?.error || '未知错误'}`;
  }
}

async function handleEventDelete(eventId) {
  apiError.value = '';
  try {
    const isAdmin = authStore.role === 'admin';
    const url = isAdmin ? `/admin/calendar/events/${eventId}` : `/calendar/events/${eventId}`;
    
    await apiClient.delete(url);
    
    closeModal();
    fetchEvents(); 

  } catch (error) {
    console.error('删除日程失败:', error);
    apiError.value = `删除失败: ${error.response?.data?.error || '未知错误'}`;
  }
}

</script>

<style>
/* (覆盖 TUI 默认样式) */
.toastui-calendar-layout {
  border-radius: 0.5rem; /* rounded-lg */
}
.toastui-calendar-weekday-event {
  border-radius: 4px;
}

/* ⬇️ --- 【新增】 修复 Tailwind CSS 冲突 --- ⬇️ */

/* 修复日期数字的行高和对齐方式 */
.toastui-calendar-weekday-grid-date {
  line-height: normal !important; /* 覆盖 Tailwind 的 line-height */
  text-align: center !important;  
  margin-right: 0 !important;     
  min-width: 28px;     
  height: 28px;        
  display: flex !important;       
  align-items: center !important; 
  justify-content: center !important; 
}

/* 修复 "今天" 的蓝色圆圈 */
.toastui-calendar-weekday-grid-date-decorator {
  line-height: normal !important; 
  font-weight: bold;   
  width: 28px;         
  height: 28px;        
}

/* 确保事件标题不会被 Tailwind 的行高影响 */
.toastui-calendar-event-title {
  line-height: 1.4 !important; /* 设置一个合理的行高 */
}
/* ⬆️ --- 【新增】 --- ⬆️ */
</style>