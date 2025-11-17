<template>
  <div class="space-y-8">
    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">Product Ops</p>
          <h2 class="text-3xl font-semibold text-[#1F2937]">店铺在售 (Listings)</h2>
          <p class="text-sm text-[#6B7280]">集中管理全渠道在售商品、售价、链接与销量数据。</p>
        </div>
        <div class="flex gap-3">
          <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-right">
            <p class="text-xs text-[#94A3B8]">在售清单总数</p>
            <p class="text-xl font-semibold text-[#1F2937]">{{ listings.length }}</p>
          </div>
          <button
            @click="openCreateModal"
            class="rounded-2xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2563EB]"
          >
            + 上架新商品
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-0 shadow-sm">
      <div v-if="isLoading" class="p-6 text-sm text-[#6B7280]">正在加载在售列表...</div>
      <div v-else>
        <p v-if="errorMessage" class="px-6 pt-6 text-sm text-red-600">{{ errorMessage }}</p>
        <div v-if="listings.length === 0" class="px-6 pb-6 text-sm text-[#6B7280]">
          当前还没有在售商品，点击右上角「上架新商品」即可快速创建。
        </div>
        <div v-else class="flex flex-col gap-6 px-6 pb-6 lg:flex-row">
          <aside class="lg:w-5/12 xl:w-1/3">
            <div class="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFF] p-3 shadow-inner">
              <p class="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">在售清单</p>
              <div class="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                <button
                  v-for="listing in listings"
                  :key="listing.id"
                  class="w-full rounded-2xl border bg-white px-4 py-3 text-left transition"
                  :class="
                    selectedListingId === listing.id
                      ? 'border-[#2563EB] shadow-lg shadow-blue-100'
                      : 'border-transparent hover:border-[#CBD5F5] hover:shadow'
                  "
                  @click="selectListing(listing.id)"
                >
                  <div class="flex items-start gap-4">
                    <img
                      :src="getListingImageUrl(listing.storeImageUrl)"
                      alt="listing cover"
                      class="h-16 w-16 flex-shrink-0 rounded-xl border border-[#E5E7EB] object-cover shadow"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-[#1F2937] line-clamp-2">
                        {{ listing.storeTitle || '未命名商品' }}
                      </p>
                      <p class="mt-1 text-xs text-[#64748B]">
                        代码：{{ listing.productCode || '未设置' }}
                      </p>
                      <p class="text-xs text-[#94A3B8]">
                        {{ listing.store.country.name }} · {{ listing.store.name }}
                      </p>
                      <p class="mt-2 text-sm font-semibold text-[#2563EB]">
                        {{ formatLocalPrice(listing.currentPrice, getCurrencyCode(listing)) }}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          <article
            v-if="selectedListing"
            class="flex-1 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-lg shadow-blue-50"
          >
            <div class="flex flex-col gap-6 lg:flex-row">
              <div class="flex-shrink-0">
                <img
                  :src="getListingImageUrl(selectedListing.storeImageUrl)"
                  alt="listing main"
                  class="h-48 w-48 rounded-3xl border border-[#E2E8F0] object-cover shadow-lg"
                />
              </div>
              <div class="flex-1 space-y-3">
                <div class="flex items-center gap-2 text-sm text-[#64748B]">
                  <span class="rounded-full bg-[#EEF2FF] px-3 py-1 font-semibold text-[#4338CA]">
                    {{ selectedListing.store.country.code }}
                  </span>
                  <span>{{ selectedListing.store.name }}</span>
                </div>
                <h3 class="text-2xl font-semibold text-[#111827]">
                  {{ selectedListing.storeTitle || '未命名商品' }}
                </h3>
                <p class="text-sm text-[#6B7280]">
                  对应产品：{{ selectedListing.product.publicName || selectedListing.product.name }}
                  (SKU: {{ selectedListing.product.sku }})
                </p>
                <p class="text-sm text-[#6B7280]">
                  商品代码：
                  <span class="font-semibold text-[#111827]">
                    {{ selectedListing.productCode || '未设置' }}
                  </span>
                </p>
                <div>
                  <p class="text-xs uppercase tracking-wide text-[#94A3B8]">售价</p>
                  <p class="text-3xl font-semibold text-[#111827]">
                    {{ formatLocalPrice(selectedListing.currentPrice, getCurrencyCode(selectedListing)) }}
                    <span class="ml-3 text-base font-medium text-[#059669]">
                      ≈ ¥ {{ formatCnyPrice(selectedListing).toFixed(2) }}
                    </span>
                  </p>
                </div>
                <div class="flex flex-wrap gap-4 text-sm text-[#6B7280]">
                  <span>上周销量：<strong class="text-[#111827]">{{ selectedListing.lastWeekSales }}</strong></span>
                  <span>本月销量：<strong class="text-[#111827]">{{ selectedListing.thisMonthSales }}</strong></span>
                  <span>总销量：<strong class="text-[#111827]">{{ selectedListing.totalSales }}</strong></span>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <button
                    @click="openEditModal(selectedListing)"
                    class="rounded-2xl bg-[#EEF2FF] px-4 py-2 text-sm font-semibold text-[#4338CA] hover:bg-[#E0E7FF]"
                  >
                    编辑
                  </button>
                  <button
                    v-if="isAdmin"
                    @click="handleDelete(selectedListing)"
                    class="rounded-2xl border border-[#FEE2E2] bg-[#FFF5F5] px-4 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FFE4E6]"
                  >
                    删除
                  </button>
                  <a
                    v-if="selectedListing.platformUrl"
                    :href="selectedListing.platformUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-semibold text-[#2563EB] hover:underline"
                  >
                    查看商品链接
                  </a>
                  <span v-else class="text-sm text-[#94A3B8]">暂无商品链接</span>
                </div>
              </div>
            </div>
          </article>
          <article
            v-else
            class="flex-1 rounded-3xl border border-dashed border-[#CBD5F5] bg-[#F8FAFF] p-6 text-center text-[#64748B]"
          >
            请选择左侧的商品以查看详细信息。
          </article>
        </div>
      </div>
    </section>

    <StoreListingFormModal
      :is-open="isModalOpen"
      :listing-to-edit-id="listingToEditId"
      @close="closeModal"
      @listing-created="handleListingCreated"
      @listing-updated="handleListingUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import StoreListingFormModal from './StoreListingFormModal.vue';

const authStore = useAuthStore();
const listings = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const listingToEditId = ref(null);
const selectedListingId = ref(null);
const ratesData = ref({});
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const placeholderImage = 'https://via.placeholder.com/320x320?text=Listing';

const isAdmin = computed(() => authStore.role === 'admin');
const selectedListing = computed(() => listings.value.find((item) => item.id === selectedListingId.value) || null);

const currencyFallbackMap = {
  ID: 'IDR',
  VN: 'VND',
  TH: 'THB',
  MY: 'MYR',
  PH: 'PHP',
  SG: 'SGD',
};

async function fetchListings(focusId = null) {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/store-listings');
    listings.value = response.data;
    if (listings.value.length === 0) {
      selectedListingId.value = null;
    } else if (focusId && listings.value.some((item) => item.id === focusId)) {
      selectedListingId.value = focusId;
    } else if (!selectedListingId.value || !listings.value.some((item) => item.id === selectedListingId.value)) {
      selectedListingId.value = listings.value[0]?.id || null;
    }
  } catch (error) {
    console.error('获取店铺在售列表失败:', error);
    errorMessage.value = error.response?.data?.error || '获取店铺在售列表失败';
  } finally {
    isLoading.value = false;
  }
}

async function fetchRates() {
  try {
    const response = await apiClient.get('/rates');
    ratesData.value = response.data || {};
  } catch (error) {
    console.error('获取汇率失败:', error);
  }
}

onMounted(() => {
  fetchListings();
  fetchRates();
});

function openCreateModal() {
  listingToEditId.value = null;
  isModalOpen.value = true;
}

function openEditModal(listing) {
  listingToEditId.value = listing.id;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  listingToEditId.value = null;
}

function selectListing(id) {
  selectedListingId.value = id;
}

async function handleListingCreated(newListing) {
  await fetchListings(newListing.id);
  closeModal();
}

async function handleListingUpdated(updatedListing) {
  await fetchListings(updatedListing.id);
  closeModal();
}

async function handleDelete(listing) {
  if (!isAdmin.value) {
    errorMessage.value = '仅超级管理员可以删除上架商品';
    return;
  }
  if (!confirm(`确定要删除「${listing.storeTitle || listing.product.publicName || listing.product.name}」吗？`)) {
    return;
  }

  errorMessage.value = '';
  try {
    await apiClient.delete(`/admin/store-listings/${listing.id}`);
    await fetchListings();
  } catch (error) {
    console.error('删除失败:', error);
    errorMessage.value = error.response?.data?.error || '删除失败，请重试';
  }
}

function getListingImageUrl(imageUrl) {
  if (!imageUrl) return placeholderImage;
  return `${apiBaseUrl}${imageUrl}`;
}

function getCurrencyCode(listing) {
  if (!listing) return null;
  return listing.currencyCode || currencyFallbackMap[listing.store?.country?.code] || null;
}

function getRateForCurrency(currencyCode) {
  if (!currencyCode) return null;
  return ratesData.value[`CNY_${currencyCode}`] ?? ratesData.value[currencyCode] ?? null;
}

function formatLocalPrice(value, currencyCode) {
  const amount = Number(value) || 0;
  if (!currencyCode) {
    return amount.toFixed(2);
  }
  try {
    const noDecimal = currencyCode === 'IDR' || currencyCode === 'VND';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: noDecimal ? 0 : 2,
      maximumFractionDigits: noDecimal ? 0 : 2,
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatCnyPrice(listing) {
  if (!listing) return 0;
  const direct = Number(listing.currentPriceRmb);
  if (!Number.isNaN(direct) && direct > 0) {
    return direct;
  }
  const currencyCode = getCurrencyCode(listing);
  const rate = getRateForCurrency(currencyCode);
  if (!rate) return 0;
  const amount = Number(listing.currentPrice) || 0;
  return amount / rate;
}
</script>
