<template>
  <div class="space-y-6">
    <h2 class="text-3xl font-bold text-stone-900">员工配置与管理</h2>

    <div class="border-b border-stone-300">
      <nav class="flex space-x-4">
        <button 
          @click="currentTab = 'users'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'users' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          用户管理
        </button>
        <button 
          @click="currentTab = 'roles'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'roles' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          角色与权限
        </button>
      </nav>
    </div>

    <div>
      <div v-if="currentTab === 'users'">
        <div class="flex justify-end mb-4">
          <button @click="openModal" class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
            + 新建用户
          </button>
        </div>
        <p v-if="errorMessage" class="text-red-600 mb-4">{{ errorMessage }}</p>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-stone-200">
            <thead class="bg-stone-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">昵称</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">用户名 (登录账号)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">角色</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-stone-200">
              <tr v-for="user in users" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ user.nickname }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ user.username }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                  <span :class="['px-2 py-1 rounded-full text-xs font-semibold', user.role.name === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800']">
                    {{ user.role.description }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button @click="handleEdit(user)" class="text-indigo-600 hover:text-indigo-900">
                    编辑
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="currentTab === 'roles'">
        <div class="flex justify-end mb-4">
          <button 
            @click="openRoleModal" 
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            + 新建角色
          </button>
        </div>
        
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-stone-200">
            <thead class="bg-stone-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">角色描述</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">角色名 (Key)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-stone-200">
              <tr v-for="role in rolesList" :key="role.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{{ role.description }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{{ role.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    @click="handleEditRole(role)" 
                    :disabled="role.name === 'admin'"
                    :class="[
                      role.name === 'admin' 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-indigo-600 hover:text-indigo-900'
                    ]"
                  >
                    编辑权限
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <UserFormModal
    :is-open="isModalOpen"
    :roles="rolesList"
    :user-to-edit="currentUserToEdit"
    @close="closeModal"
    @user-created="handleUserCreated"
    @user-updated="handleUserUpdated"
  />

  <RoleFormModal
    :is-open="isRoleModalOpen"
    :role-to-edit-id="currentRoleToEditId"
    @close="closeRoleModal"
    @role-created="handleRoleCreated"
    @role-updated="handleRoleUpdated"
  />

</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import UserFormModal from './UserFormModal.vue';
import RoleFormModal from './RoleFormModal.vue'; // ⬅️ 【新增】导入“角色”弹窗

// --- (不变) ---
const currentTab = ref('users');
const users = ref([]);
const errorMessage = ref('');
const rolesList = ref([]);
const isModalOpen = ref(false); 
const currentUserToEdit = ref(null);

// --- 【新增】 "角色" 弹窗的状态 ---
const isRoleModalOpen = ref(false);
const currentRoleToEditId = ref(null);

// (不变)
onMounted(() => {
  fetchUsers();
  fetchRoles();
});
async function fetchUsers() { /* ... (代码不变) ... */ 
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/users');
    users.value = response.data;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    if (error.response && error.response.status === 403) {
      errorMessage.value = '您没有权限查看此内容。';
    } else {
      errorMessage.value = '获取用户列表失败，请稍后重试。';
    }
  }
}
async function fetchRoles() { /* ... (代码不变) ... */ 
  try {
    const response = await apiClient.get('/admin/roles');
    rolesList.value = response.data;
  } catch (error) {
    console.error('获取角色列表失败:', error);
    errorMessage.value = '无法加载角色列表，新建/编辑功能将不可用。';
  }
}

// --- (不变) "用户" 弹窗控制 ---
function openModal() { isModalOpen.value = true; }
function closeModal() {
  isModalOpen.value = false;
  currentUserToEdit.value = null; 
}
function handleEdit(user) {
  currentUserToEdit.value = {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    roleId: user.role.id,
  };
  openModal();
}
function handleUserUpdated(updatedUser) {
  const index = users.value.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    users.value[index] = updatedUser;
  }
}
function handleUserCreated(newUser) {
  users.value.push(newUser);
}


// --- 【新增】 "角色" 弹窗控制 ---

// "新建角色" 时调用
function openRoleModal() {
  isRoleModalOpen.value = true;
}

// "关闭角色" 弹窗时调用
function closeRoleModal() {
  isRoleModalOpen.value = false;
  // (关键) 重置"编辑"状态
  currentRoleToEditId.value = null;
}

// "编辑权限" 时调用
function handleEditRole(role) {
  // 1. 设置要编辑的 ID
  currentRoleToEditId.value = role.id;
  // 2. 打开弹窗 (弹窗会自动进入"编辑"模式)
  openRoleModal();
}

// "角色创建" 成功后调用
function handleRoleCreated(newRole) {
  // 1. (关键) 将新角色添加到 rolesList
  //    这会同时更新"角色"Tab的表格 和 "用户"Tab的下拉菜单
  rolesList.value.push(newRole);
}

// "角色更新" 成功后调用
function handleRoleUpdated(updatedRole) {
  // 1. (关键) 查找并替换 rolesList 中的角色
  const index = rolesList.value.findIndex(r => r.id === updatedRole.id);
  if (index !== -1) {
    rolesList.value[index] = updatedRole;
  }
}
</script>