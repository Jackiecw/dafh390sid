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
                指派新日程
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 gap-4">
                <div class="input-group">
                  <label for="adm-title">标题 *</label>
                  <input type="text" id="adm-title" v-model="formData.title" class="form-input" />
                </div>

                <div class="input-group">
                  <label for="adm-start">开始时间 *</label>
                  <input type="datetime-local" id="adm-start" v-model="formData.startAt" class="form-input" />
                </div>

                <div class="input-group">
                  <label for="adm-end">结束时间 *</label>
                  <input type="datetime-local" id="adm-end" v-model="formData.endAt" class="form-input" />
                </div>
                
                <div class="flex items-center">
                  <input type="checkbox" id="adm-all-day" v-model="formData.isAllDay" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label for="adm-all-day" class="ml-2 text-sm text-gray-700">全天事件</label>
                </div>

                <div class="input-group">
                  <label for="adm-color">颜色 *</label>
                  <select id="adm-color" v-model="formData.color" class="form-input">
                    <option value="red">红色 (重要)</option>
                    <option value="green">绿色 (团队)</option>
                    <option value="blue">蓝色 (提醒)</option>
                  </select>
                </div>

                <div class="border-t pt-4 space-y-4">
                  <h4 class="font-semibold">指派给 *</h4>
                  <div class="input-group">
                    <label>类型</label>
                    <select v-model="targetType" class="form-input">
                      <option value="USER">指定员工</option>
                      <option value="COUNTRY">指定国家 (所有运营)</option>
                      <option value="GLOBAL">所有人</option>
                    </select>
                  </div>
                  
                  <div v-if="targetType === 'USER'" class="input-group">
                    <label>选择员工</label>
                    <select v-model="targetId" class="form-input" :disabled="isLoading.users">
                      <option disabled value="">{{ isLoading.users ? '加载中...' : '请选择...' }}</option>
                      <option v-for="user in users" :key="user.id" :value="user.id">
                        {{ user.nickname }} ({{ user.username }})
                      </option>
                    </select>
                  </div>

                  <div v-if="targetType === 'COUNTRY'" class="input-group">
                    <label>选择国家</label>
                    <select v-model="targetId" class="form-input" :disabled="isLoading.countries">
                      <option disabled value="">{{ isLoading.countries ? '加载中...' : '请选择...' }}</option>
                      <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.name }} ({{ country.code }})
                      </option>
                    </select>
                  </div>
                </div>

                <p v-if="errorMessage" class="text-red-600 text-sm">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  取消
                </button>
                <button type="button" @click="handleSubmit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  确认指派
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
import { ref, watch, onMounted } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'event-assigned']);

// --- 状态 ---
const defaultFormData = () => ({
  title: '',
  startAt: new Date().toISOString().slice(0, 16),
  endAt: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
  isAllDay: false,
  color: 'red',
});
const formData = ref(defaultFormData());

const targetType = ref('USER'); // 'USER', 'COUNTRY', 'GLOBAL'
const targetId = ref('');

const users = ref([]);
const countries = ref([]);
const isLoading = ref({ users: false, countries: false });
const errorMessage = ref('');

// --- 数据加载 (仅在首次打开时) ---
onMounted(() => {
  fetchUsers();
  fetchCountries();
});

async function fetchUsers() {
  isLoading.value.users = true;
  try {
    const response = await apiClient.get('/admin/users');
    users.value = response.data;
  } catch (error) { console.error(error); } 
  finally { isLoading.value.users = false; }
}
async function fetchCountries() {
  isLoading.value.countries = true;
  try {
    // (复用 /api/admin/countries 接口)
    const response = await apiClient.get('/admin/countries'); 
    countries.value = response.data;
  } catch (error) { console.error(error); }
  finally { isLoading.value.countries = false; }
}

// --- 核心逻辑 ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    formData.value = defaultFormData();
    targetType.value = 'USER';
    targetId.value = '';
    errorMessage.value = '';
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  if (targetType.value !== 'GLOBAL' && !targetId.value) {
    errorMessage.value = '请选择一个指派目标';
    return;
  }
  
  try {
    const payload = {
      ...formData.value,
      startAt: new Date(formData.value.startAt).toISOString(),
      endAt: new Date(formData.value.endAt).toISOString(),
      target: {
        type: targetType.value,
        id: targetType.value === 'GLOBAL' ? undefined : targetId.value,
      }
    };
    
    await apiClient.post('/admin/calendar/events', payload);
    emit('event-assigned');
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '指派失败';
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* (复用样式) */
.input-group { display: flex; flex-direction: column; }
.input-group label { margin-bottom: 0.5rem; color: #333; font-weight: bold; font-size: 0.875rem; }
.form-input { padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
.form-input:disabled { background-color: #f3f4f6; cursor: not-allowed; }
</style>