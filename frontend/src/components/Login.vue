<template>
  <div class="min-h-screen bg-[#F9FAFB]">
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section class="hidden items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] p-10 text-white lg:flex">
        <div class="max-w-md space-y-8">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Overseas Ops</p>
            <h2 class="text-4xl font-semibold">海外电商部 内部系统</h2>
            <p class="text-sm text-white/80">集中化管理仪表盘、运营中心、财务与销售数据，帮助团队保持节奏一致。</p>
          </div>
          <div class="space-y-4 rounded-3xl bg-white/10 p-6 backdrop-blur">
            <p class="text-sm uppercase tracking-[0.35em] text-white/80">Operations Snapshot</p>
            <div class="grid grid-cols-1 gap-4 text-sm text-white/90">
              <div class="rounded-2xl bg-white/5 px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">今日指标</p>
                <p class="text-2xl font-semibold">12,640</p>
                <p class="text-white/80">实时同步 GMV & 任务状态</p>
              </div>
              <div class="rounded-2xl bg-white/5 px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">协同效率</p>
                <p class="text-2xl font-semibold">+34%</p>
                <p class="text-white/80">跨国团队在同一系统中协作</p>
              </div>
              <div class="rounded-2xl bg-white/5 px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">安全级别</p>
                <p class="text-2xl font-semibold">零事故</p>
                <p class="text-white/80">访问审计与审批链条全程可查</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-md space-y-8 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-xl">
          <div class="space-y-4 text-center">
            <img :src="logoUrl" alt="Company Logo" class="mx-auto h-12 w-auto" />
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">Welcome Back</p>
              <h1 class="text-2xl font-semibold text-[#1F2937]">登录账号</h1>
              <p class="text-sm text-[#6B7280]">使用您的企业账号进入内部系统。</p>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label for="username" class="form-label">用户名</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon class="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  id="username"
                  v-model="username"
                  required
                  class="form-input pl-14"
                />
              </div>
            </div>

            <div>
              <label for="password" class="form-label">密码</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <LockClosedIcon class="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
                </span>
                <input
                  type="password"
                  id="password"
                  v-model="password"
                  required
                  @keyup.enter="handleLogin"
                  class="form-input pl-14"
                />
              </div>
            </div>

            <p v-if="errorMessage" class="rounded-2xl bg-red-50 p-3 text-center text-sm text-red-600">
              {{ errorMessage }}
            </p>

            <button type="submit" class="form-submit-button w-full">
              登录
            </button>
          </form>

          <p class="text-center text-sm text-[#6B7280]">
            登录遇到问题？
            <a href="mailto:wei@cheerlux.com" class="font-semibold text-[#3B82F6] hover:text-[#2563EB]">
              联系管理员
            </a>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api';
import { UserIcon, LockClosedIcon } from '@heroicons/vue/20/solid';
import logoUrl from '../assets/logo.png';

import { useRouter } from 'vue-router'; // ⬅️ Import router

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const authStore = useAuthStore();
const router = useRouter(); // ⬅️ Init router

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    const { data } = await apiClient.post('/login', {
      username: username.value,
      password: password.value,
    });
    authStore.login(data.token);
    router.push('/'); // ⬅️ Redirect to dashboard
  } catch (error) {
    if (error.response?.data?.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '登录失败，请检查网络或联系管理员';
    }
  }
};
</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #1F2937;
  font-weight: 600;
  font-size: 0.85rem;
}
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #E5E7EB;
  border-radius: 9999px;
  font-size: 0.95rem;
  color: #1F2937;
  background-color: #FDFDFE;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.form-input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.form-submit-button {
  display: inline-flex;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  padding: 0.85rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(90deg, #3B82F6, #60A5FA);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.35);
  transition: transform 0.15s ease;
}
.form-submit-button:hover {
  transform: translateY(-1px);
}
.form-submit-button:disabled {
  background: #93C5FD;
  box-shadow: none;
  cursor: not-allowed;
}
</style>

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
