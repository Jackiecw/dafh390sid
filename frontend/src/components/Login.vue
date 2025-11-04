<template>
  <div class="flex items-center justify-center min-h-screen bg-stone-100">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">

      <h1 class="text-3xl font-bold text-center text-green-700 mb-6">
        Aviewlux 内部系统
      </h1>

      <div class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-stone-700 mb-2">
            用户名
          </label>
          <input type="text" id="username" v-model="username" required 
                 class="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-stone-700 mb-2">
            密码
          </label>
          <input type="password" id="password" v-model="password" required @keyup.enter="handleLogin"
                 class="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <p v-if="errorMessage" class="text-red-600 text-center">
          {{ errorMessage }}
        </p>

        <button @click="handleLogin" class="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-green-700 transition duration-300">
          登 录
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios'; // ⬅️ 【关键】必须导入 'axios'
// import apiClient from '../api'; // ⬅️ 【关键】确保这里没有导入 'apiClient'
import { useAuthStore } from '../stores/auth';

const username = ref('');
const password = ref('');
const errorMessage = ref(''); 
const authStore = useAuthStore();

const handleLogin = async () => {
  errorMessage.value = ''; 
  try {
    // 【关键】
    // 1. 使用普通的 'axios.post'
    // 2. 使用环境变量来构建完整的 URL
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