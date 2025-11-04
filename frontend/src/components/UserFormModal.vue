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
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 space-y-4">
                
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
                
                <p v-if="errorMessage" class="text-red-600 text-sm">
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
// 【新增】导入 computed
import { ref, watch, computed } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

// --- 1. 【修改】Props 和 Emits ---

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  roles: {
    type: Array,
    default: () => [],
  },
  // ⬇️ 【新增】
  //    如果这个 prop 被传入，我们将进入"编辑"模式
  //    它将包含 { id, username, nickname, roleId }
  userToEdit: {
    type: Object,
    default: null,
  }
});

// ⬇️ 【新增】添加 "user-updated" 信号
const emit = defineEmits(['close', 'user-created', 'user-updated']);

// --- 2. 【新增】计算属性 (Computed) ---
const isEditMode = computed(() => !!props.userToEdit);
const dialogTitle = computed(() => isEditMode.value ? '编辑用户' : '创建新用户');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建用户');

// --- 3. 内部状态 (不变) ---
const formData = ref({
  username: '',
  password: '',
  nickname: '',
  roleId: '',
});
const errorMessage = ref('');

// --- 4. 【修改】核心逻辑 (handleSubmit) ---

async function handleSubmit() {
  errorMessage.value = '';

  try {
    if (isEditMode.value) {
      // (A) 【编辑】模式：调用 PUT
      const response = await apiClient.put(
        // URL: /api/admin/users/用户ID
        `/admin/users/${props.userToEdit.id}`, 
        // Payload: { nickname, roleId } (根据后端的 userUpdateSchema)
        {
          nickname: formData.value.nickname,
          roleId: formData.value.roleId,
        }
      );
      // 发送 "user-updated" 信号，并附上更新后的用户信息
      emit('user-updated', response.data); 

    } else {
      // (B) 【创建】模式：调用 POST (不变)
      const response = await apiClient.post('/admin/users', formData.value);
      emit('user-created', response.data);
    }
    closeModal();

  } catch (error) {
    // (不变) 错误处理
    console.error('操作失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 5. 【修改】辅助函数 ---

// 【修改】watch: 当弹窗打开时，根据模式填充表单
watch(() => props.isOpen, (newVal) => {
  if (newVal) { // 弹窗刚打开
    if (isEditMode.value) {
      // 【编辑】模式: 预填充表单
      formData.value = {
        username: props.userToEdit.username,
        nickname: props.userToEdit.nickname,
        roleId: props.userToEdit.roleId,
        password: '', // 密码字段是隐藏的
      };
    } else {
      // 【创建】模式: 重置为空表单
      resetForm();
    }
  }
});

// (不变) 关闭弹窗
function closeModal() {
  resetForm(); // 无论如何，关闭时都清空表单
  emit('close');
}

// (不变) 重置表单
function resetForm() {
  formData.value = {
    username: '',
    password: '',
    nickname: '',
    roleId: '',
  };
  errorMessage.value = '';
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
/* 【新增】禁用输入框的样式 */
.input-group input:disabled {
  background-color: #f3f4f6; /* bg-gray-100 */
  color: #6b7280; /* text-gray-500 */
  cursor: not-allowed;
}
</style>