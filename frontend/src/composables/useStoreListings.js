// ./frontend/src/composables/useStoreListings.js
import { ref, computed } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const storesCache = ref([]);
const storesLoaded = ref(false);
const storesLoading = ref(false);
const storesError = ref('');

const listingCache = ref(new Map());
const listingLoading = ref(new Map());
const listingError = ref(new Map());

function resetListingState(storeId) {
  listingCache.value.delete(storeId);
  listingLoading.value.delete(storeId);
  listingError.value.delete(storeId);
}

async function fetchStores(force = false) {
  if (storesLoaded.value && !force) {
    return storesCache.value;
  }
  if (storesLoading.value) {
    return storesCache.value;
  }

  storesLoading.value = true;
  storesError.value = '';
  try {
    const response = await apiClient.get('/stores-list');
    storesCache.value = Array.isArray(response.data) ? response.data : [];
    storesLoaded.value = true;
  } catch (error) {
    storesError.value = error.response?.data?.error || '获取店铺列表失败';
    storesCache.value = [];
    storesLoaded.value = false;
  } finally {
    storesLoading.value = false;
  }
  return storesCache.value;
}

function getStoresByCountry(countryCode) {
  if (!countryCode) return storesCache.value;
  return storesCache.value.filter((store) => store.countryCode === countryCode);
}

function getStoresByCountryAndPlatform(countryCode, platform) {
  return storesCache.value.filter(
    (store) =>
      (!countryCode || store.countryCode === countryCode) &&
      (!platform || store.platform === platform)
  );
}

async function fetchListings(storeId, force = false) {
  if (!storeId) {
    return [];
  }

  if (!force && listingCache.value.has(storeId)) {
    return listingCache.value.get(storeId);
  }

  if (listingLoading.value.get(storeId)) {
    return listingCache.value.get(storeId) || [];
  }

  listingLoading.value.set(storeId, true);
  listingError.value.set(storeId, '');
  try {
    const response = await apiClient.get(`/stores/${storeId}/listings`);
    const data = Array.isArray(response.data) ? response.data : [];
    listingCache.value.set(storeId, data);
    return data;
  } catch (error) {
    const message = error.response?.data?.error || '无法加载店铺链接';
    listingError.value.set(storeId, message);
    listingCache.value.delete(storeId);
    throw new Error(message);
  } finally {
    listingLoading.value.set(storeId, false);
  }
}

function invalidateStore(storeId) {
  resetListingState(storeId);
}

function invalidateAllListings() {
  listingCache.value.clear();
  listingLoading.value.clear();
  listingError.value.clear();
}

function useStoreListings() {
  const authStore = useAuthStore();
  const permittedCountries = computed(() => {
    if (authStore.role === 'admin') {
      return storesCache.value
        .map((store) => store.country?.code)
        .filter(Boolean);
    }
    return authStore.operatedCountries;
  });

  return {
    stores: storesCache,
    storesLoaded,
    storesLoading,
    storesError,
    fetchStores,
    getStoresByCountry,
    getStoresByCountryAndPlatform,
    permittedCountries,
    fetchListings,
    listingCache,
    listingLoading,
    listingError,
    invalidateStore,
    invalidateAllListings,
  };
}

export default useStoreListings;
