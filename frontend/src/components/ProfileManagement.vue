<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Profile Center</p>
          <h2 class="text-3xl font-semibold">个人中心</h2>
          <p class="text-sm text-white/80">更新个人资料、上传头像并及时修改密码。</p>
        </div>
        <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
          <p class="text-xs text-white/70">当前用户</p>
          <p class="text-xl font-semibold">{{ authStore.nickname }}</p>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <section class="space-y-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:col-span-1">
        <h3 class="text-xl font-semibold text-[#1F2937]">个人资料</h3>
        
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
                     file:bg-[#EEF2FF] file:text-[#1D4ED8]
                     hover:file:bg-[#E0EAFF]"
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
      </section>

      <section class="space-y-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm md:col-span-2">
        <h3 class="text-xl font-semibold text-[#1F2937]">修改密码</h3>
        
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
      </section>
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
  color: #1F2937;
  font-weight: 600;
  font-size: 0.875rem;
}
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #E5E7EB;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  color: #1F2937;
  background-color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.form-input:focus {
  border-color: #3B82F6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.form-submit-button {
  display: inline-flex;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid transparent;
  background-color: #3B82F6;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.25);
  transition: background-color 0.15s ease, transform 0.15s ease;
}
.form-submit-button:hover {
  background-color: #2563EB;
  transform: translateY(-1px);
}
.form-submit-button:disabled {
  background-color: #93C5FD;
  cursor: not-allowed;
  box-shadow: none;
}
.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 9999px;
  object-fit: cover;
  border: 4px solid #E5E7EB;
}
</style>
