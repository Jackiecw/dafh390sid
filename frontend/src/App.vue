<template>
  <component :is="authStore.isLoggedIn ? Dashboard : Login" />
</template>

<script setup>
// ⬇️ 【删除】 ref 和 onMounted
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import { useAuthStore } from './stores/auth'; // ⬅️ 【新增】1. 导入您的“保险箱”

// ⬅️ 【新增】2. 获取 auth store 实例
const authStore = useAuthStore();

</script>