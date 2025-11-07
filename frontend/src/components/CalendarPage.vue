<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">工作日历</h2>
      <button 
        @click="handleNewEventClick" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        <PlusIcon class="h-5 w-5 inline-block -mt-1 mr-1" />
        新建日程
      </button>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg">
      <FullCalendar :options="calendarOptions" />
    </div>

    <p v-if="apiError" class="text-red-600">{{ apiError }}</p>
  </div>

  </template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';

// 1. 导入 FullCalendar
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
// (我们将在下一阶段导入 timeGridPlugin)

// ⬇️ (为按钮导入图标)
import { PlusIcon } from '@heroicons/vue/20/solid';

// (为模态框导入, 但在下一阶段才使用)
// import EventModal from './EventModal.vue';

// --- 状态定义 ---
const authStore = useAuthStore();
const apiError = ref(null);
const calendarRef = ref(null); // (用于访问 FullCalendar 实例)

// (模态框状态 - 下一阶段使用)
const isModalOpen = ref(false);
const selectedEvent = ref(null);
const selectedDate = ref(null);

// --- 核心：FullCalendar 配置 ---
const calendarOptions = ref({
  plugins: [ dayGridPlugin, interactionPlugin ],
  initialView: 'dayGridMonth',
  locale: 'zh-cn', // (使用中文)
  buttonText: {
    today: '今天',
    month: '月',
  },
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth' // (未来我们将添加 timeGridDay)
  },
  
  editable: true,       // (允许拖拽修改)
  selectable: true,       // (允许点击选择)
  
  // --- 1. (关键) 异步获取事件 ---
  // (此函数会在日历加载/翻页时自动调用)
  events: async (fetchInfo, successCallback, failureCallback) => {
    apiError.value = null;
    try {
      // (调用我们为“用户”创建的 API)
      const response = await apiClient.get('/calendar/events', {
        params: {
          start: fetchInfo.startStr,
          end: fetchInfo.endStr,
          // (未来 Admin 在此切换 userId)
          // userId: selectedUserId.value
        }
      });

      // (将我们的数据格式转换为 FullCalendar 的格式)
      const events = response.data.map(event => ({
        id: event.id,
        title: event.title,
        start: event.startAt,
        end: event.endAt,
        allDay: event.isAllDay,
        color: event.color,
        // (存储原始数据，用于判断权限)
        extendedProps: {
          author: event.author, // { nickname: '...' }
          createdByAdmin: event.createdByAdmin
        }
      }));
      
      successCallback(events);

    } catch (error) {
      console.error("获取日历事件失败:", error);
      apiError.value = "无法加载日历事件，请刷新重试。";
      failureCallback(error);
    }
  },

  // --- 2. (关键) 交互事件 ---

  // (点击空白日期 - 用于新建)
  dateClick: (clickInfo) => {
    // (在下一阶段，我们将打开模态框)
    // selectedDate.value = clickInfo.dateStr;
    // selectedEvent.value = null;
    // isModalOpen.value = true;
    
    // (本阶段的临时提示)
    alert(`[临时] 你点击了日期: ${clickInfo.dateStr}。下一步将打开新建模态框。`);
  },

  // (点击已有事件 - 用于编辑/查看)
  eventClick: (clickInfo) => {
    // (在下一阶段，我们将打开模态框)
    // selectedEvent.value = clickInfo.event;
    // isModalOpen.value = true;
    
    // (本阶段的临时提示)
    const createdBy = clickInfo.event.extendedProps.createdByAdmin 
      ? `(由管理员指派给 ${clickInfo.event.extendedProps.author.nickname})`
      : "(由您自己创建)";
      
    alert(`[临时] 你点击了事件: "${clickInfo.event.title}" ${createdBy}`);
  },

  // (拖拽/拉伸事件)
  eventChange: async (changeInfo) => {
    const event = changeInfo.event;
    
    // (权限检查：用户只能修改自己创建的)
    if (event.extendedProps.createdByAdmin && authStore.role !== 'admin') {
      alert('权限不足：无法修改由管理员指派的日程。');
      changeInfo.revert(); // (撤销拖拽)
      return;
    }

    // (准备 API)
    const url = authStore.role === 'admin' 
      ? `/api/admin/calendar/events/${event.id}` 
      : `/api/calendar/events/${event.id}`;
      
    const payload = {
      title: event.title,
      startAt: event.start.toISOString(),
      endAt: event.end ? event.end.toISOString() : event.start.toISOString(), // (处理全天事件)
      isAllDay: event.allDay
    };

    try {
      await apiClient.put(url, payload);
    } catch (error) {
      console.error('拖拽更新失败:', error);
      apiError.value = `保存失败: ${error.response?.data?.error || '未知错误'}`;
      changeInfo.revert(); // (出错时撤销)
    }
  }
});

// --- 模态框控制 (下一阶段实现) ---
function handleNewEventClick() {
  // selectedDate.value = new Date().toISOString().split('T')[0]; // 默认今天
  // selectedEvent.value = null;
  // isModalOpen.value = true;
  
  // (本阶段的临时提示)
  alert('[临时] “新建日程”按钮被点击。下一步将打开模态框。');
}

function closeModal() {
  isModalOpen.value = false;
  selectedEvent.value = null;
  selectedDate.value = null;
}

function handleEventSaved() {
  closeModal();
  // (刷新日历)
  calendarRef.value?.getApi().refetchEvents();
}

</script>

<style>
/* FullCalendar 样式调整 (覆盖)
  我们希望日历的按钮看起来像 Tailwind 按钮 
*/
.fc .fc-button {
  background-color: #4f46e5; /* bg-indigo-600 */
  border-color: #4f46e5;
  color: white;
  padding: 0.5rem 1rem;
  text-transform: none; /* (移除大写) */
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem; /* rounded-md */
  transition: background-color 0.2s;
}
.fc .fc-button:hover {
  background-color: #4338ca; /* bg-indigo-700 */
}
.fc .fc-button:focus {
  box-shadow: none;
}
.fc .fc-button-primary:disabled {
  background-color: #a5b4fc;
  border-color: #a5b4fc;
}
</style>