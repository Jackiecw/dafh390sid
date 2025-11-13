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
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ isEditMode ? '编辑日程' : '新建日程' }}
              </DialogTitle>

              <div class="mt-4 space-y-4">
                <div class="input-group">
                  <label for="title">标题 *</label>
                  <input type="text" id="title" v-model="formData.title" class="form-input" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="input-group">
                    <label for="startAt">开始时间 *</label>
                    <input :type="formData.isAllDay ? 'date' : 'datetime-local'" id="startAt" v-model="formStart" class="form-input" />
                  </div>
                  <div class="input-group">
                    <label for="endAt">结束时间 *</label>
                    <input :type="formData.isAllDay ? 'date' : 'datetime-local'" id="endAt" v-model="formEnd" class="form-input" />
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <input type="checkbox" id="isAllDay" v-model="formData.isAllDay" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label for="isAllDay" class="text-sm text-gray-900">全天</label>
                </div>

                <div class="input-group">
                  <label for="label">标签 / 颜色</label>
                  <select id="label" v-model="formData.color" class="form-input">
                    <option v-for="label in labels" :key="label.value" :value="label.color">
                      {{ label.name }}
                    </option>
                  </select>
                </div>

                <div v-if="authStore.role === 'admin'" class="input-group">
                  <label for="userId">指派给 *</label>
                  <p v-if="isLoadingUsers" class="text-xs text-stone-500">正在加载用户列表...</p>
                  <select v-else id="userId" v-model="formData.userId" class="form-input">
                    <option v-for="user in userList" :key="user.id" :value="user.id">
                      {{ user.nickname }}
                    </option>
                  </select>
                </div>

                <p v-if="errorMessage" class="text-red-600 text-sm">{{ errorMessage }}</p>
              </div>

              <div class="mt-6 flex justify-between">
                <button
                  v-if="isEditMode"
                  type="button"
                  @click="handleDelete"
                  :disabled="isDeleteDisabled"
                  class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  删除
                </button>

                <div class="flex space-x-4 ml-auto">
                  <button
                    type="button"
                    @click="closeModal"
                    class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    @click="handleSave"
                    class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    {{ isEditMode ? '保存更改' : '创建' }}
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
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  eventToEdit: { type: Object, default: null },
  selectedDateRange: { type: Object, default: null },
});

const emit = defineEmits(['close', 'save', 'delete']);

const authStore = useAuthStore();
const errorMessage = ref('');
const userList = ref([]);
const isLoadingUsers = ref(false);

const formData = ref({
  id: null,
  title: '',
  isAllDay: false,
  start: new Date(),
  end: new Date(),
  userId: authStore.user.userId,
  createdByAdmin: false,
  color: '#4f46e5',
});

const isEditMode = computed(() => !!formData.value.id);
const isDeleteDisabled = computed(() => authStore.role !== 'admin' && formData.value.createdByAdmin);

const labels = [
  { value: 'default', name: '默认（蓝）', color: '#4f46e5' },
  { value: 'important', name: '重要（玫红）', color: '#db2777' },
  { value: 'meeting', name: '会议（青绿）', color: '#059669' },
  { value: 'reminder', name: '提醒（琥珀）', color: '#d97706' },
];

watch(() => props.isOpen, async (newVal) => {
  if (!newVal) return;
  errorMessage.value = '';
  if (authStore.role === 'admin') {
    await fetchUsers();
  }

  if (props.eventToEdit) {
    const event = props.eventToEdit;
    formData.value = {
      id: event.id,
      title: event.title,
      isAllDay: event.isAllday,
      start: new Date(event.start),
      end: new Date(event.end),
      userId: event.raw.authorId,
      createdByAdmin: event.raw.createdByAdmin,
      color: event.raw.color || '#4f46e5',
    };
  } else if (props.selectedDateRange) {
    const range = props.selectedDateRange;
    formData.value = {
      id: null,
      title: '',
      isAllDay: range.isAllday,
      start: new Date(range.start),
      end: new Date(range.end),
      userId: authStore.user.userId,
      createdByAdmin: authStore.role === 'admin',
      color: '#4f46e5',
    };
  }
});

async function fetchUsers() {
  isLoadingUsers.value = true;
  try {
    const res = await apiClient.get('/admin/users');
    userList.value = res.data || [];
  } catch (error) {
    console.error('获取用户列表失败:', error);
    errorMessage.value = '无法加载用户列表';
  } finally {
    isLoadingUsers.value = false;
  }
}

function toLocalISOString(date) {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(date - tzOffset).toISOString().slice(0, 16);
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

const formStart = computed({
  get: () => formData.value.isAllDay ? toDateString(formData.value.start) : toLocalISOString(formData.value.start),
  set: (val) => { formData.value.start = new Date(val); }
});

const formEnd = computed({
  get: () => formData.value.isAllDay ? toDateString(formData.value.end) : toLocalISOString(formData.value.end),
  set: (val) => { formData.value.end = new Date(val); }
});

function closeModal() {
  emit('close');
}

function handleSave() {
  if (!formData.value.title) {
    errorMessage.value = '标题不能为空';
    return;
  }

  const payload = {
    id: formData.value.id,
    title: formData.value.title,
    startAt: formData.value.start.toISOString(),
    endAt: formData.value.end.toISOString(),
    isAllDay: formData.value.isAllDay,
    userId: formData.value.userId,
    color: formData.value.color || '#4f46e5',
  };

  emit('save', payload);
}

function handleDelete() {
  if (!confirm('确定要删除这个日程吗？')) return;
  emit('delete', formData.value.id);
}
</script>

<style scoped>
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

.input-group input,
.input-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>
