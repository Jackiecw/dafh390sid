// ./frontend/src/stores/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = defineStore('auth', () => {
  // 1. State (不变)
  const token = ref(localStorage.getItem('token'));
  const user = ref(null); // 这个 ref 将保存完整的解码后的 Token 负载

  // 2. Getters (计算属性)
  const isLoggedIn = computed(() => !!token.value);
  const nickname = computed(() => user.value?.nickname || '用户');
  const role = computed(() => user.value?.role || 'GUEST');

  // (不变) 菜单权限
  // (不变) 菜单权限
  const permissions = computed(() => {
    const perms = user.value?.permissions || [];
    // TODO: Remove this dev hack
    if (!perms.includes('SALES_IMPORT')) {
      return [...perms, 'SALES_IMPORT'];
    }
    return perms;
  });

  // (修改) 国家权限
  const operatedCountries = computed(() => user.value?.operatedCountries || []);
  const supervisedCountries = computed(() => user.value?.supervisedCountries || []); // ⬅️ 【新增】

  // (不变) 头像 Getter
  const avatarUrl = computed(() => user.value?.avatarUrl || null);


  // 3. (不变) 核心解码函数
  function checkAndDecodeToken() {
    if (token.value) {
      try {
        const decoded = jwtDecode(token.value);
        // 检查 Token 是否过期
        if (decoded.exp * 1000 > Date.now()) {

          // (不变)
          // decoded 现在是 { ..., permissions: [], operatedCountries: [], supervisedCountries: [], avatarUrl: ... }
          // 我们把它完整存入 user ref
          user.value = decoded;
        } else {
          // Token 过期了
          logout();
        }
      } catch (error) {
        // Token 格式错误
        logout();
      }
    } else {
      user.value = null;
    }
  }

  // 4. Actions (不变)
  function login(newToken) {
    localStorage.setItem('token', newToken); // 存入“保险箱”
    token.value = newToken;
    checkAndDecodeToken(); // 存入后立即解码 (此函数已更新)
  }

  function logout() {
    localStorage.removeItem('token'); // 移除“保险箱”
    token.value = null;
    user.value = null;
  }

  // 5. (不变) 应用加载时，立即检查一次
  checkAndDecodeToken();

  // 6. ⬇️ 【修改】 (暴露新 Getter)
  return {
    token,
    user,
    isLoggedIn,
    nickname,
    role,
    permissions,
    operatedCountries,
    supervisedCountries, // ⬅️ 【新增】
    avatarUrl,
    login,
    logout
  };
});