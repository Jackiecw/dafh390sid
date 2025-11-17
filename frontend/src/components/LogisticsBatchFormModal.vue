<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-gray-900"
              >
                新建生产物流批次
              </DialogTitle>

              <div
                v-if="isLoadingOptions"
                class="mt-4 p-6 text-center text-stone-500"
              >
                正在加载表单选项 (SKU/国家)...
              </div>

              <form v-else @submit.prevent="handleSubmit" class="mt-4">
                <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
                  <h4 class="md:col-span-4 text-sm font-semibold text-indigo-600 border-b pb-1">
                    1. 基本信息
                  </h4>
                  <div class="input-group">
                    <label for="batchNumber">批次号 *</label>
                    <input
                      type="text"
                      id="batchNumber"
                      v-model="formData.batchNumber"
                      placeholder="例如: ID0001"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="orderDate">订单日期 *</label>
                    <input
                      type="date"
                      id="orderDate"
                      v-model="formData.orderDate"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="countryCode">销售地 *</label>
                    <select id="countryCode" v-model="formData.countryCode" class="form-input">
                      <option disabled value="">请选择...</option>
                      <option
                        v-for="c in allCountries"
                        :key="c.code"
                        :value="c.code"
                      >
                        {{ c.name }} ({{ c.code }})
                      </option>
                    </select>
                  </div>

                  <h4 class="md:col-span-4 mt-4 text-sm font-semibold text-indigo-600 border-b pb-1">
                    2. 产品信息
                  </h4>
                  <div class="input-group md:col-span-2">
                    <label for="productId">SKU *</label>
                    <select id="productId" v-model="formData.productId" class="form-input">
                      <option disabled value="">请选择...</option>
                      <option v-for="p in allProducts" :key="p.id" :value="p.id">
                        {{ p.sku }} ({{ p.name }})
                      </option>
                    </select>
                  </div>
                  <div class="input-group">
                    <label for="productSpec">产品规格</label>
                    <input
                      type="text"
                      id="productSpec"
                      v-model="formData.productSpec"
                      placeholder="例: 同捆版"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="quantity">数量 *</label>
                    <input
                      type="number"
                      id="quantity"
                      v-model="formData.quantity"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="unitPrice">单价 *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="unitPrice"
                      v-model="formData.unitPrice"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="totalPrice">总价 *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="totalPrice"
                      :value="totalPrice"
                      disabled
                      class="form-input bg-gray-100"
                    />
                  </div>

                  <h4 class="md:col-span-4 mt-4 text-sm font-semibold text-indigo-600 border-b pb-1">
                    3. 生产与物流 (可选)
                  </h4>
                  <div class="input-group">
                    <label for="estimatedFactoryDate">预计出库日</label>
                    <input
                      type="date"
                      id="estimatedFactoryDate"
                      v-model="formData.estimatedFactoryDate"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="freightForwarder">货代</label>
                    <input
                      type="text"
                      id="freightForwarder"
                      v-model="formData.freightForwarder"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="totalCbm">总 CBM</label>
                    <input
                      type="number"
                      step="0.001"
                      id="totalCbm"
                      v-model="formData.totalCbm"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="totalKg">总 KG</label>
                    <input
                      type="number"
                      step="0.01"
                      id="totalKg"
                      v-model="formData.totalKg"
                      class="form-input"
                    />
                  </div>
                </div>

                <p v-if="errorMessage" class="mt-4 text-sm text-red-600">
                  {{ errorMessage }}
                </p>

                <div class="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    @click="closeModal"
                    class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    创建批次
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import apiClient from '../api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'batch-created']);

// --- 状态 ---
const defaultFormData = () => ({
  batchNumber: '',
  orderDate: new Date().toISOString().split('T')[0],
  productId: '',
  productSpec: '',
  countryCode: '',
  quantity: null,
  unitPrice: null,
  // (totalPrice 是计算属性)
  estimatedFactoryDate: null,
  freightForwarder: '',
  totalCbm: null,
  totalKg: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

// --- 下拉菜单选项 ---
const isLoadingOptions = ref(false);
const allProducts = ref([]);
const allCountries = ref([]);

// (计算总价)
const totalPrice = computed(() => {
  const qty = parseFloat(formData.value.quantity);
  const price = parseFloat(formData.value.unitPrice);
  if (!isNaN(qty) && !isNaN(price)) {
    return (qty * price).toFixed(2);
  }
  return 0;
});

// --- 数据获取 ---
async function fetchOptions() {
  isLoadingOptions.value = true;
  try {
    // (并行获取产品和国家)
    const [productsRes, countriesRes] = await Promise.all([
      apiClient.get('/admin/products'), // (使用你已有的 /admin/products)
      apiClient.get('/admin/countries'), // (使用你已有的 /admin/countries)
    ]);
    allProducts.value = productsRes.data;
    allCountries.value = countriesRes.data;
  } catch (error) {
    console.error('加载选项失败:', error);
    errorMessage.value = '无法加载 SKU 和国家列表，请联系管理员。';
  } finally {
    isLoadingOptions.value = false;
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      resetForm();
      if (allProducts.value.length === 0) {
        fetchOptions();
      }
    }
  }
);

// --- 提交 ---
async function handleSubmit() {
  errorMessage.value = '';

  try {
    const payload = {
      ...formData.value,
      // (将 null/空字符串 转为 null)
      productSpec: formData.value.productSpec || null,
      estimatedFactoryDate: formData.value.estimatedFactoryDate || null,
      freightForwarder: formData.value.freightForwarder || null,
      totalCbm: formData.value.totalCbm || null,
      totalKg: formData.value.totalKg || null,
      // (自动计算总价)
      totalPrice: parseFloat(totalPrice.value)
    };
    
    // (调用我们在阶段1创建的 API)
    const response = await apiClient.post(
      '/admin/logistics/batches',
      payload
    );
    
    emit('batch-created', response.data); // (通知父组件)
    closeModal();
  } catch (error) {
    console.error('创建批次失败:', error);
    if (error.response && error.response.data.details) {
      errorMessage.value = error.response.data.details.map(d => d.message).join('; ');
    } else {
      errorMessage.value = error.response?.data?.error || '操作失败';
    }
  }
}

function closeModal() {
  emit('close');
}
function resetForm() {
  formData.value = defaultFormData();
  errorMessage.value = '';
}
</script>

<style scoped>
/* (复用样式) */
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.input-group input,
.input-group select,
.input-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.form-input:disabled {
  background-color: #f3f4f6; /* bg-gray-100 */
}
</style>
