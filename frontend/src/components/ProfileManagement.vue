<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    
    <div class="md:col-span-1 space-y-6">
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h3 class="text-xl font-bold text-stone-900 mb-6">个人资料</h3>
        
        <form @submit.prevent="handleProfileUpdate" class="space-y-4">
          
          <div class="flex flex-col items-center">
            <label class="form-label">头像</label>
            <img :src="previewUrl || userAvatar" alt="Avatar" class="avatar-img mb-2" />
            <input 
              type="file" 
              @change="onFileSelected"
              accept="image/png, image/jpeg"
              class="block w-full text-sm text-stone-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100"
            />
          </div>

          <div class="space-y-2">
            <label for="nickname" class="form-label">昵称 *</label>
            <input type="text" id="nickname" v-model="profileForm.nickname" required class="form-input" />
          </div>

          <button type="submit" :disabled="isUpdating" class="form-submit-button w-full">
            {{ isUpdating ? '保存中...' : '保存资料' }}
          </button>
          
          <p v-if="profileError" class="text-red-600 text-sm">{{ profileError }}</p>
          <p v-if="profileSuccess" class="text-green-600 text-sm">{{ profileSuccess }}</p>
        </form>
      </div>
    </div>

    <div class="md:col-span-2 space-y-6">
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h3 class="text-xl font-bold text-stone-900 mb-6">修改密码</h3>
        
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <div class="space-y-2">
            <label for="oldPassword" class="form-label">旧密码 *</label>
            <input type="password" id="oldPassword" v-model="passwordForm.oldPassword" required class="form-input" />
          </div>
          
          <div class="space-y-2">
            <label for="newPassword" class="form-label">新密码 * (至少8位)</label>
            <input type="password" id="newPassword" v-model="passwordForm.newPassword" required class="form-input" />
          </div>
          
          <div class="space-y-2">
            <label for="confirmPassword" class="form-label">确认新密码 *</label>
            <input type="password" id="confirmPassword" v-model="passwordForm.confirmPassword" required class="form-input" />
          </div>
          
          <button type="submit" :disabled="isChangingPassword" class="form-submit-button w-full">
            {{ isChangingPassword ? '修改中...' : '确认修改密码' }}
          </button>
          
          <p v-if="passwordError" class="text-red-600 text-sm">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="text-green-600 text-sm">{{ passwordSuccess }}</p>
        </form>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

// --- 1. 个人资料表单 ---
const profileForm = ref({
  nickname: authStore.nickname,
});
const selectedFile = ref(null);
const previewUrl = ref(null); // (用于新图片预览)
const isUpdating = ref(false);
const profileError = ref('');
const profileSuccess = ref('');

// (计算属性) 获取头像 URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const userAvatar = computed(() => {
  if (!authStore.avatarUrl) return 'https://via.placeholder.com/150'; // 默认图
  return authStore.avatarUrl.startsWith('http') 
    ? authStore.avatarUrl 
    : `${apiBaseUrl}${authStore.avatarUrl}`;
});

// (当昵称在 store 中变化时，更新表单)
watch(() => authStore.nickname, (newNickname) => {
  profileForm.value.nickname = newNickname;
});

// (文件选择)
function onFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    // (安全) 释放掉旧的预览 URL
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(file); // 创建本地预览
  }
}

// (提交资料)
async function handleProfileUpdate() {
  isUpdating.value = true;
  profileError.value = '';
  profileSuccess.value = '';

  const payload = new FormData();
  payload.append('nickname', profileForm.value.nickname);
  if (selectedFile.value) {
    payload.append('avatarImage', selectedFile.value);
  }

  try {
    const response = await apiClient.put('/profile/update-details', payload);
    
    // (核心) 刷新 Token
    authStore.login(response.data.token); 
    
    profileSuccess.value = '资料更新成功！';
    selectedFile.value = null;
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }

  } catch (error) {
    console.error('更新资料失败:', error);
    profileError.value = error.response?.data?.error || '更新失败，请重试。';
  } finally {
    isUpdating.value = false;
  }
}


// --- 2. 修改密码表单 ---
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const isChangingPassword = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

async function handleChangePassword() {
  passwordError.value = '';
  passwordSuccess.value = '';
  
  // (客户端验证)
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致';
    return;
  }
  
  isChangingPassword.value = true;
  
  try {
    const payload = {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
    };
    
    const response = await apiClient.post('/profile/change-password', payload);
    
    passwordSuccess.value = '密码修改成功！';
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };

  } catch (error) {
    console.error('修改密码失败:', error);
    passwordError.value = error.response?.data?.error || '修改失败，请重试。';
  } finally {
    isChangingPassword.value = false;
  }
}

</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.form-submit-button {
  display: inline-flex;
  justify-content: center;
  border-radius: 0.375rem; /* rounded-lg */
  border: 1px solid transparent;
  background-color: #4f46e5; /* bg-indigo-600 */
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem; /* text-sm */
  font-weight: 500; /* font-medium */
  color: white;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  transition: background-color 0.15s ease;
}
.form-submit-button:hover {
  background-color: #4338ca; /* hover:bg-indigo-700 */
}
.form-submit-button:disabled {
  background-color: #a5b4fc; /* bg-indigo-300 */
  cursor: not-allowed;
}
.avatar-img {
  width: 100px; /* 150px */
  height: 100px; /* 150px */
  border-radius: 9999px; /* rounded-full */
  object-fit: cover; /* 确保图片不变形 */
  border: 4px solid #e5e7eb; /* border-gray-200 */
}
</style>