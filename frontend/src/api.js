import axios from 'axios';
import { useAuthStore } from './stores/auth'; // ⬅️ 导入 Pinia “保险箱”

// 1. 创建一个 axios 实例，并配置好基础 URL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

// 2. (核心) 添加一个“请求拦截器” (Request Interceptor)
//    这就像一个“检查站”，在“每个请求”被发送出去之前都会运行
apiClient.interceptors.request.use(config => {
  
  // 3. 在“检查站”中，获取 auth store
  // (注意：必须在拦截器内部获取，不能在外面)
  const authStore = useAuthStore();
  
  // 4. 如果 store 中有 token，就把它附加到请求头中
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  
  // 5. 放行请求
  return config;
});

// 6. 导出这个配置好的实例
export default apiClient;