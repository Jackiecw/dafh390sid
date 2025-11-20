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
            <DialogPanel class="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                <div class="input-group">
                  <label for="username">鐢ㄦ埛鍚?(鐧诲綍璐﹀彿) *</label>
                  <input 
                    type="text" 
                    id="username" 
                    v-model="formData.username" 
                    :disabled="isEditMode"
                    class="disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                
                <div v-if="!isEditMode" class="input-group">
                  <label for="password">鍒濆瀵嗙爜 (鑷冲皯8浣? *</label>
                  <input type="password" id="password" v-model="formData.password" />
                </div>
                
                <div class="input-group">
                  <label for="nickname">鏄电О *</label>
                  <input type="text" id="nickname" v-model="formData.nickname" />
                </div>
                
                <div class="input-group">
                  <label for="role">鍒嗛厤瑙掕壊 *</label>
                  <select id="role" v-model="formData.roleId">
                    <option disabled value="">璇烽€夋嫨涓€涓鑹?..</option>
                    <option v-for="role in roles" :key="role.id" :value="role.id">
                      {{ role.description }} ({{ role.name }})
                    </option>
                  </select>
                </div>
                
                <div class="input-group md:col-span-2">
                  <label>涓荤鍥藉 (鍙€?</label>
                  <div class="mt-2 space-y-2 max-h-32 overflow-y-auto rounded-md border p-4">
                    <div v-for="country in countryOptions" :key="country.id" class="flex items-center">
                      <input 
                        type="checkbox" 
                        :id="'sup-' + country.id" 
                        :value="country.id" 
                        v-model="selectedSupervisedIds"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label :for="'sup-' + country.id" class="ml-3 text-sm text-gray-700">
                        {{ country.name }} ({{ country.code }})
                      </label>
                    </div>
                  </div>
                </div>

                <div class="input-group md:col-span-2">
                  <label>杩愯惀鍥藉 (鍙€?</label>
                  <div class="mt-2 space-y-2 max-h-32 overflow-y-auto rounded-md border p-4">
                    <div v-for="country in countryOptions" :key="country.id" class="flex items-center">
                      <input 
                        type="checkbox" 
                        :id="'op-' + country.id" 
                        :value="country.id" 
                        v-model="selectedOperatedIds"
                        :disabled="isOperatedCountryDisabled(country.id)"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                      <label :for="'op-' + country.id" 
                             :class="[
                               'ml-3 text-sm',
                               isOperatedCountryDisabled(country.id) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                             ]">
                        {{ country.name }} ({{ country.code }})
                        <span v-if="isOperatedCountryDisabled(country.id)" class="text-xs">(涓荤)</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                
                <p v-if="errorMessage" class="text-red-600 text-sm md:col-span-2">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  鍙栨秷
                </button>
                <button
                  type="button"
                  @click="handleSubmit"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                >
                  {{ submitButtonText }}
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
import { ref, watch, computed } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import apiClient from '../api';
import useManagedCountries from '../composables/useManagedCountries';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  roles: { type: Array, default: () => [] },
  userToEdit: { type: Object, default: null },
});

const emit = defineEmits(['close', 'user-created', 'user-updated']);

const isEditMode = computed(() => !!props.userToEdit);
const dialogTitle = computed(() => (isEditMode.value ? '编辑用户' : '创建新用户'));
const submitButtonText = computed(() => (isEditMode.value ? '保存更改' : '创建用户'));

const formData = ref({
  username: '',
  password: '',
  nickname: '',
  roleId: '',
});
const errorMessage = ref('');
const selectedSupervisedIds = ref([]);
const selectedOperatedIds = ref([]);

const {
  countries,
  fetchCountries,
  countriesError,
} = useManagedCountries();

const countryOptions = computed(() =>
  countries.value.slice().sort((a, b) => a.name.localeCompare(b.name)),
);

async function handleSubmit() {
  errorMessage.value = '';

  try {
    if (isEditMode.value) {
      const payload = {
        nickname: formData.value.nickname,
        roleId: formData.value.roleId,
        supervisedCountryIds: selectedSupervisedIds.value,
        operatedCountryIds: selectedOperatedIds.value,
      };
      const response = await apiClient.put(`/admin/users/${props.userToEdit.id}`, payload);
      emit('user-updated', response.data);
    } else {
      const payload = {
        ...formData.value,
        supervisedCountryIds: selectedSupervisedIds.value,
        operatedCountryIds: selectedOperatedIds.value,
      };
      const response = await apiClient.post('/admin/users', payload);
      emit('user-created', response.data);
    }
    closeModal();
  } catch (error) {
    console.error('操作失败:', error);
    errorMessage.value = error.response?.data?.error || '操作失败，请检查网络或联系管理员。';
  }
}

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    try {
      await fetchCountries();
    } catch (error) {
      console.error('获取国家列表失败:', error);
      errorMessage.value = countriesError.value || '无法加载国家列表。';
      return;
    }

    if (isEditMode.value) {
      formData.value = {
        username: props.userToEdit.username,
        nickname: props.userToEdit.nickname,
        roleId: props.userToEdit.roleId,
        password: '',
      };
      selectedSupervisedIds.value = props.userToEdit.supervisedCountryIds || [];
      selectedOperatedIds.value = props.userToEdit.operatedCountryIds || [];
    } else {
      resetForm();
    }
  }
});

watch(selectedSupervisedIds, (newSupervisorIds) => {
  const newOperatedSet = new Set([
    ...selectedOperatedIds.value,
    ...newSupervisorIds,
  ]);
  selectedOperatedIds.value = Array.from(newOperatedSet);
}, { deep: true });

function isOperatedCountryDisabled(countryId) {
  return selectedSupervisedIds.value.includes(countryId);
}

function closeModal() {
  resetForm();
  emit('close');
}

function resetForm() {
  formData.value = {
    username: '',
    password: '',
    nickname: '',
    roleId: '',
  };
  errorMessage.value = '';
  selectedSupervisedIds.value = [];
  selectedOperatedIds.value = [];
}
</script>

<style scoped>
/* (涓嶅彉) 琛ㄥ崟鏍峰紡 */
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.input-group input,
.input-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.input-group input:disabled {
  background-color: #f3f4f6; /* bg-gray-100 */
  color: #6b7280; /* text-gray-500 */
  cursor: not-allowed;
}
</style>
