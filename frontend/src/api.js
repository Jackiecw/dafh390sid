import axios from 'axios';
import { useAuthStore } from './stores/auth';

const rawBaseURL = (import.meta.env.VITE_API_BASE_URL || '').trim();
let resolvedBaseURL = rawBaseURL;

if (!resolvedBaseURL && typeof window !== 'undefined') {
  resolvedBaseURL = `${window.location.origin}/api`;
} else if (resolvedBaseURL && typeof window !== 'undefined') {
  try {
    const configuredURL = new URL(resolvedBaseURL);
    const currentHost = window.location.hostname;
    if (
      currentHost &&
      currentHost !== 'localhost' &&
      currentHost !== '127.0.0.1' &&
      (configuredURL.hostname === 'localhost' || configuredURL.hostname === '127.0.0.1')
    ) {
      configuredURL.hostname = currentHost;
      resolvedBaseURL = configuredURL.toString();
    }
  } catch (error) {
    // 如果配置的 URL 不是合法地址，就保留原值，避免阻断请求
  }
}

const apiClient = axios.create({
  baseURL: resolvedBaseURL || '/api',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const authStore = useAuthStore();
    if (error.response?.status === 401) {
      authStore.logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
