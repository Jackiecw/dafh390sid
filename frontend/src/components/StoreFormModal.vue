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
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div v-if="isLoadingOptions" class="col-span-2 text-stone-500">
                  正在加载表单选项...
                </div>

                <template v-if="!isLoadingOptions">
                  <div class="input-group col-span-2">
                    <label for="name">店铺名称 (易读) *</label>
                    <input 
                      type="text" 
                      id="name" 
                      v-model="formData.name"
                      placeholder="例如: Shopee 印尼 Mall 店"
                    />
                  </div>

                  <div class="input-group">
                    <label for="platform">平台 *</label>
                    <select id="platform" v-model="formData.platform">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.platforms" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>

                  <div class="input-group">
                    <label for="country">国家 *</label>
                    <select id="country" v-model="formData.countryCode">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in countriesList" :key="opt.code" :value="opt.code">
                        {{ opt.name }} ({{ opt.code }})
                      </option>
                    </select>
                  </div>
                  <div class="input-group">
                    <label for="status">状态 *</label>
                    <select id="status" v-model="formData.status">
                      <option disabled value="">请选择...</option>
                      <option v-for="opt in options.storeStatuses" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="input-group">
                    <label for="registeredAt">注册日期</label>
                    <input 
                      type="date" 
                      id="registeredAt" 
                      v-model="formData.registeredAt"
                    />
                  </div>

                  <div class="input-group col-span-2">
                    <label for="platformStoreId">平台店铺 ID (可选)</label>
                    <input 
                      type="text" 
                      id="platformStoreId" 
                      v-model="formData.platformStoreId"
                      placeholder="例如: 123456789"
                    />
                  </div>
                </template>
                
                <p v-if="errorMessage" class="text-red-600 text-sm col-span-2">
                  {{ errorMessage }}
                </p>
              </div>

              <div class="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  取消
                </button>
                <button
                  type="button"
                  @click="handleSubmit"
                  :disabled="isLoadingOptions"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
                >
                  {{ submitButtonText }}
                </button>
              </div>
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

// --- 1. Props 和 Emits (不变) ---
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  storeToEditId: {
    type: String,
    default: null,
  }
});
const emit = defineEmits(['close', 'store-created', 'store-updated']);

// --- 2. 内部状态 (修改) ---
const defaultFormData = () => ({
  name: '',
  platform: '',
  countryCode: '', // ⬅️ 【修改】 
  status: 'ACTIVE',
  platformStoreId: '',
  registeredAt: null,
});

const formData = ref(defaultFormData());
const errorMessage = ref('');

// (用于存储下拉菜单选项)
const options = ref({
  platforms: [],
  // countries: [], // (已删除)
  storeStatuses: [],
});
const countriesList = ref([]); // ⬅️ 【新增】
const isLoadingOptions = ref(false);

// (不变) 计算属性
const isEditMode = computed(() => !!props.storeToEditId);
const dialogTitle = computed(() => isEditMode.value ? '编辑店铺' : '创建新店铺');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建店铺');


// --- 3. 核心逻辑 (API 调用) (修改) ---

// ⬇️ 【新增】 获取国家列表
async function fetchCountries() {
  if (countriesList.value.length > 0) return;
  try {
    const response = await apiClient.get('/admin/countries');
    countriesList.value = response.data;
  } catch (error) {
    console.error('加载国家列表失败:', error);
    errorMessage.value = "无法加载国家选项，请重试。";
  }
}

// (获取下拉菜单选项) (修改)
async function fetchOptions() {
  // (不变)
  if (options.value.platforms.length > 0) return; 
  
  isLoadingOptions.value = true;
  
  // ⬇️ 【修改】
  //    我们现在并行获取 options (平台, 状态) 和 countries (国家列表)
  try {
    const [optionsResponse, countriesResponse] = await Promise.all([
      apiClient.get('/admin/management-options'),
      apiClient.get('/admin/countries')
    ]);
    
    options.value = optionsResponse.data;
    countriesList.value = countriesResponse.data;

  } catch (error) {
    console.error('加载表单选项失败:', error);
    errorMessage.value = "无法加载表单选项，请重试。";
  } finally {
    isLoadingOptions.value = false;
  }
}

// (获取单个店铺的详情) (修改)
async function fetchStoreDetails() {
  if (!isEditMode.value) return;
  try {
    const response = await apiClient.get(`/admin/stores/${props.storeToEditId}`);
    const store = response.data;
    
    formData.value = {
      name: store.name,
      platform: store.platform,
      countryCode: store.countryCode, // ⬅️ 【修改】
      status: store.status,
      platformStoreId: store.platformStoreId || '',
      registeredAt: store.registeredAt ? new Date(store.registeredAt).toISOString().split('T')[0] : null,
    };
  } catch (error) {
    console.error('获取店铺详情失败:', error);
    errorMessage.value = '无法加载店铺详情。';
  }
}


// (提交表单) (修改)
async function handleSubmit() {
  errorMessage.value = '';

  const payload = {
    ...formData.value,
    registeredAt: formData.value.registeredAt || null
    // ⬅️ (关键) `formData` 中现在是 `countryCode`，
    //    这与我们后端 `storeSchema` 期望的一致
  };

  try {
    if (isEditMode.value) {
      const response = await apiClient.put(`/admin/stores/${props.storeToEditId}`, payload);
      // ⬇️ 【修改】 返回的 response 仍然是 store 对象, 
      //    但我们需要在主页上显示 store.country.name
      //    因此我们必须重新获取列表
      //    (或者, 让 PUT /stores/:id 返回一个包含 country 的对象)
      //    (为了简单起见，我们先按原样发送，在下一个文件 `StoreManagement.vue` 中处理)
      
      // (为了正确更新UI, 我们需要返回包含country对象的数据)
      // (简单起见，我们让父组件重新加载)
      emit('store-updated'); // (修改) 不再发送数据，只发送信号
    } else {
      const response = await apiClient.post('/admin/stores', payload);
      emit('store-created', response.data); // (不变)
    }
    closeModal();
  } catch (error) {
    console.error('操作店铺失败:', error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络或联系管理员。';
    }
  }
}

// --- 4. 辅助函数 (修改) ---

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
    fetchOptions(); // (修改) 此函数现在也获取国家
    
    if (isEditMode.value) {
      fetchStoreDetails();
    }
  }
});

// (不变)
function closeModal() {
  emit('close');
}

// (不变)
function resetForm() {
  formData.value = defaultFormData();
  errorMessage.value = '';
}
</script>

<style scoped>
/* (不变) */
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
.input-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>