<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">People Ops</p>
          <h2 class="text-3xl font-semibold">员工配置与管理</h2>
          <p class="text-sm text-white/80">统一配置账号、角色与国家分配，保持权限一致。</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
            <p class="text-white/70">用户数</p>
            <p class="text-xl font-semibold">{{ users.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
            <p class="text-white/70">角色数</p>
            <p class="text-xl font-semibold">{{ rolesList.length }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex flex-wrap gap-3">
        <button
          @click="currentTab = 'users'"
          :class="[
            'rounded-full px-4 py-2 text-sm font-semibold',
            currentTab === 'users'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          用户管理
        </button>
        <button
          @click="currentTab = 'roles'"
          :class="[
            'rounded-full px-4 py-2 text-sm font-semibold',
            currentTab === 'roles'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          角色与权限
        </button>
        <button
          @click="currentTab = 'countries'"
          :class="[
            'rounded-full px-4 py-2 text-sm font-semibold',
            currentTab === 'countries'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          国家管理
        </button>
      </nav>
    </section>

    <section class="space-y-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div v-if="currentTab === 'users'">
        <div class="flex justify-end">
          <button @click="openModal" class="rounded-full bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2563EB]">
            + 新建用户
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600 mb-4">{{ errorMessage }}</p>
        <div class="overflow-hidden rounded-2xl border border-[#E5E7EB]">
          <table class="min-w-full divide-y divide-[#E5E7EB]">
            <thead class="bg-[#F9FAFB]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">昵称</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">用户名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">角色</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">运营国家</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-[#E5E7EB]">
              <tr v-for="user in users" :key="user.id" class="hover:bg-[#F9FAFB]">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F2937]">{{ user.nickname }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">{{ user.username }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="['px-2 py-1 rounded-full text-xs font-semibold', user.role.name === 'admin' ? 'bg-red-100 text-red-800' : 'bg-[#DBEAFE] text-[#1D4ED8]']">
                    {{ user.role.description }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">
                  <span v-if="user.operatedCountries.length > 0">
                    {{ user.operatedCountries.map(c => c.code).join(', ') }}
                  </span>
                  <span v-else class="text-[#94A3B8]">--</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button @click="handleEdit(user)" class="text-[#3B82F6] hover:text-[#2563EB]">编辑</button>
                  <button
                    @click="handleResetPassword(user)"
                    :disabled="user.username === 'admin'"
                    class="text-[#F59E0B] hover:text-[#B45309] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                  >
                    重置密码
                  </button>
                  <button
                    v-if="isSuperAdmin"
                    @click="handleDeleteUser(user)"
                    :disabled="user.username === 'admin' || user.id === currentUserId"
                    class="text-red-500 hover:text-red-700 disabled:text-[#94A3B8] disabled:cursor-not-allowed"
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
            class="rounded-full bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2563EB]"
          >
            + 新建角色
          </button>
        </div>
        <div class="overflow-hidden rounded-2xl border border-[#E5E7EB]">
          <table class="min-w-full divide-y divide-[#E5E7EB]">
            <thead class="bg-[#F9FAFB]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">角色描述</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">角色 Key</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-[#E5E7EB]">
              <tr v-for="role in rolesList" :key="role.id" class="hover:bg-[#F9FAFB]">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1F2937]">{{ role.description }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">{{ role.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="handleEditRole(role)"
                    :disabled="role.name === 'admin'"
                    :class="[
                      role.name === 'admin'
                        ? 'text-[#94A3B8] cursor-not-allowed'
                        : 'text-[#3B82F6] hover:text-[#2563EB]'
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
    </section>
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
