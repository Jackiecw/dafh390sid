<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-stone-900">在售商品</h2>
      <button 
        @click="openCreateModal" 
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        + 新建商品
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div class="lg:col-span-1 space-y-4">
        <p v-if="isLoading" class="text-stone-500">正在加载商品列表...</p>
        <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

        <div class="grid grid-cols-2 lg:grid-cols-1 gap-4 max-h-[80vh] overflow-y-auto pr-2">
          <div 
            v-for="product in products" 
            :key="product.id"
            @click="selectProduct(product)"
            :class="[
              'p-4 bg-white rounded-lg shadow cursor-pointer transition-all',
              selectedProduct?.id === product.id 
                ? 'ring-2 ring-indigo-500' 
                : 'hover:shadow-md hover:bg-stone-50'
            ]"
          >
            <div class="flex items-center space-x-4">
              <img :src="getProductImageUrl(product.imageUrl)" alt="product" class="h-16 w-16 object-cover rounded shadow-sm">
              <div>
                <p class="font-bold text-stone-900">{{ product.sku }}</p>
                <p class="text-sm text-stone-600">{{ product.name }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="bg-white p-6 rounded-lg shadow-lg min-h-[400px]">
          
          <div v-if="!selectedProduct" class="flex items-center justify-center h-full text-stone-500">
            <p>← 请从左侧选择一个商品以查看详情</p>
          </div>

          <div v-else>
            <div class="pb-5 border-b border-stone-200">
              <div class="flex justify-between items-start">
                <div class="flex items-center space-x-4">
                  <img :src="getProductImageUrl(selectedProduct.imageUrl)" alt="product" class="h-24 w-24 object-cover rounded shadow-sm">
                  <div>
                    <h3 class="text-2xl font-bold text-stone-900">{{ selectedProduct.sku }}</h3>
                    <p class="text-lg text-stone-600">{{ selectedProduct.name }}</p>
                  </div>
                </div>
                <button 
                  @click="openEditModal(selectedProduct)" 
                  class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  编辑商品
                </button>
              </div>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <label class="block text-stone-500">成本</label>
                  <p class="font-semibold">{{ selectedProduct.cost ? `¥ ${selectedProduct.cost.toFixed(2)}` : 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-stone-500">重量</label>
                  <p class="font-semibold">{{ selectedProduct.weightKg ? `${selectedProduct.weightKg} kg` : 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-stone-500">体积</label>
                  <p class="font-semibold">{{ selectedProduct.volumeM3 ? `${selectedProduct.volumeM3} m³` : 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-stone-500">尺寸</label>
                  <p class="font-semibold">{{ selectedProduct.dimensionsMm ? `${selectedProduct.dimensionsMm} mm` : 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-stone-500">分类</label>
                  <p class="font-semibold">{{ selectedProduct.category }}</p>
                </div>
              </div>
              </div>

            <div class="mt-6">
              <h4 class="text-lg font-bold text-stone-900 mb-4">店铺售价 (价格同步)</h4>
              <p v-if="filteredListings.length === 0" class="text-sm text-stone-500">
                该商品未在您负责运营的国家 [{{ authStore.operatedCountries.join(', ') }}] 的店铺中上架。
              </p>
              
              <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                <div 
                  v-for="listing in filteredListings" 
                  :key="listing.id"
                  class="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <div>
                    <span class="text-xs font-semibold text-stone-500">[{{ listing.store.country.code }}]</span>
                    <span class="ml-2 font-medium text-stone-800">{{ listing.store.name }}</span>
                  </div>
                  
                  <div class="w-48">
                    <div v-if="editingListingId !== listing.id" class="flex items-center justify-end">
                      <span class="text-lg font-bold text-stone-800 mr-4">
                        {{ listing.currentPrice.toFixed(2) }}
                      </span>
                      <button 
                        v-if="canManagePrice(listing.store.countryCode)"
                        @click="startEditPrice(listing)"
                        class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        编辑
                      </button>
                      <span v-else class="text-xs text-gray-400">无权限</span>
                    </div>
                    
                    <div v-else class="flex items-center space-x-2">
                      <input 
                        type="number" 
                        step="0.01" 
                        v-model="editPrice" 
                        class="form-input w-full"
                        ref="editPriceInput"
                      />
                      <button @click="savePrice(listing.id)" :disabled="isSavingPrice" class="text-green-600 hover:text-green-900 text-sm font-medium">
                        保存
                      </button>
                      <button @click="cancelEditPrice" class="text-red-600 hover:text-red-900 text-sm font-medium">
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p v-if="priceSyncError" class="text-red-600 text-sm mt-2">{{ priceSyncError }}</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <ProductFormModal
    :is-open="isModalOpen"
    :product-to-edit-id="productToEditId" 
    @close="closeModal"
    @product-created="handleProductChange"
    @product-updated="handleProductChange" 
  />
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
    // (不变) 此 API (GET /api/admin/products-list) 
    // 已在后端自动返回所有新字段
    const response = await apiClient.get('/admin/products-list');
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
  // ⬇️ 【修复】
  // 你提供的 auth.js 中没有 supervisedCountries，
  // 但 UserManagement.vue 中有。
  // 我们检查 authStore 中是否有这个 getter
  if (authStore.supervisedCountries) {
     return authStore.supervisedCountries.includes(countryCode);
  }
  return false;
  // ⬆️ 【修复】
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
    const response = await apiClient.put(`/admin/listings/${listingId}`, {
      currentPrice: editPrice.value
    });
    
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