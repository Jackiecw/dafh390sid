<template>
  <div class="flex flex-col h-full space-y-6">

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

    <div class="bg-white p-6 rounded-lg shadow-lg flex-1 min-h-0">
      
      <Calendar
        ref="calendarRef"
        class="h-full" 
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
// 导入 onActivated
import { ref, computed, onMounted, onActivated } from 'vue'; 
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

// --- 关键生命周期修复 (不变) ---

onMounted(() => {
  // 延迟初始化，等待 DOM 渲染稳定
  setTimeout(() => {
    updateMonthDisplay();
    fetchEvents();
    // 强制 TUI 在首次加载时调整大小
    const cal = getCalendarInstance();
    if (cal) {
        cal.resize();
    }
  }, 100);
});

// 当组件被 <KeepAlive> 重新激活时
onActivated(() => {
  const cal = getCalendarInstance();
  if (cal) {
    setTimeout(() => {
        cal.render(); // 重新渲染日历
        cal.resize(); // 重新计算布局
    }, 50); // 50ms 延迟
  }
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
/* 样式已转移到 style.css 中 */
</style>