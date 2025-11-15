<template>
  <div class="space-y-8">
    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">Product Ops</p>
          <h2 class="text-3xl font-semibold text-[#1F2937]">在售商品</h2>
          <p class="text-sm text-[#6B7280]">集中管理全渠道 SKU，随时查看配置与价格。</p>
        </div>
        <div class="flex gap-3">
          <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-right">
            <p class="text-xs text-[#94A3B8]">商品总数</p>
            <p class="text-xl font-semibold text-[#1F2937]">{{ products.length }}</p>
          </div>
          <button
            @click="openCreateModal"
            class="rounded-2xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2563EB]"
          >
            + 新建商品
          </button>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between pb-4">
          <h3 class="text-lg font-semibold text-[#1F2937]">SKU 列表</h3>
          <span class="text-xs text-[#94A3B8]">{{ selectedProduct ? '已选择' : '未选择' }}</span>
        </div>
        <p v-if="isLoading" class="text-sm text-[#6B7280]">正在加载商品列表...</p>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        <div class="grid grid-cols-2 gap-3 overflow-y-auto pr-1 lg:grid-cols-1 max-h-[70vh]">
          <button
            v-for="product in products"
            :key="product.id"
            @click="selectProduct(product)"
            :class="[
              'rounded-2xl border p-3 text-left transition hover:bg-[#F3F4F6]',
              selectedProduct?.id === product.id
                ? 'border-[#3B82F6] bg-[#EEF2FF] shadow-lg shadow-blue-500/20'
                : 'border-[#E5E7EB] bg-white shadow-sm'
            ]"
          >
            <div class="flex items-center gap-3">
              <img :src="getProductImageUrl(product.imageUrl)" alt="product" class="h-16 w-16 rounded-xl object-cover shadow" />
              <div>
                <p class="text-sm font-semibold text-[#1F2937]">{{ product.sku }}</p>
                <p class="text-xs text-[#6B7280] line-clamp-1">{{ product.name }}</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm min-h-[420px]">
        <div v-if="!selectedProduct" class="flex h-full items-center justify-center text-[#6B7280]">
          <p>请从左侧选择一个商品以查看详情</p>
        </div>
        <div v-else class="space-y-6">
          <div class="flex flex-col gap-4 border-b border-[#E5E7EB] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-4">
              <img :src="getProductImageUrl(selectedProduct.imageUrl)" alt="product" class="h-24 w-24 rounded-2xl object-cover shadow" />
              <div>
                <p class="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">SKU</p>
                <h3 class="text-2xl font-semibold text-[#1F2937]">{{ selectedProduct.sku }}</h3>
                <p class="text-lg text-[#6B7280]">{{ selectedProduct.name }}</p>
              </div>
            </div>
            <button
              @click="openEditModal(selectedProduct)"
              class="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F3F4F6]"
            >
              编辑商品
            </button>
          </div>

          <dl class="grid grid-cols-2 gap-4 text-sm lg:grid-cols-5">
            <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <dt class="text-xs text-[#94A3B8]">成本</dt>
              <dd class="mt-1 font-semibold text-[#1F2937]">{{ selectedProduct.cost ? `¥ ${selectedProduct.cost.toFixed(2)}` : 'N/A' }}</dd>
            </div>
            <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <dt class="text-xs text-[#94A3B8]">重量</dt>
              <dd class="mt-1 font-semibold text-[#1F2937]">{{ selectedProduct.weightKg ? `${selectedProduct.weightKg} kg` : 'N/A' }}</dd>
            </div>
            <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <dt class="text-xs text-[#94A3B8]">体积</dt>
              <dd class="mt-1 font-semibold text-[#1F2937]">{{ selectedProduct.volumeM3 ? `${selectedProduct.volumeM3} m³` : 'N/A' }}</dd>
            </div>
            <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <dt class="text-xs text-[#94A3B8]">尺寸</dt>
              <dd class="mt-1 font-semibold text-[#1F2937]">{{ selectedProduct.dimensionsMm ? `${selectedProduct.dimensionsMm} mm` : 'N/A' }}</dd>
            </div>
            <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3">
              <dt class="text-xs text-[#94A3B8]">分类</dt>
              <dd class="mt-1 font-semibold text-[#1F2937]">{{ selectedProduct.category }}</dd>
            </div>
          </dl>

          <div>
            <div class="flex items-center justify-between">
              <h4 class="text-lg font-semibold text-[#1F2937]">店铺售价 (价格同步)</h4>
              <span class="text-xs text-[#94A3B8]">仅显示有权限的店铺</span>
            </div>
            <p v-if="filteredListings.length === 0" class="mt-2 text-sm text-[#6B7280]">
              该商品未在您负责运营的国家 [{{ authStore.operatedCountries.join(', ') }}] 的店铺中上架。
            </p>

            <div class="mt-4 space-y-3 overflow-y-auto pr-1 max-h-[50vh]">
              <div
                v-for="listing in filteredListings"
                :key="listing.id"
                class="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-xs font-semibold text-[#94A3B8]">[{{ listing.store.country.code }}]</span>
                    <span class="ml-2 text-sm font-medium text-[#1F2937]">{{ listing.store.name }}</span>
                  </div>
                  <div class="w-48">
                    <div v-if="editingListingId !== listing.id" class="flex items-center justify-end gap-3">
                      <span class="text-lg font-bold text-[#1F2937]">
                        {{ listing.currentPrice.toFixed(2) }}
                      </span>
                      <button
                        v-if="canManagePrice(listing.store.countryCode)"
                        @click="startEditPrice(listing)"
                        class="text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB]"
                      >
                        编辑
                      </button>
                      <span v-else class="text-xs text-[#94A3B8]">无权限</span>
                    </div>

                    <div v-else class="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        v-model="editPrice"
                        class="form-input w-full"
                        ref="editPriceInput"
                      />
                      <button @click="savePrice(listing.id)" :disabled="isSavingPrice" class="text-sm font-semibold text-[#10B981]">
                        保存
                      </button>
                      <button @click="cancelEditPrice" class="text-sm font-semibold text-red-500">
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="priceSyncError" class="mt-2 text-sm text-red-600">{{ priceSyncError }}</p>
          </div>
        </div>
      </section>
    </div>

    <ProductFormModal
      :is-open="isModalOpen"
      :product-to-edit-id="productToEditId"
      @close="closeModal"
      @product-created="handleProductChange"
      @product-updated="handleProductChange"
    />
  </div>
</template>


<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import ProductFormModal from './ProductFormModal.vue'; // (复用)

// --- 状态 (State) ---
const products = ref([]);
const selectedProduct = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');

const authStore = useAuthStore();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

// --- 价格同步 (Price Sync) ---
const editingListingId = ref(null);
const editPrice = ref(0);
const editPriceInput = ref(null); // (用于自动聚焦)
const isSavingPrice = ref(false);
const priceSyncError = ref('');

// --- 弹窗 (Modal) ---
const isModalOpen = ref(false);
const productToEditId = ref(null);


// --- 1. 数据获取 ---
async function fetchProducts() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    // ⬇️ 【修复】 
    // (调用我们刚刚在 data.js 中创建的新 API)
    const response = await apiClient.get('/products-list');
    // ⬆️ 【修复】
    
    products.value = response.data;
  } catch (error) {
    console.error('获取在售商品列表失败:', error);
    errorMessage.value = '获取商品列表失败。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchProducts();
});


// --- 2. 交互 (Selection & Filtering) ---
function selectProduct(product) {
  selectedProduct.value = product;
  cancelEditPrice(); // (切换商品时，取消价格编辑)
}

function getProductImageUrl(imageUrl) {
  if (!imageUrl) return 'https://via.placeholder.com/150';
  return `${apiBaseUrl}${imageUrl}`;
}

// (不变) (核心) 权限：只显示运营国家的店铺售价
const filteredListings = computed(() => {
  if (!selectedProduct.value) return [];
  
  const { listings } = selectedProduct.value;
  
  if (authStore.role === 'admin') {
    return listings.sort((a,b) => a.store.countryCode.localeCompare(b.store.countryCode));
  }
  
  const userCountries = authStore.operatedCountries;
  return listings
    .filter(l => userCountries.includes(l.store.countryCode))
    .sort((a,b) => a.store.countryCode.localeCompare(b.store.countryCode));
});


// --- 3. 价格同步 (Price Sync) 逻辑 ---

// (不变) (权限) 检查是否有权修改价格
function canManagePrice(countryCode) {
  if (authStore.role === 'admin') return true;
  
  // (auth.js 和 auth.js 均已更新, 包含 supervisedCountries)
  if (authStore.supervisedCountries) {
     return authStore.supervisedCountries.includes(countryCode);
  }
  return false;
}

function startEditPrice(listing) {
  editingListingId.value = listing.id;
  editPrice.value = listing.currentPrice;
  priceSyncError.value = '';
  // (自动聚焦到输入框)
  nextTick(() => {
    editPriceInput.value?.[0]?.focus();
  });
}

function cancelEditPrice() {
  editingListingId.value = null;
  priceSyncError.value = '';
}

async function savePrice(listingId) {
  isSavingPrice.value = true;
  priceSyncError.value = '';
  
  try {
    // ⬇️ 【修复】 
    // (调用我们刚刚在 data.js 中创建的新 API)
    const response = await apiClient.put(`/listings/${listingId}`, {
      currentPrice: editPrice.value
    });
    // ⬆️ 【修复】
    
    // (成功) 在前端立即更新数据，避免重新加载
    const productIndex = products.value.findIndex(p => p.id === selectedProduct.value.id);
    if (productIndex !== -1) {
      const listingIndex = products.value[productIndex].listings.findIndex(l => l.id === listingId);
      if (listingIndex !== -1) {
        // (用 API 返回的新数据覆盖)
        products.value[productIndex].listings[listingIndex] = response.data;
      }
    }
    
    cancelEditPrice();
    
  } catch (error) {
    console.error('价格同步失败:', error);
    priceSyncError.value = error.response?.data?.error || '保存失败';
  } finally {
    isSavingPrice.value = false;
  }
}


// --- 4. 商品弹窗 (Modal) 逻辑 ---
function openCreateModal() {
  productToEditId.value = null;
  isModalOpen.value = true;
}

function openEditModal(product) {
  productToEditId.value = product.id;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  productToEditId.value = null;
}

// (当商品被创建或更新时)
async function handleProductChange() {
  const currentSelectedId = selectedProduct.value?.id;
  
  await fetchProducts(); // 重新加载所有数据
  
  // (如果正在编辑，更新 selectedProduct 的数据)
  if (currentSelectedId) {
    const updatedProduct = products.value.find(p => p.id === currentSelectedId);
    if (updatedProduct) {
      selectedProduct.value = updatedProduct;
    }
  }
  
  closeModal();
}

</script>

<style scoped>
/* (复用) */
.form-input {
  display: block;
  width: 100%;
  border-radius: 0.375rem; /* rounded-md */
  border: 1px solid #d4d4d4; /* border-stone-300 */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  padding: 0.5rem 0.75rem; 
}
.form-input:focus {
  border-color: #4f46e5; /* focus:border-indigo-500 */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3); /* focus:ring-indigo-500 */
  outline: none;
}
</style>
