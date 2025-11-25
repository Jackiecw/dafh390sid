<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-20">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <!-- 1. 错误状态 -->
              <div v-if="errorMessage" class="p-10 text-center">
                <p class="text-red-600 mb-4">{{ errorMessage }}</p>
                <button @click="closeModal" class="text-sm text-gray-500 underline">关闭</button>
              </div>

              <!-- 2. 加载状态 -->
              <div v-else-if="!detailOrder" class="p-10 text-center text-gray-500 relative">
                <!-- 增加一个关闭按钮，防止卡死时无法关闭 -->
                <button @click="closeModal" class="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                   <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <svg class="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                加载数据中...
              </div>
              
              <!-- 3. 正常显示内容 -->
              <div v-else class="space-y-6">
                <div class="flex justify-between items-start border-b border-gray-100 pb-4">
                  <div>
                    <DialogTitle as="h3" class="text-lg font-bold text-gray-900">
                      {{ detailOrder.orderCode }} 
                      <span class="text-sm font-normal text-gray-500 ml-2">{{ detailOrder.skuName }}</span>
                    </DialogTitle>
                    <p class="text-xs text-gray-500 mt-1">
                      批次: {{ detailOrder.batchCode }} | 地区: {{ detailOrder.salesRegion }}
                    </p>
                  </div>
                  <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
                    <span class="sr-only">Close</span>
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <!-- 状态更新区域 -->
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 class="text-sm font-bold text-gray-900 mb-3">状态流转</h4>
                  <div class="space-y-2 max-h-48 overflow-y-auto pr-2 mb-4">
                    <div v-for="step in statusSteps" :key="step.key" class="flex items-center justify-between text-sm">
                      <div class="flex items-center gap-3">
                        <div :class="['w-2 h-2 rounded-full', stepState(step.key).isDone ? 'bg-green-500' : 'bg-gray-300']"></div>
                        <span :class="stepState(step.key).isDone ? 'text-gray-900 font-medium' : 'text-gray-400'">{{ step.label }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500" v-if="stepState(step.key).date">
                          {{ stepState(step.key).date }} ({{ stepState(step.key).operator }})
                        </span>
                        <div v-if="isAdmin" class="flex gap-1">
                           <input 
                             type="date" 
                             v-model="statusDateInputs[step.key]" 
                             class="text-xs border rounded px-1 py-0.5"
                           />
                           <button 
                             @click="updateStatus(step.key)"
                             class="text-xs bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-50"
                           >
                             更新
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 详情编辑区域 (物流信息) -->
                <div>
                  <h4 class="text-sm font-bold text-gray-900 mb-3">物流与费用信息</h4>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <!-- 可编辑字段 -->
                    <div class="form-group">
                      <label>物流服务商</label>
                      <input v-model="form.logisticsProvider" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group">
                      <label>计费方式</label>
                      <select v-model="form.billingMethod" :disabled="isLocked" class="form-input-sm">
                        <option value="">未定</option>
                        <option value="BY_CBM">按体积</option>
                        <option value="BY_WEIGHT">按重量</option>
                        <option value="FLAT_FEE">一口价</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>物流单价</label>
                      <input type="number" v-model="form.logisticsUnitPrice" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group">
                      <label>计费体积 (CBM)</label>
                      <input type="number" v-model="form.billingCbm" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group">
                      <label>计费重量 (KG)</label>
                      <input type="number" v-model="form.billingKg" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group">
                      <label class="text-indigo-600 font-bold">物流费用 (计算/填)</label>
                      <input type="number" v-model="form.logisticsFee" :disabled="isLocked" class="form-input-sm border-indigo-300 bg-indigo-50" />
                    </div>
                    <!-- 基础信息 (只读/部分可改) -->
                    <div class="form-group">
                      <label>单价 (Locked if Warehoused)</label>
                      <input type="number" v-model="form.unitPrice" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group">
                      <label>数量</label>
                      <input type="number" v-model="form.quantity" :disabled="isLocked" class="form-input-sm" />
                    </div>
                    <div class="form-group col-span-3">
                      <label>备注</label>
                      <input v-model="form.notes" class="form-input-sm w-full" />
                    </div>
                  </div>
                  
                  <div class="mt-4 flex justify-end">
                    <p v-if="isLocked" class="text-xs text-red-500 mr-auto self-center">已入仓订单，关键财务字段已锁定。</p>
                    <button 
                      v-if="isAdmin"
                      @click="saveDetails"
                      class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      保存信息
                    </button>
                  </div>
                </div>

              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, computed, reactive } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  orderId: { type: String, required: true }
});
const emit = defineEmits(['close', 'refresh']);

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');
const detailOrder = ref(null);
const errorMessage = ref('');
const statusDateInputs = reactive({});

const form = reactive({
  logisticsProvider: '',
  billingMethod: '',
  logisticsUnitPrice: null,
  billingCbm: null,
  billingKg: null,
  logisticsFee: null,
  unitPrice: null,
  quantity: null,
  notes: ''
});

const statusSteps = [
  { key: 'IN_PRODUCTION', label: '生产中' },
  { key: 'PRODUCTION_DONE', label: '生产完成' },
  { key: 'SHIPPED_OUT', label: '已出库' },
  { key: 'CONTAINER_LOADED', label: '已装柜' },
  { key: 'EXPORTED', label: '出口' },
  { key: 'IN_TRANSIT', label: '运输' },
  { key: 'IMPORTED', label: '进口' },
  { key: 'DELIVERING', label: '派送' },
  { key: 'WAREHOUSED', label: '入仓' },
];

const isLocked = computed(() => detailOrder.value?.status === 'WAREHOUSED');

// 获取详情
async function fetchDetail() {
  if (!props.orderId) return;
  
  // 重置状态
  detailOrder.value = null;
  errorMessage.value = '';
  
  try {
    const res = await apiClient.get(`/production/orders/${props.orderId}`);
    detailOrder.value = res.data;
    // 初始化表单
    Object.assign(form, {
      logisticsProvider: res.data.logisticsProvider || '',
      billingMethod: res.data.billingMethod || '',
      logisticsUnitPrice: res.data.logisticsUnitPrice,
      billingCbm: res.data.billingCbm,
      billingKg: res.data.billingKg,
      logisticsFee: res.data.logisticsFee,
      unitPrice: res.data.unitPrice,
      quantity: res.data.quantity,
      notes: res.data.notes || ''
    });
    // 初始化日期输入
    statusSteps.forEach(step => {
      // 默认填今天，除非已有时间
      statusDateInputs[step.key] = new Date().toISOString().split('T')[0];
    });
  } catch (e) { 
    console.error(e);
    errorMessage.value = e.response?.data?.error || '获取详情失败，可能是服务器错误或数据不一致。';
  }
}

// 关键修复：添加 immediate: true，确保弹窗打开（mounted）时立即触发加载
watch(() => props.isOpen, (val) => {
  if (val) fetchDetail();
}, { immediate: true });

function stepState(key) {
  if (!detailOrder.value) return {};
  const event = detailOrder.value.statusEvents.find(e => e.status === key);
  return {
    isDone: !!event,
    date: event ? new Date(event.occurredAt).toLocaleDateString() : '',
    operator: event?.createdBy?.nickname || ''
  };
}

async function updateStatus(status) {
  if (!confirm('确认更新状态？')) return;
  try {
    await apiClient.post(`/admin/production/orders/${props.orderId}/status`, {
      status,
      occurredAt: statusDateInputs[status]
    });
    await fetchDetail();
    emit('refresh');
  } catch (e) {
    alert(e.response?.data?.error || '更新失败');
  }
}

async function saveDetails() {
  try {
    await apiClient.patch(`/admin/production/orders/${props.orderId}`, form);
    alert('保存成功');
    emit('refresh');
    closeModal();
  } catch (e) {
    alert(e.response?.data?.error || '保存失败');
  }
}

function closeModal() { emit('close'); }
</script>

<style scoped>
.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}
.form-input-sm {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}
.form-input-sm:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
</style>