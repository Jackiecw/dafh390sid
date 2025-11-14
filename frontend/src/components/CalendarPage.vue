<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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
            今日
          </button>
        </div>
        <h3 class="text-xl font-semibold text-stone-700">{{ currentMonthDisplay }}</h3>
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto">
      <div class="inline-flex rounded-md shadow-sm" role="group">
          <button :class="['px-3 py-1.5 text-sm border', currentView === 'month' ? 'bg-indigo-600 text-white' : 'bg-white']" @click="setView('month')">月</button>
          <button :class="['px-3 py-1.5 text-sm border -ml-px', currentView === 'week' ? 'bg-indigo-600 text-white' : 'bg-white']" @click="setView('week')">周</button>
          <button :class="['px-3 py-1.5 text-sm border -ml-px', currentView === 'day' ? 'bg-indigo-600 text-white' : 'bg-white']" @click="setView('day')">日</button>
        </div>

        <div v-if="isAdmin" class="flex items-center gap-2">
          <select v-model="adminFilterMode" class="border rounded px-2 py-1 text-sm">
            <option value="ME">仅自己</option>
            <option value="ALL_ASSIGNED">全部指派</option>
            <option value="USER">指定成员</option>
          </select>
          <select v-if="adminFilterMode === 'USER'" v-model="selectedUserId" class="border rounded px-2 py-1 text-sm min-w-40">
            <option value="" disabled>选择成员</option>
            <option v-for="u in userList" :key="u.id" :value="u.id">{{ u.nickname }}</option>
          </select>
        </div>

        <button @click="handleNewEventClick" class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition w-full md:w-auto">
          <PlusIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
          新建日程
        </button>
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h4 class="text-base font-semibold text-stone-700">本周聚焦</h4>
          <p class="text-xs text-stone-500">左侧为管理员同步的团队重点，右侧为你在上周周报中填写的“下周计划”</p>
        </div>
        <div class="flex items-center gap-2">
          <p v-if="!isAdmin" class="text-xs text-stone-400">由管理员统一管理</p>
          <button
            v-if="isAdmin"
            class="text-sm px-3 py-1 rounded border border-stone-300 hover:bg-stone-50 disabled:opacity-60"
            :disabled="isSavingFocus"
            @click="saveWeeklyFocus"
          >
            {{ isSavingFocus ? '保存中...' : '同步所有人' }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-medium text-stone-600 flex items-center justify-between mb-2">
            <span>团队重点</span>
            <span v-if="!weeklyFocusEntry" class="text-xs text-stone-400">尚未发布</span>
          </label>
          <textarea
            v-model="teamFocusContent"
            rows="4"
            class="w-full border rounded p-2 text-sm"
            :readonly="!isAdmin"
            :class="{'bg-stone-50 text-stone-500 cursor-not-allowed': !isAdmin}"
            placeholder="记录本周团队最重要的聚焦事项..."
          ></textarea>
          <p class="text-xs text-red-500 mt-1" v-if="weeklyFocusError">{{ weeklyFocusError }}</p>
        </div>

        <div>
          <label class="text-sm font-medium text-stone-600 mb-2 block">我的周报计划</label>
          <div class="w-full border rounded p-3 text-sm text-stone-700 min-h-[120px] bg-stone-50 whitespace-pre-wrap">
            {{ userPlanPreview || '暂无内容，请在上周周报中填写“下周计划”。' }}
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg flex-1 min-h-0 calendar-shell">
      <FullCalendar
        ref="calendarRef"
        class="h-full"
        :options="calendarOptions"
      />
    </div>

    <div class="mt-4">
      <p v-if="isLoadingEvents" class="text-stone-500 text-sm">正在拉取日程...</p>
      <p v-if="apiError" class="text-red-600 text-sm">{{ apiError }}</p>
    </div>
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
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import EventModal from './EventModal.vue';

const viewNameMap = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
};

const authStore = useAuthStore();
const apiError = ref('');
const isLoadingEvents = ref(false);
const calendarRef = ref(null);
const events = ref([]);
const currentMonthDisplay = ref('');
const isModalOpen = ref(false);
const selectedEvent = ref(null);
const selectedDateRange = ref(null);
const weeklyFocusEntry = ref(null);
const teamFocusContent = ref('');
const userPlanPreview = ref('');
const weeklyFocusError = ref('');
const isSavingFocus = ref(false);

const currentView = ref('month');
const isAdmin = authStore.role === 'admin';
const adminFilterMode = ref('ME');
const selectedUserId = ref('');
const userList = ref([]);
const visibleRange = ref({ start: null, end: null });

watch(adminFilterMode, (mode) => {
  if (mode !== 'USER') {
    selectedUserId.value = '';
  }
});

watch([adminFilterMode, selectedUserId], ([mode, userId]) => {
  if (!isAdmin) return;
  if (mode === 'USER' && !userId) return;
  fetchEvents();
});

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  locales: [zhCnLocale],
  locale: 'zh-cn',
  initialView: viewNameMap.month,
  headerToolbar: false,
  selectable: true,
  selectMirror: true,
  editable: true,
  eventDurationEditable: true,
  eventStartEditable: true,
  height: '100%',
  expandRows: true,
  slotMinTime: '06:00:00',
  slotMaxTime: '24:00:00',
  scrollTime: '07:00:00',
  dayMaxEventRows: true,
  nowIndicator: true,
  selectOverlap: true,
  events: events.value,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  select: onSelectDateTime,
  eventClick: onClickEvent,
  eventDrop: onEventMutate,
  eventResize: onEventMutate,
  datesSet: onDatesSet,
}));

const resizeHandler = ref(null);

onMounted(() => {
  fetchWeeklyFocus();
  if (isAdmin) fetchUsers();
  nextTick(() => {
    const cal = getCalendarApi();
    cal?.updateSize();
  });
  resizeHandler.value = () => {
    const cal = getCalendarApi();
    cal?.updateSize();
  };
  window.addEventListener('resize', resizeHandler.value);
});

onActivated(() => {
  const cal = getCalendarApi();
  if (cal) {
    cal.render();
    cal.updateSize();
  }
});

onBeforeUnmount(() => {
  if (resizeHandler.value) {
    window.removeEventListener('resize', resizeHandler.value);
  }
});

function getCalendarApi() {
  return calendarRef.value?.getApi?.();
}

function onDatesSet(arg) {
  visibleRange.value = {
    start: new Date(arg.start),
    end: new Date(arg.end),
  };
  updateMonthDisplay(arg.start);
  fetchEvents();
}

function updateMonthDisplay(baseDate) {
  const target = baseDate ?? getCalendarApi()?.getDate();
  if (!(target instanceof Date)) return;
  // 修复：将 ¿? 替换为 "年"
  currentMonthDisplay.value = `${target.getFullYear()} 年 ${target.getMonth() + 1} 月`;
}

async function fetchEvents() {
  if (!visibleRange.value?.start || !visibleRange.value?.end) {
    isLoadingEvents.value = false;
    return;
  }
  apiError.value = '';
  isLoadingEvents.value = true;
  try {
    let url = '/calendar/events';
    const params = {
      start: visibleRange.value.start.toISOString(),
      end: visibleRange.value.end.toISOString(),
    };
    if (isAdmin && (adminFilterMode.value === 'ALL_ASSIGNED' || adminFilterMode.value === 'USER')) {
      url = '/admin/calendar/events';
      if (adminFilterMode.value === 'USER' && selectedUserId.value) {
        params.userId = selectedUserId.value;
      }
    }
    const response = await apiClient.get(url, { params });
    events.value = (response.data || []).map(mapServerEvent);
  } catch (error) {
    console.error('获取日程失败:', error);
    const serverMsg = error?.response?.data?.error || error?.message || '未知错误';
    const status = error?.response?.status ? ` (HTTP ${error.response.status})` : '';
    // 修复：将 ¿? 替换为中文冒号 ：
    apiError.value = `无法加载日程：${serverMsg}${status}`;
  } finally {
    isLoadingEvents.value = false;
  }
}

function mapServerEvent(event) {
  const startAt = event.startAt ? new Date(event.startAt) : new Date();
  const endAt = event.endAt ? new Date(event.endAt) : startAt;
  const isAllDay = Boolean(event.isAllDay);
  const color = event.color || (event.createdByAdmin ? '#db2777' : '#4f46e5');
  return {
    id: String(event.id),
    title: event.title,
    start: startAt,
    end: isAllDay ? addDays(endAt, 1) : endAt,
    allDay: isAllDay,
    backgroundColor: color,
    borderColor: color,
    textColor: '#ffffff',
    extendedProps: {
      raw: { ...event, color },
    },
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function onClickNav(type) {
  const cal = getCalendarApi();
  if (!cal) return;
  if (type === 'prev') cal.prev();
  else if (type === 'next') cal.next();
  else cal.today();
}

function setView(view) {
  if (currentView.value === view) return;
  currentView.value = view;
  nextTick(() => {
    const cal = getCalendarApi();
    cal?.changeView(viewNameMap[view]);
  });
}

function onSelectDateTime(info) {
  info.view?.calendar?.unselect();
  const rawEnd = info.end || info.start;
  const end = info.allDay ? addDays(rawEnd, -1) : rawEnd;
  selectedDateRange.value = { start: info.start, end, isAllday: info.allDay };
  selectedEvent.value = null;
  isModalOpen.value = true;
}

function onClickEvent(info) {
  selectedEvent.value = normalizeSelectedEvent(info.event);
  selectedDateRange.value = null;
  isModalOpen.value = true;
}

function normalizeSelectedEvent(eventApi) {
  const raw = eventApi.extendedProps?.raw || {};
  const fallbackEnd = eventApi.allDay ? addDays(eventApi.end ?? eventApi.start, -1) : (eventApi.end || eventApi.start);
  return {
    id: eventApi.id,
    title: raw.title ?? eventApi.title,
    start: raw.startAt ? new Date(raw.startAt) : eventApi.start,
    end: raw.endAt ? new Date(raw.endAt) : fallbackEnd,
    isAllday: typeof raw.isAllDay === 'boolean' ? raw.isAllDay : eventApi.allDay,
    raw,
  };
}

async function onEventMutate(info) {
  const eventApi = info.event;
  const raw = eventApi.extendedProps?.raw || {};
  if (raw.createdByAdmin && authStore.role !== 'admin') {
    info.revert();
    // 修复：将 日¿? 替换为 "日程"
    alert('权限不足：无法修改管理员指派的日程');
    fetchEvents();
    return;
  }
  const url = authStore.role === 'admin' ? `/admin/calendar/events/${eventApi.id}` : `/calendar/events/${eventApi.id}`;
  const payload = {
    title: eventApi.title,
    startAt: eventApi.start?.toISOString(),
    endAt: getMutationEnd(eventApi),
    isAllDay: eventApi.allDay,
  };
  try {
    await apiClient.put(url, payload);
    fetchEvents();
  } catch (error) {
    console.error('拖拽更新失败:', error);
    apiError.value = `更新失败: ${error.response?.data?.error || error.message || '未知错误'}`;
    info.revert();
    fetchEvents();
  }
}

function getMutationEnd(eventApi) {
  if (!eventApi.end) {
    return eventApi.start?.toISOString();
  }
  if (!eventApi.allDay) {
    return eventApi.end.toISOString();
  }
  const inclusive = addDays(eventApi.end, -1);
  inclusive.setHours(0, 0, 0, 0);
  return inclusive.toISOString();
}

function handleNewEventClick() {
  const today = getCalendarApi()?.getDate() ?? new Date();
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
    const isAdminRole = authStore.role === 'admin';
    if (payload.id) {
      const url = isAdminRole ? `/admin/calendar/events/${payload.id}` : `/calendar/events/${payload.id}`;
      await apiClient.put(url, payload);
    } else {
      const url = isAdminRole ? '/admin/calendar/events' : '/calendar/events';
      await apiClient.post(url, payload);
    }
    closeModal();
    fetchEvents();
  } catch (error) {
    console.error('保存日程失败:', error);
    apiError.value = `保存失败: ${error.response?.data?.error || error.message || '未知错误'}`;
  }
}

async function handleEventDelete(eventId) {
  apiError.value = '';
  try {
    const isAdminRole = authStore.role === 'admin';
    const url = isAdminRole ? `/admin/calendar/events/${eventId}` : `/calendar/events/${eventId}`;
    await apiClient.delete(url);
    closeModal();
    fetchEvents();
  } catch (error) {
    console.error('删除日程失败:', error);
    apiError.value = `删除失败: ${error.response?.data?.error || error.message || '未知错误'}`;
  }
}

async function fetchUsers() {
  try {
    const res = await apiClient.get('/admin/users');
    userList.value = res.data || [];
  } catch (error) {
    console.error('获取用户列表失败:', error);
  }
}

function getWeekStartString(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function fetchWeeklyFocus() {
  try {
    weeklyFocusError.value = '';
    const weekStartDate = getWeekStartString();
    const res = await apiClient.get('/calendar/weekly-focus', { params: { weekStartDate } });
    weeklyFocusEntry.value = res.data.focus;
    teamFocusContent.value = res.data.focus?.content || '';
    userPlanPreview.value = res.data.userPlan || '';
  } catch (error) {
    console.error('获取每周聚焦失败:', error);
    weeklyFocusEntry.value = null;
    teamFocusContent.value = '';
    weeklyFocusError.value = error.response?.data?.error || '无法获取本周聚焦';
  }
}

async function saveWeeklyFocus() {
  if (!isAdmin) return;
  try {
    weeklyFocusError.value = '';
    if (!weeklyFocusEntry.value?.id) {
      // 修复：将 重¿? 替换为 "重试"
      weeklyFocusError.value = '尚未生成本周聚焦，请刷新后重试';
      return;
    }
    isSavingFocus.value = true;
    const res = await apiClient.put(`/calendar/weekly-focus/${weeklyFocusEntry.value.id}`, { content: teamFocusContent.value });
    weeklyFocusEntry.value = res.data;
    teamFocusContent.value = res.data.content || '';
  } catch (error) {
    console.error('更新每周聚焦失败:', error);
    weeklyFocusError.value = error.response?.data?.error || '更新失败';
  } finally {
    isSavingFocus.value = false;
  }
}

</script>

<style>
/* 日历细节样式集中在全局 style.css 中 */
</style>
