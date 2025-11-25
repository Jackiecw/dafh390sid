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
        <div class="flex min-h-full items-center justify-center p-4 text-center">
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

              <div v-if="isLoadingOptions" class="mt-4 p-6 text-center text-stone-500">
                正在加载表单选项 (SKU/国家)...
              </div>

              <form v-else @submit.prevent="handleSubmit" class="mt-4">
                <div class="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
                  <h4 class="md:col-span-4 text-sm font-semibold text-indigo-600 border-b pb-1">
                    1. 基本信息
                  </h4>
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
                        v-for="c in countryOptions"
                        :key="c.code"
                        :value="c.code"
                      >
                        {{ c.name }} ({{ c.code }})
                      </option>
                    </select>
                  </div>
                  <div class="md:col-span-2 input-group">
                    <label for="notes">批次备注</label>
                    <input
                      type="text"
                      id="notes"
                      v-model="formData.notes"
                      placeholder="可选"
                      class="form-input"
                    />
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
                    <label for="productColor">颜色 *</label>
                    <input
                      type="text"
                      id="productColor"
                      v-model="formData.productColor"
                      placeholder="例: 黑色"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="productSpec">产品规格 *</label>
                    <input
                      type="text"
                      id="productSpec"
                      v-model="formData.productSpec"
                      placeholder="例: 同捆版"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="plugSpec">插头 *</label>
                    <input
                      type="text"
                      id="plugSpec"
                      v-model="formData.plugSpec"
                      placeholder="例: 欧规"
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
                    <label for="unitPrice">单价 ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      id="unitPrice"
                      v-model="formData.unitPrice"
                      class="form-input"
                    />
                  </div>
                  <div class="input-group">
                    <label for="totalPrice">总价 ($) *</label>
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
                    3. 物流预填 (可选)
                  </h4>
                  <div class="input-group">
                    <label for="billingMethod">计费方式</label>
                    <select id="billingMethod" v-model="formData.billingMethod" class="form-input">
                      <option value="">未确定</option>
                      <option value="BY_CBM">按体积 (CBM)</option>
                      <option value="BY_WEIGHT">按重量 (KG)</option>
                      <option value="FLAT_FEE">一次性费用</option>
                    </select>
                  </div>

                  <!-- 动态显示的字段 -->
                  <div v-if="formData.billingMethod === 'BY_CBM'" class="input-group">
                    <label for="billingCbm">计费体积 (CBM)</label>
                    <input type="number" step="0.001" id="billingCbm" v-model="formData.billingCbm" class="form-input" />
                  </div>
                  <div v-if="formData.billingMethod === 'BY_WEIGHT'" class="input-group">
                    <label for="billingKg">计费重量 (KG)</label>
                    <input type="number" step="0.01" id="billingKg" v-model="formData.billingKg" class="form-input" />
                  </div>
                  <div v-if="formData.billingMethod && formData.billingMethod !== 'FLAT_FEE'" class="input-group">
                    <label for="logisticsUnitPrice">物流单价</label>
                    <input type="number" step="0.01" id="logisticsUnitPrice" v-model="formData.logisticsUnitPrice" class="form-input" />
                  </div>
                  
                  <div class="input-group">
                    <label for="logisticsFee">预估物流费</label>
                    <input
                      type="number"
                      step="0.01"
                      id="logisticsFee"
                      :value="estimatedLogisticsFee || formData.logisticsFee"
                      :disabled="formData.billingMethod && formData.billingMethod !== 'FLAT_FEE'"
                      @input="e => formData.logisticsFee = e.target.value"
                      class="form-input"
                      :class="{'bg-gray-100': formData.billingMethod && formData.billingMethod !== 'FLAT_FEE'}"
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
import useManagedCountries from '../composables/useManagedCountries';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'batch-created']);

const defaultFormData = () => ({
  orderDate: new Date().toISOString().split('T')[0],
  productId: '',
  countryCode: '',
  notes: '',
  productColor: '',
  productSpec: '',
  plugSpec: '',
  quantity: null,
  unitPrice: null,
  
  billingMethod: '',
  billingCbm: null,
  billingKg: null,
  logisticsUnitPrice: null,
  logisticsFee: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');
const isLoadingOptions = ref(false);
const allProducts = ref([]);
const {
  countries,
  fetchCountries,
  countriesError,
  isLoadingCountries,
} = useManagedCountries();

const countryOptions = computed(() =>
  countries.value.slice().sort((a, b) => a.name.localeCompare(b.name)),
);

const totalPrice = computed(() => {
  const qty = parseFloat(formData.value.quantity);
  const price = parseFloat(formData.value.unitPrice);
  if (!isNaN(qty) && !isNaN(price)) {
    return (qty * price).toFixed(2);
  }
  return 0;
});

const estimatedLogisticsFee = computed(() => {
  const method = formData.value.billingMethod;
  const unit = parseFloat(formData.value.logisticsUnitPrice);
  if (method === 'BY_CBM' && !isNaN(unit)) {
    const vol = parseFloat(formData.value.billingCbm);
    return !isNaN(vol) ? (vol * unit).toFixed(2) : null;
  }
  if (method === 'BY_WEIGHT' && !isNaN(unit)) {
    const w = parseFloat(formData.value.billingKg);
    return !isNaN(w) ? (w * unit).toFixed(2) : null;
  }
  return null;
});

async function fetchOptions() {
  isLoadingOptions.value = true;
  try {
    if (!countries.value.length && !isLoadingCountries.value) {
      await fetchCountries();
    }
    const productsRes = await apiClient.get('/admin/products');
    allProducts.value = productsRes.data;
    if (!formData.value.countryCode && countryOptions.value.length > 0) {
      formData.value.countryCode = countryOptions.value[0].code;
    }
    if (!formData.value.productId && allProducts.value.length > 0) {
      formData.value.productId = allProducts.value[0].id;
    }
  } catch (error) {
    console.error('加载选项失败:', error);
    errorMessage.value = countriesError.value || '无法加载 SKU 和国家列表';
  } finally {
    isLoadingOptions.value = false;
  }
}

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    resetForm();
    await fetchOptions();
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  
  const selectedProduct = allProducts.value.find(p => p.id === formData.value.productId);
  
  // 构建订单数组 (目前单批次单订单，后续可扩展)
  const orders = [{
    orderDate: formData.value.orderDate,
    productId: formData.value.productId,
    skuName: selectedProduct ? selectedProduct.sku : '',
    productColor: formData.value.productColor,
    productSpec: formData.value.productSpec,
    salesRegion: formData.value.countryCode,
    plugSpec: formData.value.plugSpec,
    quantity: Number(formData.value.quantity),
    unitPrice: Number(formData.value.unitPrice),
    totalPrice: Number(totalPrice.value),
    
    billingMethod: formData.value.billingMethod || null,
    billingCbm: formData.value.billingCbm ? Number(formData.value.billingCbm) : null,
    billingKg: formData.value.billingKg ? Number(formData.value.billingKg) : null,
    logisticsUnitPrice: formData.value.logisticsUnitPrice ? Number(formData.value.logisticsUnitPrice) : null,
    logisticsFee: estimatedLogisticsFee.value ? Number(estimatedLogisticsFee.value) : (formData.value.logisticsFee ? Number(formData.value.logisticsFee) : null)
  }];

  try {
    const payload = {
      countryCode: formData.value.countryCode,
      notes: formData.value.notes || null,
      orders
    };
    
    await apiClient.post('/admin/production/batches', payload);
    emit('batch-created');
    closeModal();
  } catch (error) {
    console.error('创建失败:', error);
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
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
}
.form-input {
  padding: 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.95rem;
}
.form-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
</style>