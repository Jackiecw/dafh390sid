<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 gap-4">
                <div class="input-group">
                  <label for="evt-title">标题 *</label>
                  <input type="text" id="evt-title" v-model="formData.title" :disabled="isReadOnly" class="form-input" />
                </div>

                <div class="input-group">
                  <label for="evt-start">开始时间 *</label>
                  <input type="datetime-local" id="evt-start" v-model="formData.startAt" :disabled="isReadOnly" class="form-input" />
                </div>

                <div class="input-group">
                  <label for="evt-end">结束时间 *</label>
                  <input type="datetime-local" id="evt-end" v-model="formData.endAt" :disabled="isReadOnly" class="form-input" />
                </div>
                
                <div class="flex items-center">
                  <input type="checkbox" id="evt-all-day" v-model="formData.isAllDay" :disabled="isReadOnly" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label for="evt-all-day" class="ml-2 text-sm text-gray-700">全天事件</label>
                </div>

                <div class="input-group">
                  <label for="evt-color">颜色</label>
                  <select id="evt-color" v-model="formData.color" :disabled="isReadOnly" class="form-input">
                    <option value="blue">蓝色 (个人)</option>
                    <option value="green">绿色 (团队)</option>
                    <option value="red">红色 (重要)</option>
                  </select>
                </div>

                <p v-if="isReadOnly" class="text-sm text-amber-700 bg-amber-100 p-3 rounded-md">
                  此事件由管理员指派，您无法修改或删除。
                </p>
                <p v-if="errorMessage" class="text-red-600 text-sm">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-between">
                <div>
                  <button v-if="isEditMode && !isReadOnly" type="button" @click="handleDelete" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    删除
                  </button>
                </div>
                <div class="flex space-x-4">
                  <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    取消
                  </button>
                  <button v-if="!isReadOnly" type="button" @click="handleSubmit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    保存
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  eventData: { type: Object, default: null }, // (编辑时传入)
  selectedDate: { type: Date, default: null }  // (新建时传入)
});
const emit = defineEmits(['close', 'event-saved', 'event-deleted']);

const formData = ref({});
const errorMessage = ref('');

// --- 计算属性 ---
const isEditMode = computed(() => !!props.eventData);
const isReadOnly = computed(() => props.eventData?.createdByAdmin === true); // (核心)
const dialogTitle = computed(() => {
  if (isReadOnly.value) return '查看事件';
  if (isEditMode.value) return '编辑事件';
  return '新建事件';
});

// --- 日期辅助函数 ---
// (将 JS Date 转换为 <input type="datetime-local"> 需要的格式)
function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // (调整为本地时间)
  return d.toISOString().slice(0, 16);
}

// --- 核心逻辑 ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMessage.value = '';
    if (isEditMode.value) {
      // (编辑模式：加载事件数据)
      formData.value = {
        title: props.eventData.title,
        startAt: formatDateForInput(new Date(props.eventData.startAt)),
        endAt: formatDateForInput(new Date(props.eventData.endAt)),
        isAllDay: props.eventData.isAllDay,
        color: props.eventData.color || 'blue',
      };
    } else {
      // (新建模式：使用选中的日期)
      const startDate = props.selectedDate || new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // (默认1小时)
      formData.value = {
        title: '',
        startAt: formatDateForInput(startDate),
        endAt: formatDateForInput(endDate),
        isAllDay: false,
        color: 'blue',
      };
    }
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  try {
    // (将本地时间转为 ISO UTC 字符串)
    const payload = {
      ...formData.value,
      startAt: new Date(formData.value.startAt).toISOString(),
      endAt: new Date(formData.value.endAt).toISOString(),
    };

    if (isEditMode.value) {
      // (更新)
      await apiClient.put(`/calendar/events/${props.eventData.id}`, payload);
    } else {
      // (新建)
      await apiClient.post('/calendar/events', payload);
    }
    emit('event-saved');
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '保存失败';
  }
}

async function handleDelete() {
  if (!confirm('确定要删除这个事件吗？')) return;
  try {
    await apiClient.delete(`/calendar/events/${props.eventData.id}`);
    emit('event-deleted');
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '删除失败';
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* (复用样式) */
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem;
}
.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.form-input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>