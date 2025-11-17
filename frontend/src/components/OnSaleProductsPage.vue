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

    <section class="rounded-3xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <p v-if="isLoading" class="p-6 text-sm text-[#6B7280]">正在加载在售列表...</p>
      <p v-if="errorMessage" class="p-6 text-sm text-red-600">{{ errorMessage }}</p>

      <div v-if="!isLoading && listings.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#E5E7EB]">
          <thead class="bg-[#F9FAFB]">
            <tr>
              <th class="table-th">店铺主图</th>
              <th class="table-th">店铺标题</th>
              <th class="table-th">在售店铺</th>
              <th class="table-th">对应产品 (SKU)</th>
              <th class="table-th">售价 (当地)</th>
              <th class="table-th">售价 (RMB)</th>
              <th class="table-th">上周销量</th>
              <th class="table-th">本月销量</th>
              <th class="table-th">总销量</th>
              <th class="table-th">商品链接</th>
              <th class="table-th">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-[#E5E7EB]">
            <tr v-for="listing in listings" :key="listing.id" class="hover:bg-[#F9FAFB]">
              
              <td class="table-td">
                <img :src="getListingImageUrl(listing.storeImageUrl)" alt="listing" class="h-12 w-12 rounded-lg object-cover shadow" />
              </td>
              
              <td class="table-td max-w-xs truncate" :title="listing.storeTitle">
                {{ listing.storeTitle || 'N/A' }}
              </td>
              
              <td class="table-td">
                <div class="font-medium text-[#1F2937]">[{{ listing.store.country.code }}]</div>
                <div class="text-xs text-[#6B7280]">{{ listing.store.name }}</div>
              </td>

              <td class="table-td">
                <div class="font-medium text-[#1F2937]">{{ listing.product.sku }}</div>
                <div class="text-xs text-[#6B7280]">{{ listing.product.publicName || listing.product.name }}</div>
              </td>

              <td class="table-td font-semibold text-[#1D4ED8]">
                {{ formatCurrency(listing.currentPrice, listing.store.countryCode) }}
              </td>
              
              <td class="table-td font-semibold text-[#1F2937]">
                ¥ {{ listing.currentPriceRmb.toFixed(2) }}
              </td>
              
              <td class="table-td">{{ listing.lastWeekSales }}</td>
              <td class="table-td">{{ listing.thisMonthSales }}</td>
              <td class="table-td font-bold">{{ listing.totalSales }}</td>
              
              <td class="table-td">
                <a v-if="listing.platformUrl" :href="listing.platformUrl" target="_blank" rel="noopener noreferrer" 
                   class="text-[#3B82F6] hover:text-[#2563EB] hover:underline">
                  跳转
                </a>
                <span v-else class="text-[#94A3B8]">未提供</span>
              </td>

              <td class="table-td">
                <button
                  @click="openEditModal(listing)"
                  class="text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB]"
                >
                  编辑
                </button>
                </td>

            </tr>
          </tbody>
        </table>
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
import { ref, onMounted } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
// ⬇️ 【修改】 导入新弹窗
import StoreListingFormModal from './StoreListingFormModal.vue';

// --- 状态 (State) ---
const listings = ref([]); // (原: products)
const isLoading = ref(true);
const errorMessage = ref('');

const authStore = useAuthStore();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

// --- 弹窗 (Modal) ---
const isModalOpen = ref(false);
const listingToEditId = ref(null); // (原: productToEditId)


// --- 1. 数据获取 ---
async function fetchListings() { // (原: fetchProducts)
  isLoading.value = true;
  errorMessage.value = '';
  try {
    // ⬇️ 【修改】 调用新的 API
    const response = await apiClient.get('/admin/store-listings');
    listings.value = response.data;
  } catch (error) {
    console.error('获取店铺在售列表失败:', error);
    errorMessage.value = '获取店铺在售列表失败。';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchListings();
});


// --- 2. 辅助函数 ---
function getListingImageUrl(imageUrl) {
  if (!imageUrl) return 'https://via.placeholder.com/150'; // 默认图片
  // (图片路径已在 P2 中修改为 /uploads/listings/)
  return `${apiBaseUrl}${imageUrl}`; 
}

// (根据国家代码格式化当地货币)
function formatCurrency(value, countryCode) {
  const currencyMap = {
    ID: 'IDR', VN: 'VND', TH: 'THB', MY: 'MYR', PH: 'PHP', SG: 'SGD',
  };
  const styleMap = {
    IDR: { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 },
    VND: { style: 'currency', currency: 'VND', maximumFractionDigits: 0 },
    THB: { style: 'currency', currency: 'THB' },
    MYR: { style: 'currency', currency: 'MYR' },
    PHP: { style: 'currency', currency: 'PHP' },
    SGD: { style: 'currency', currency: 'SGD' },
  };
  
  const currency = currencyMap[countryCode] || 'USD'; // 默认
  
  try {
    // (使用 Intl.NumberFormat 自动添加 Rp, ₫, ฿ 等符号)
    return new Intl.NumberFormat('en-US', styleMap[currency] || { style: 'currency', currency: currency }).format(value);
  } catch (e) {
    return value.toFixed(2); // (回退)
  }
}


// --- 3. 价格同步 (Price Sync) 逻辑 ---
// ⬇️ 【已删除】
// (旧的 inline-editing 逻辑 (editingListingId, editPrice, 等) 已被移除)
// (编辑功能现在统一由 StoreListingFormModal 处理)


// --- 4. 商品弹窗 (Modal) 逻辑 ---
function openCreateModal() {
  listingToEditId.value = null;
  isModalOpen.value = true;
}

function openEditModal(listing) {
  // (TODO: 编辑功能)
  // (目前 StoreListingFormModal 只实现了“创建”)
  // (要实现“编辑”，我们需要给 Modal 传入 listingToEditId 并让它 GET 详情)
  // (为简单起见，我们暂时只开放创建)
  alert('编辑功能尚未实现。请删除后重建。');
  // listingToEditId.value = listing.id;
  // isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  listingToEditId.value = null;
}

// (当商品被创建或更新时)
function handleListingCreated(newListing) {
  listings.value.unshift(newListing); // (添加到列表顶部)
  closeModal();
}

function handleListingUpdated(updatedListing) {
  // (用于未来实现编辑)
  const index = listings.value.findIndex(l => l.id === updatedListing.id);
  if (index !== -1) {
    listings.value[index] = updatedListing;
  }
  closeModal();
}

</script>

<style scoped>
/* (复用) 表格样式 */
.table-th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.table-td {
  padding: 0.75rem 1rem;
  white-space: nowrap;
  font-size: 0.875rem;
  color: #374151;
  vertical-align: middle;
}
.table-td.truncate {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>