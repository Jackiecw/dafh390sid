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
                  <label for="username">用户名 (登录账号) *</label>
                  <input 
                    type="text" 
                    id="username" 
                    v-model="formData.username" 
                    :disabled="isEditMode"
                    class="disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                
                <div v-if="!isEditMode" class="input-group">
                  <label for="password">初始密码 (至少8位) *</label>
                  <input type="password" id="password" v-model="formData.password" />
                </div>
                
                <div class="input-group">
                  <label for="nickname">昵称 *</label>
                  <input type="text" id="nickname" v-model="formData.nickname" />
                </div>
                
                <div class="input-group">
                  <label for="role">分配角色 *</label>
                  <select id="role" v-model="formData.roleId">
                    <option disabled value="">请选择一个角色...</option>
                    <option v-for="role in roles" :key="role.id" :value="role.id">
                      {{ role.description }} ({{ role.name }})
                    </option>
                  </select>
                </div>
                
                <div class="input-group md:col-span-2">
                  <label>主管国家 (可选)</label>
                  <div class="mt-2 space-y-2 max-h-32 overflow-y-auto rounded-md border p-4">
                    <div v-for="country in allCountries" :key="country.id" class="flex items-center">
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
                  <label>运营国家 (可选)</label>
                  <div class="mt-2 space-y-2 max-h-32 overflow-y-auto rounded-md border p-4">
                    <div v-for="country in allCountries" :key="country.id" class="flex items-center">
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
                        <span v-if="isOperatedCountryDisabled(country.id)" class="text-xs">(主管)</span>
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
                  取消
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
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

// --- 1. Props 和 Emits (不变) ---

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  roles: {
    type: Array,
    default: () => [],
  },
  userToEdit: {
    type: Object,
    default: null,
  }
});

const emit = defineEmits(['close', 'user-created', 'user-updated']);

// --- 2. 计算属性 (不变) ---
const isEditMode = computed(() => !!props.userToEdit);
const dialogTitle = computed(() => isEditMode.value ? '编辑用户' : '创建新用户');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建用户');

// --- 3. 内部状态 (修改) ---
const formData = ref({
  username: '',
  password: '',
  nickname: '',
  roleId: '',
});
const errorMessage = ref('');

// ⬇️ 【新增】
const allCountries = ref([]); // (用于存储 GET /api/admin/countries)
const selectedSupervisedIds = ref([]); // (v-model for 主管国家)
const selectedOperatedIds = ref([]);   // (v-model for 运营国家)

// --- 4. 核心逻辑 (修改) ---

// ⬇️ 【新增】 获取所有国家
async function fetchCountries() {
  try {
    const response = await apiClient.get('/api/admin/countries');
    allCountries.value = response.data;
  } catch (error) {
    console.error('获取国家列表失败:', error);
    errorMessage.value = '无法加载国家列表。';
  }
}

async function handleSubmit() {
  errorMessage.value = '';

  try {
    if (isEditMode.value) {
      // (A) 【编辑】模式
      
      // ⬇️ 【修改】 添加国家 IDs
      const payload = {
          nickname: formData.value.nickname,
          roleId: formData.value.roleId,
          supervisedCountryIds: selectedSupervisedIds.value,
          operatedCountryIds: selectedOperatedIds.value,
        };
      
      const response = await apiClient.put(
        `/admin/users/${props.userToEdit.id}`, 
        payload
      );
      emit('user-updated', response.data); 

    } else {
      // (B) 【创建】模式
      
      // ⬇️ 【修改】 添加国家 IDs
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
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 5. 辅助函数 (修改) ---

// ⬇️ 【修改】 watch: 当弹窗打开时
watch(() => props.isOpen, (newVal) => {
  if (newVal) { // 弹窗刚打开
    // (总) 获取国家列表
    fetchCountries();

    if (isEditMode.value) {
      // 【编辑】模式: 预填充表单
      formData.value = {
        username: props.userToEdit.username,
        nickname: props.userToEdit.nickname,
        roleId: props.userToEdit.roleId,
        password: '', // 密码字段是隐藏的
      };
      // ⬇️ 【新增】 预填充国家
      selectedSupervisedIds.value = props.userToEdit.supervisedCountryIds || [];
      selectedOperatedIds.value = props.userToEdit.operatedCountryIds || [];

    } else {
      // 【创建】模式: 重置为空表单
      resetForm();
    }
  }
});

// ⬇️ 【新增】 业务逻辑 A：主管自动成为运营
watch(selectedSupervisedIds, (newSupervisorIds) => {
  // (使用 Set 来合并，确保不重复)
  const newOperatedSet = new Set([
    ...selectedOperatedIds.value,
    ...newSupervisorIds
  ]);
  selectedOperatedIds.value = Array.from(newOperatedSet);
}, { deep: true }); // (deep: true 确保 v-model 数组变化时触发)

// ⬇️ 【新增】 辅助函数：检查运营国家是否应被禁用
function isOperatedCountryDisabled(countryId) {
  return selectedSupervisedIds.value.includes(countryId);
}


// (不变) 关闭弹窗
function closeModal() {
  resetForm(); 
  emit('close');
}

// (修改) 重置表单
function resetForm() {
  formData.value = {
    username: '',
    password: '',
    nickname: '',
    roleId: '',
  };
  errorMessage.value = '';
  // ⬇️ 【新增】
  allCountries.value = [];
  selectedSupervisedIds.value = [];
  selectedOperatedIds.value = [];
}

</script>

<style scoped>
/* (不变) 表单样式 */
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