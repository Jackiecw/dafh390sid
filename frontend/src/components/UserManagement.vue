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
        <button 
          @click="currentTab = 'countries'"
          :class="[
            'py-2 px-4 text-sm font-medium',
            currentTab === 'countries' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-stone-500 hover:text-stone-700'
          ]"
        >
          国家管理
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
                <th class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">运营国家</th>
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                  <span v-if="user.operatedCountries.length > 0">
                    {{ user.operatedCountries.map(c => c.code).join(', ') }}
                  </span>
                  <span v-else class="text-gray-400">无</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button @click="handleEdit(user)" class="text-indigo-600 hover:text-indigo-900 mr-4">
                    编辑
                  </button>
                  <button 
                    @click="handleResetPassword(user)" 
                    :disabled="user.username === 'admin'"
                    class="text-amber-600 hover:text-amber-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    重置密码
                  </button>
                  <button
                    v-if="isSuperAdmin"
                    @click="handleDeleteUser(user)"
                    :disabled="user.username === 'admin' || user.id === currentUserId"
                    class="ml-4 text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    删除
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

      <div v-if="currentTab === 'countries'">
        <CountryManagement />
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
import { computed, ref, onMounted } from 'vue';
import apiClient from '../api';
import UserFormModal from './UserFormModal.vue';
import RoleFormModal from './RoleFormModal.vue'; 
import CountryManagement from './CountryManagement.vue';
import { useAuthStore } from '../stores/auth';

// (不变)
const currentTab = ref('users'); 
const users = ref([]);
const errorMessage = ref('');
const rolesList = ref([]);
const isModalOpen = ref(false); 
const currentUserToEdit = ref(null);
const isRoleModalOpen = ref(false);
const currentRoleToEditId = ref(null);
const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.role === 'admin');
const currentUserId = computed(() => authStore.user?.userId);

// (不变)
onMounted(() => {
  fetchUsers();
  fetchRoles();
});

// (不变) fetchUsers
async function fetchUsers() { 
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
// (不变) fetchRoles
async function fetchRoles() { 
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
    supervisedCountryIds: user.supervisedCountries.map(c => c.id),
    operatedCountryIds: user.operatedCountries.map(c => c.id),
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

async function handleDeleteUser(user) {
  if (!isSuperAdmin.value) return;
  if (user.username === 'admin') {
    alert('无法删除内置超级管理员账号');
    return;
  }
  if (user.id === currentUserId.value) {
    alert('无法删除当前登录账号');
    return;
  }
  if (!confirm(`确定要删除用户「${user.nickname}」(${user.username}) 吗？该操作不可恢复。`)) {
    return;
  }
  try {
    await apiClient.delete(`/admin/users/${user.id}`);
    users.value = users.value.filter((u) => u.id !== user.id);
  } catch (error) {
    console.error('删除用户失败:', error);
    alert(error.response?.data?.error || '删除用户失败，请稍后再试');
  }
}


// --- (不变) "角色" 弹窗控制 ---
function openRoleModal() { isRoleModalOpen.value = true; }
function closeRoleModal() { 
  isRoleModalOpen.value = false; 
  currentRoleToEditId.value = null;
}
function handleEditRole(role) { 
  currentRoleToEditId.value = role.id;
  isRoleModalOpen.value = true;
}
function handleRoleCreated(newRole) { fetchRoles(); }
function handleRoleUpdated(updatedRole) { fetchRoles(); }

// ⬇️ 【新增】 重置密码
async function handleResetPassword(user) {
  if (confirm(`确定要将用户 "${user.nickname}" (${user.username}) 的密码重置为 'q1234567' 吗？`)) {
    try {
      const response = await apiClient.post(`/admin/users/${user.id}/reset-password`);
      alert(response.data.message); // 显示成功信息
    } catch (error) {
      console.error('重置密码失败:', error);
      alert(error.response?.data?.error || '操作失败');
    }
  }
}
</script>
