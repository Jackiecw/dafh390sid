// ./frontend/src/composables/useManagedCountries.js
import { ref } from 'vue';
import apiClient from '../api';

const countries = ref([]);
const isLoadingCountries = ref(false);
const countriesError = ref('');
let loadedOnce = false;

async function fetchCountries(force = false) {
  if (isLoadingCountries.value || (loadedOnce && !force)) {
    return countries.value;
  }
  isLoadingCountries.value = true;
  countriesError.value = '';
  try {
    const response = await apiClient.get('/admin/countries');
    countries.value = Array.isArray(response.data) ? response.data : [];
    loadedOnce = true;
  } catch (error) {
    countriesError.value = error.response?.data?.error || '无法加载国家列表';
    countries.value = [];
  } finally {
    isLoadingCountries.value = false;
  }
  return countries.value;
}

export default function useManagedCountries() {
  return {
    countries,
    fetchCountries,
    countriesError,
    isLoadingCountries,
  };
}
