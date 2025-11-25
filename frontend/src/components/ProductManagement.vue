<template>
  <div class="space-y-8">
    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">Product Catalog</p>
          <h2 class="text-3xl font-semibold text-[#1F2937]">商品管理</h2>
          <p class="text-sm text-[#6B7280]">维护产品库，统一规格、成本与展示信息。</p>
        </div>
        <div class="flex gap-3">
          <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-right">
            <p class="text-xs text-[#94A3B8]">总商品数</p>
            <p class="text-xl font-semibold text-[#1F2937]">{{ products.length }}</p>
          </div>
          <div class="rounded-2xl bg-[#F9FAFB] px-4 py-3 text-right">
            <p class="text-xs text-[#94A3B8]">覆盖分类</p>
            <p class="text-xl font-semibold text-[#1F2937]">{{ categoryOptions.length }}</p>
          </div>
          <button
            @click="openModal"
            class="rounded-2xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2563EB]"
          >
            + 新建商品
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-0 shadow-sm">
      <div class="flex flex-col gap-3 px-6 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div class="flex flex-1 items-center rounded-2xl border border-[#E2E8F0] bg-white px-4 py-2 shadow-sm">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索商品名称 / SKU"
              class="w-full border-none bg-transparent text-sm text-[#1F2937] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>
          <div class="flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#475569] shadow-sm">
            <span>分类</span>
            <select
              v-model="selectedCategory"
              class="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1 text-sm text-[#1F2937] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="ALL">全部</option>
              <option v-for="category in categoryOptions" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>
        </div>
        <div class="text-sm text-[#94A3B8]">共 {{ filteredProducts.length }} 条匹配结果</div>
      </div>

      <div class="px-6 pb-6">
        <p v-if="isLoading" class="py-6 text-sm text-[#6B7280]">正在加载商品列表...</p>
        <p v-else-if="errorMessage" class="py-6 text-sm text-red-600">{{ errorMessage }}</p>
        <p v-else-if="filteredProducts.length === 0" class="py-6 text-sm text-[#6B7280]">
          暂无符合条件的商品，调整筛选或点击右上角创建新商品。
        </p>

        <div v-else class="flex flex-col gap-6 lg:flex-row">
          <!-- Product List (Hidden on mobile if detail is shown) -->
          <aside 
            class="lg:w-5/12 xl:w-1/3 flex flex-col gap-3"
            :class="{ 'hidden lg:flex': showMobileDetail }"
          >
            <div class="flex-1 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFF] p-3 shadow-inner flex flex-col">
              <p class="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">产品列表</p>
              <div class="flex-1 overflow-y-auto pr-1 min-h-[50vh] space-y-3">
                <button
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="w-full rounded-2xl border bg-white px-4 py-3 text-left transition"
                  :class="
                    selectedProductId === product.id
                      ? 'border-[#2563EB] shadow-lg shadow-blue-100'
                      : 'border-transparent hover:border-[#CBD5F5] hover:shadow'
                  "
                  @click="selectProduct(product.id)"
                >
                  <div class="flex items-start gap-4">
                    <img
                      :src="getImageUrl(product.imageUrl)"
                      alt="product"
                      class="h-16 w-16 flex-shrink-0 rounded-xl border border-[#E5E7EB] object-cover shadow"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#1F2937] truncate">
                        {{ product.name || '未命名商品' }}
                      </p>
                      <p class="mt-1 text-xs text-[#64748B]">
                        SKU：{{ product.sku || '未填写' }}
                      </p>
                      <p class="text-xs text-[#94A3B8] truncate">
                        {{ product.category || '未分类' }}
                      </p>
                      <p class="mt-2 text-sm font-semibold text-[#2563EB]">
                        {{ product.cost ? `¥ ${product.cost.toFixed(2)}` : '未设置成本' }}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          <!-- Product Detail (Full screen on mobile) -->
          <article
            v-if="selectedProduct"
            class="flex-1 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-lg shadow-blue-50"
            :class="{ 'hidden lg:block': !showMobileDetail }"
          >
            <!-- Mobile Back Button -->
            <div class="mb-4 lg:hidden">
              <button 
                @click="clearSelection"
                class="flex items-center text-sm text-[#6B7280] hover:text-[#1F2937]"
              >
                <ArrowLeftIcon class="mr-1 h-4 w-4" />
                返回列表
              </button>
            </div>

            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="flex items-start gap-4">
                <img
                  :src="getImageUrl(selectedProduct.imageUrl)"
                  alt="product"
                  class="h-24 w-24 flex-shrink-0 rounded-2xl border border-[#E5E7EB] object-cover"
                />
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#94A3B8]">
                    {{ selectedProduct.category || '未分类' }}
                  </p>
                  <h3 class="text-2xl font-semibold text-[#111827]">
                    {{ selectedProduct.name || '未命名商品' }}
                  </h3>
                  <p class="text-sm text-[#6B7280]">
                    对外型号：{{ selectedProduct.publicName || '未填写' }}
                  </p>
                </div>
              </div>
              <div class="flex gap-3">
                <button
                  class="rounded-2xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-[#F9FAFB]"
                  @click="openModal"
                >
                  新建商品
                </button>
                <button
                  class="rounded-2xl bg-[#EEF2FF] px-4 py-2 text-sm font-semibold text-[#4338CA] hover:bg-[#E0E7FF]"
                  @click="handleEdit(selectedProduct)"
                >
                  编辑参数
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-4 rounded-3xl border border-[#F1F5F9] bg-[#F8FBFF] p-5 text-sm text-[#475569] sm:grid-cols-2">
              <div>
                <p class="text-xs text-[#94A3B8]">内部型号 (SKU)</p>
                <p class="text-base font-semibold text-[#111827]">{{ selectedProduct.sku || '未填写' }}</p>
              </div>
              <div>
                <p class="text-xs text-[#94A3B8]">成本 (¥)</p>
                <p class="text-base font-semibold text-[#111827]">
                  {{ selectedProduct.cost ? selectedProduct.cost.toFixed(2) : '未设置' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-[#94A3B8]">重量 (kg)</p>
                <p class="text-base font-semibold text-[#111827]">
                  {{ selectedProduct.weightKg ? selectedProduct.weightKg.toFixed(2) : '未填写' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-[#94A3B8]">尺寸 (mm)</p>
                <p class="text-base font-semibold text-[#111827]">
                  {{ formatDimensions(selectedProduct) }}
                </p>
              </div>
            </div>

            <div class="mt-6 grid gap-4 text-sm text-[#475569] md:grid-cols-2">
              <div class="space-y-3 rounded-2xl border border-[#F1F5F9] p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">显示与光学</p>
                <InfoRow label="分辨率" :value="selectedProduct.resolution" />
                <InfoRow label="亮度 (ANSI)" :value="formatNumber(selectedProduct.brightnessAnsi)" />
                <InfoRow label="亮度均匀度 (%)" :value="formatNumber(selectedProduct.brightnessUniformity)" />
                <InfoRow label="光源亮度 (LM)" :value="formatNumber(selectedProduct.lightSourceBrightness)" />
                <InfoRow label="对比度" :value="selectedProduct.contrastRatio" />
                <InfoRow label="投射比" :value="selectedProduct.throwRatio" />
              </div>
              <div class="space-y-3 rounded-2xl border border-[#F1F5F9] p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">硬件配置</p>
                <InfoRow label="芯片" :value="selectedProduct.chipset" />
                <InfoRow label="内存/存储" :value="selectedProduct.ramRom" />
                <InfoRow label="操作系统" :value="selectedProduct.os || '未填写'" />
                <InfoRow label="对焦方式" :value="selectedProduct.focusMethod || '未填写'" />
                <InfoRow label="梯形校正" :value="selectedProduct.keystone || '未填写'" />
              </div>
            </div>

            <div class="mt-6 grid gap-4 text-sm text-[#475569] md:grid-cols-2">
              <div class="space-y-3 rounded-2xl border border-[#F1F5F9] p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">功能特性</p>
                <InfoRow label="云台" :value="formatBoolean(selectedProduct.hasGimbal)" />
                <InfoRow label="自动避障" :value="formatBoolean(selectedProduct.autoObstacle)" />
                <InfoRow label="自动入幕" :value="formatBoolean(selectedProduct.autoScreenFit)" />
                <InfoRow label="WIFI 版本" :value="selectedProduct.wifiVersion || '未填写'" />
                <InfoRow label="蓝牙版本" :value="selectedProduct.bluetoothVersion || '未填写'" />
              </div>
              <div class="space-y-3 rounded-2xl border border-[#F1F5F9] p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">说明</p>
                <p class="rounded-2xl bg-[#F8FAFF] p-4 text-sm text-[#475569] min-h-[120px] whitespace-pre-wrap">
                  {{ selectedProduct.description || '暂无描述，点击上方编辑按钮可补充产品说明。' }}
                </p>
              </div>
            </div>
          </article>

          <article
            v-else
            class="flex-1 rounded-3xl border border-dashed border-[#CBD5F5] bg-[#F8FAFF] p-6 text-center text-[#64748B]"
            :class="{ 'hidden lg:block': showMobileDetail }"
          >
            请选择左侧的商品以查看详细信息。
          </article>
        </div>
      </div>
    </section>
  </div>

  <ProductFormModal
    :is-open="isModalOpen"
    :product-to-edit-id="currentProductToEditId"
    @close="closeModal"
    @product-created="handleProductCreated"
    @product-updated="handleProductUpdated"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch, defineComponent, h } from 'vue';
import apiClient from '../api';
import ProductFormModal from './ProductFormModal.vue';
import { ArrowLeftIcon } from '@heroicons/vue/20/solid';

const products = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isModalOpen = ref(false);
const currentProductToEditId = ref(null);
const selectedProductId = ref(null);
const searchKeyword = ref('');
const selectedCategory = ref('ALL');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

// Mobile state
const showMobileDetail = ref(false);

const categoryOptions = computed(() => {
  const set = new Set();
  products.value.forEach((product) => {
    if (product.category) set.add(product.category);
  });
  return Array.from(set);
});

const filteredProducts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  return products.value.filter((product) => {
    const matchesKeyword =
      !keyword ||
      [product.name, product.publicName, product.sku]
        .filter(Boolean)
        .map((txt) => txt.toLowerCase())
        .some((field) => field.includes(keyword));
    const matchesCategory = selectedCategory.value === 'ALL' || product.category === selectedCategory.value;
    return matchesKeyword && matchesCategory;
  });
});

const selectedProduct = computed(
  () => filteredProducts.value.find((product) => product.id === selectedProductId.value) || null,
);

watch(filteredProducts, (items) => {
  if (!items.length) {
    selectedProductId.value = null;
    return;
  }
  // Only auto-select on desktop or if we already have a selection
  // On mobile, we might want to start with no selection to show list
  if (!selectedProductId.value || !items.some((item) => item.id === selectedProductId.value)) {
    // On desktop, auto-select first. On mobile, maybe not?
    // For simplicity, we auto-select first, but showMobileDetail starts false.
    selectedProductId.value = items[0].id;
  }
});

async function fetchProducts(focusId = null) {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get('/admin/products');
    products.value = response.data || [];

    if (!products.value.length) {
      selectedProductId.value = null;
    } else if (focusId && products.value.some((item) => item.id === focusId)) {
      selectedProductId.value = focusId;
    } else if (!selectedProductId.value || !products.value.some((item) => item.id === selectedProductId.value)) {
      selectedProductId.value = products.value[0].id;
    }
  } catch (error) {
    errorMessage.value = '获取商品列表失败';
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchProducts);

function getImageUrl(imageUrl) {
  if (!imageUrl) return 'https://via.placeholder.com/150?text=Product';
  return `${apiBaseUrl}${imageUrl}`;
}

function openModal() {
  currentProductToEditId.value = null;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  currentProductToEditId.value = null;
}

function selectProduct(id) {
  selectedProductId.value = id;
  showMobileDetail.value = true; // Switch to detail view on mobile
}

function clearSelection() {
  showMobileDetail.value = false; // Back to list view on mobile
}

function handleProductCreated(newProduct) {
  fetchProducts(newProduct?.id);
  closeModal();
}

function handleEdit(product) {
  currentProductToEditId.value = product.id;
  isModalOpen.value = true;
}

function handleProductUpdated(updatedProduct) {
  fetchProducts(updatedProduct?.id || selectedProductId.value);
  closeModal();
}

async function handleDelete(product) {
  if (!confirm(`确定要删除「${product.sku || '未命名 SKU'} / ${product.name || '未命名商品'}」吗？`)) {
    return;
  }
  try {
    await apiClient.delete(`/admin/products/${product.id}`);
    fetchProducts();
  } catch (error) {
    alert(error.response?.data?.error || '删除失败，请稍后重试');
  }
}

const formatNumber = (value) => (value || value === 0 ? value : '未填写');
const formatDimensions = (product) => {
  if (!product) return '未填写';
  if (product.lengthMm && product.widthMm && product.heightMm) {
    return `${product.lengthMm} × ${product.widthMm} × ${product.heightMm}`;
  }
  return '未填写';
};
const formatBoolean = (value) => (value ? '是' : '否');

const InfoRow = defineComponent({
  name: 'InfoRow',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: '' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex justify-between text-sm text-[#475569]' }, [
        h('span', { class: 'text-[#94A3B8]' }, props.label),
        h(
          'span',
          { class: 'font-semibold text-[#111827]' },
          props.value === 0 ? '0' : props.value || '未填写',
        ),
      ]);
  },
});
</script>
