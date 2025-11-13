<template>
  <div class="flex min-h-screen bg-white">
    
    <div class="hidden lg:block lg:w-3/5 relative">
      <img 
        src="../assets/login-bg.png" 
        alt="Login Background" 
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div class="absolute inset-0 bg-indigo-900 opacity-30"></div>
    </div>

    <div class="w-full lg:w-2/5 flex items-center justify-center p-8 bg-stone-50">
      <div class="w-full max-w-md">
        
        <img 
          :src="logoUrl" 
          alt="Company Logo" 
          class="h-12 w-auto mx-auto mb-6" 
        />

        <h1 class="text-2xl font-bold text-center text-stone-900 mb-8">
          海外电商部 内部系统
        </h1>

        <form @submit.prevent="handleLogin" class="space-y-6">
          
          <div>
            <label for="username" class="block text-sm font-medium text-stone-700 mb-2">
              用户名
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon class="h-5 w-5 text-stone-400" aria-hidden="true" />
              </span>
              <input 
                type="text" 
                id="username" 
                v-model="username" 
                required 
                class="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-stone-700 mb-2">
              密码
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                <LockClosedIcon class="h-5 w-5 text-stone-400" aria-hidden="true" />
              </span>
              <input 
                type="password" 
                id="password" 
                v-model="password" 
                required 
                @keyup.enter="handleLogin"
                class="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
          </div>

          <p v-if="errorMessage" class="text-red-600 text-center text-sm">
            {{ errorMessage }}
          </p>

          <button 
            type="submit"
            class="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-indigo-700 transition duration-300 !mt-8"
          >
            登 录
          </button>

          <p class="text-center text-sm text-stone-500 !mt-6">
            登录遇到问题? 
            <a href="mailto:wei@cheerlux.com" class="font-medium text-indigo-600 hover:text-indigo-500">
              联系管理员
            </a>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios'; 
import { useAuthStore } from '../stores/auth';
// 1. 导入图标
import { UserIcon, LockClosedIcon } from '@heroicons/vue/20/solid';

// 2. 【操作指引】: 导入你的 Logo
//    请将 'logo.png' 替换为你实际的文件名
import logoUrl from '../assets/logo.png'; 
//    (如果你没有 Logo，可以注释掉上面这行，并删除 <template> 中的 <img :src="logoUrl" ... />)


const username = ref('');
const password = ref('');
const errorMessage = ref(''); 
const authStore = useAuthStore();

const handleLogin = async () => {
  errorMessage.value = ''; 
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/login`, 
      {
        username: username.value,
        password: password.value,
      }
    );
    
    authStore.login(response.data.token);

  } catch (error) {
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '登录失败，请检查网络或联系管理员';
    }
  }
};
</script>

<style scoped>
/* 这个组件现在完全依赖 Tailwind CSS。
  如果你为背景图添加了蒙版，这里的样式可以帮助蒙版生效。
*/
.relative {
  position: relative;
}
.absolute {
  position: absolute;
}
.inset-0 {
  top: 0; right: 0; bottom: 0; left: 0;
}
.h-full { height: 100%; }
.w-full { width: 100%; }
.object-cover { object-fit: cover; }
</style>