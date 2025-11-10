<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                修改支出数据
              </DialogTitle>
              
              <div v-if="isLoading" class="mt-4 p-6 text-center text-stone-500">
                正在加载表单选项...
              </div>

              <form v-if="!isLoading" @submit.prevent="handleSubmit" class="mt-4">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
                  <div class="space-y-2">
                    <label for="edit_expenseDate" class="form-label">支出日期 *</label>
                    <input type="date" id="edit_expenseDate" v-model="formData.expenseDate" required class="form-input" />
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_itemDescription" class="form-label">项目描述 *</label>
                    <input type="text" id="edit_itemDescription" v-model="formData.itemDescription" required class="form-input" />
                  </div>

                  <div class="space-y-2">
                    <label for="edit_amount" class="form-label">金额 (CNY) *</label>
                    <input type="number" step="0.01" id="edit_amount" v-model="formData.amount" required class="form-input" />
                  </div>

                  <div class="space-y-2">
                    <label for="edit_payer" class="form-label">付款方 *</label>
                    <input type="text" id="edit_payer" v-model="formData.payer" required class="form-input" />
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_payee" class="form-label">收款方 *</label>
                    <input type="text" id="edit_payee" v-model="formData.payee" required class="form-input" />
                  </div>

                  <div class="space-y-2">
                    <label for="edit_paymentMethod" class="form-label">付款方式 *</label>
                    <select id="edit_paymentMethod" v-model="formData.paymentMethod" required class="form-input">
                      <option v-for="opt in financeOptions.paymentMethods" :key="opt" :value="opt">
                        {{ paymentMethodMap[opt] || opt }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_country" class="form-label">归属国家 (可选)</label>
                    <select id="edit_country" v-model="selectedCountry" class="form-input">
                      <option value="">-- 公司支出 (无归属国家) --</option>
                      <option v-for="country in countryOptions" :key="country.code" :value="country.code">
                        {{ country.name }} ({{ country.code }})
                      </option>
                    </select>
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_store" class="form-label">归属店铺 (可选)</label>
                    <select id="edit_store" v-model="formData.storeId" 
                            :disabled="!selectedCountry || storeOptions.length === 0"
                            class="form-input disabled:bg-gray-100">
                      <option value="">-- 国家级支出 (无归属店铺) --</option>
                      <option v-for="store in storeOptions" :key="store.id" :value="store.id">
                        {{ store.name }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="space-y-2">
                    <label for="edit_invoiceStatus" class="form-label">票据状态 *</label>
                    <select id="edit_invoiceStatus" v-model="formData.invoiceStatus" required class="form-input">
                      <option v-for="opt in financeOptions.invoiceStatuses" :key="opt" :value="opt">
                        {{ invoiceStatusMap[opt] || opt }}
                      </option>
                    </select>
                  </div>

                  <div class="space-y-2 flex items-center pt-6">
                    <input type="checkbox" id="edit_isAdvancePayment" v-model="formData.isAdvancePayment" 
                           class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label for="edit_isAdvancePayment" class="ml-2 font-medium text-stone-700">是否垫付</label>
                  </div>

                  <div v-if="formData.isAdvancePayment" class="space-y-2">
                    <label for="edit_reimbursementDate" class="form-label">报销日期</label>
                    <input type="date" id="edit_reimbursementDate" v-model="formData.reimbursementDate" class="form-input" />
                  </div>
                  
                  <div class="space-y-2 md:col-span-2">
                    <label for="edit_notes" class="form-label">备注 (可选)</label>
                    <textarea id="edit_notes" rows="3" v-model="formData.notes" class="form-input"></textarea>
                  </div>

                </div>
                
                <p v-if="errorMessage" class="text-red-600 text-sm mt-4">
                  {{ errorMessage }}
                </p>

                <div class="mt-6 flex justify-end space-x-4">
                  <button type="button" @click="closeModal" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    取消
                  </button>
                  <button type="submit" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    保存更改
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
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  expenseToEdit: { type: Object, default: null }
});
const emit = defineEmits(['close', 'expense-updated']);

const authStore = useAuthStore();
const formData = ref({});
const isLoading = ref(false);
const errorMessage = ref('');

// ⬇️ --- 【新增】 中文翻译 ---
const paymentMethodMap = {
  ALIPAY: '支付宝',
  WECHAT_PAY: '微信支付',
  BANK_TRANSFER: '银行转账',
  CREDIT_CARD: '信用卡',
  CASH: '现金',
  OTHER: '其他'
};
const invoiceStatusMap = {
  NONE: '无票',
  REGULAR: '普票',
  SPECIAL: '专票'
};
// ⬆️ --- 【新增】 ---

// --- 级联菜单状态 ---
const allStores = ref([]);
const financeOptions = ref({ paymentMethods: [], invoiceStatuses: [] });
const selectedCountry = ref('');

// (辅助函数) 格式化日期 (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toISOString().split('T')[0];
}

// --- 级联菜单逻辑 (同 Form) ---
async function fetchStoresAndOptions() {
  isLoading.value = true;
  try {
    const [storesRes, optionsRes] = await Promise.all([
      apiClient.get('/admin/stores'),
      apiClient.get('/expenses/options')
    ]);
    allStores.value = storesRes.data;
    financeOptions.value = optionsRes.data;
  } catch (error)
 {
    errorMessage.value = '无法加载表单选项。';
  }
  isLoading.value = false;
}

const countryOptions = computed(() => {
  // (复用 SalesDataManagement 逻辑)
  const uniqueCountriesMap = new Map();
  allStores.value.forEach(store => {
    if (store.country) {
      uniqueCountriesMap.set(store.country.code, store.country);
    }
  });
  const allUniqueCountries = Array.from(uniqueCountriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  if (authStore.role === 'admin') return allUniqueCountries; 
  const userCountryCodes = authStore.supervisedCountries; 
  return allUniqueCountries.filter(country => userCountryCodes.includes(country.code));
});

const storeOptions = computed(() => {
  if (!selectedCountry.value) return [];
  return allStores.value
    .filter(store => store.countryCode === selectedCountry.value)
    .sort((a, b) => a.name.localeCompare(b.name));
});

// (级联) 重置
watch(selectedCountry, (newVal) => {
  // (防止在加载时被清空)
  if (newVal !== props.expenseToEdit?.store?.countryCode) {
    formData.value.storeId = '';
  }
});

// 监听是否垫付
watch(() => formData.value.isAdvancePayment, (isAdvance) => {
  if (!isAdvance) {
    formData.value.reimbursementDate = null;
  }
});

// --- 弹窗核心逻辑 ---
watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.expenseToEdit) {
    errorMessage.value = '';
    
    // 1. 加载所有选项
    await fetchStoresAndOptions();

    // 2. 复制数据到表单
    formData.value = {
      ...props.expenseToEdit,
      // (确保日期是 YYYY-MM-DD 格式)
      expenseDate: formatDateForInput(props.expenseToEdit.expenseDate),
      reimbursementDate: formatDateForInput(props.expenseToEdit.reimbursementDate),
      notes: props.expenseToEdit.notes || '',
      storeId: props.expenseToEdit.storeId || '' // ('' 对应 null)
    };

    // 3. (关键) 触发级联菜单
    selectedCountry.value = props.expenseToEdit.store?.countryCode || '';
  }
});

// --- 提交 ---
async function handleSubmit() {
  errorMessage.value = '';
  
  // (准备 payload，移除多余的嵌套对象)
  const payload = {
    ...formData.value,
    // (转为 null)
    storeId: formData.value.storeId || null,
    notes: formData.value.notes || null,
    reimbursementDate: formData.value.reimbursementDate || null,
  };
  
  // (确保日期是 YYYY-MM-DD)
  payload.expenseDate = new Date(payload.expenseDate).toISOString().split('T')[0];
  if (payload.reimbursementDate) {
    payload.reimbursementDate = new Date(payload.reimbursementDate).toISOString().split('T')[0];
  }

  // (移除不需要发送的字段)
  delete payload.store;
  delete payload.enteredBy;
  delete payload.canManage;
  delete payload.createdAt;

  try {
    const response = await apiClient.put(
      `/admin/expenses/${props.expenseToEdit.id}`, 
      payload
    );
    emit('expense-updated', response.data);
  } catch (error) {
    console.error('更新失败:', error);
    if (error.response && error.response.data.details) {
      errorMessage.value = error.response.data.details.map(d => d.message).join('; ');
    } else {
      errorMessage.value = error.response?.data?.error || '更新失败，请重试。';
    }
  }
}

function closeModal() {
  emit('close');
}

</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.form-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
</style>