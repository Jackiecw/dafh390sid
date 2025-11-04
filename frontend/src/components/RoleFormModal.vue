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
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 space-y-4">
                <div class="input-group">
                  <label for="roleName">角色名 (Key) *</label>
                  <input 
                    type="text" 
                    id="roleName" 
                    v-model="formData.name" 
                    placeholder="例如: admin, operation, finance"
                  />
                </div>
                <div class="input-group">
                  <label for="roleDesc">角色描述 *</label>
                  <input 
                    type="text" 
                    id="roleDesc" 
                    v-model="formData.description" 
                    placeholder="例如: 超级管理员, 运营专员"
                  />
                </div>

                <div v-if="isEditMode" class="input-group">
                  <label>菜单权限</label>
                  <div class="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-md border p-4">
                    <div v-for="item in allMenuItems" :key="item.id" class="flex items-center">
                      <input 
                        type="checkbox" 
                        :id="'menu-' + item.id" 
                        :value="item.id" 
                        v-model="selectedMenuIds"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label :for="'menu-' + item.id" class="ml-3 text-sm text-gray-700">
                        {{ item.name }} ({{ item.key }})
                      </label>
                    </div>
                  </div>
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
import { ref, watch, computed } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

// --- 1. Props 和 Emits ---

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  // ⬇️ 【修改】我们只接收 ID
  //    弹窗将自己负责获取角色的详细数据
  roleToEditId: {
    type: String,
    default: null,
  }
});

// ⬇️ 【新增】
const emit = defineEmits(['close', 'role-created', 'role-updated']);

// --- 2. 内部状态 ---

const formData = ref({
  name: '',
  description: '',
});
const allMenuItems = ref([]); // 存储 GET /api/admin/menu-items
const selectedMenuIds = ref([]); // v-model (被勾选的)
const errorMessage = ref('');

// --- 3. 计算属性 (Computed) ---

const isEditMode = computed(() => !!props.roleToEditId);
const dialogTitle = computed(() => isEditMode.value ? '编辑角色与权限' : '创建新角色');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建角色');

// --- 4. 核心逻辑 (API 调用) ---

// (新增) 获取系统所有可用的菜单项
async function fetchMenuItems() {
  try {
    const response = await apiClient.get('/admin/menu-items');
    allMenuItems.value = response.data;
  } catch (error) {
    console.error('获取菜单项失败:', error);
    errorMessage.value = '无法加载菜单权限列表。';
  }
}

// (新增) 获取【单个】角色的详细信息 (用于编辑)
async function fetchRoleDetails() {
  if (!isEditMode.value) return;
  try {
    const response = await apiClient.get(`/admin/roles/${props.roleToEditId}`);
    const role = response.data;
    
    // 1. 填充表单
    formData.value.name = role.name;
    formData.value.description = role.description;
    
    // 2. (核心) 预先勾选该角色已有的权限
    selectedMenuIds.value = role.menus.map(menu => menu.id);
    
  } catch (error) {
    console.error('获取角色详情失败:', error);
    errorMessage.value = '无法加载角色详情。';
    //closeModal();
  }
}

// (修改) 提交表单
async function handleSubmit() {
  errorMessage.value = '';

  // (核心) 准备要发送的数据
  const payload = {
    name: formData.value.name,
    description: formData.value.description,
    menuIds: selectedMenuIds.value, // ⬅️ 包含所有被勾选的菜单 ID
  };

  try {
    if (isEditMode.value) {
      // (A) 【编辑】模式：调用 PUT
      const response = await apiClient.put(`/admin/roles/${props.roleToEditId}`, payload);
      emit('role-updated', response.data);

    } else {
      // (B) 【创建】模式：调用 POST
      // (注意: "创建"时，权限复选框是隐藏的，所以 menuIds 总是 [])
      // (这没问题，后端 z.array().default([]) 会处理它)
      const response = await apiClient.post('/admin/roles', payload);
      emit('role-created', response.data);
    }
    closeModal();

  } catch (error) {
    console.error('角色操作失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 5. 辅助函数 ---

// (修改) watch: 当弹窗打开时，根据模式填充表单
watch(() => props.isOpen, (newVal) => {
  if (newVal) { // 弹窗刚打开
    // (重置) 总是先清空
    resetForm();
    
    if (isEditMode.value) {
      // 【编辑】模式: 
      // (注意顺序：先获取所有菜单，再获取角色详情)
      // 这样才能正确显示复选框
      fetchMenuItems();
      fetchRoleDetails();
    } else {
      // 【创建】模式: (什么都不用做，表单已重置)
    }
  }
});

// (不变)
function closeModal() {
  resetForm();
  emit('close');
}

// (修改) 重置表单 (现在也重置菜单)
function resetForm() {
  formData.value = {
    name: '',
    description: '',
  };
  allMenuItems.value = [];
  selectedMenuIds.value = [];
  errorMessage.value = '';
}

</script>

<style scoped>
/* (复用 UserFormModal.vue 的样式) */
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
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>