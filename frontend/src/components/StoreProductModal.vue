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
                为 <span class="font-bold text-indigo-600">{{ store?.name }}</span> 分配商品
              </DialogTitle>
              
              <p v-if="isLoading" class="mt-4 text-stone-500">正在加载商品列表...</p>
              
              <div v-if="!isLoading && allProducts.length > 0" class="mt-4 space-y-2 max-h-96 overflow-y-auto rounded-md border p-4">
                <div v-for="product in allProducts" :key="product.id" class="flex items-center">
                  <input 
                    type="checkbox" 
                    :id="'prod-' + product.id" 
                    :value="product.id" 
                    v-model="selectedProductIds"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label :for="'prod-' + product.id" class="ml-3 text-sm text-gray-700">
                    {{ product.name }} ({{ product.sku }})
                  </label>
                </div>
              </div>

              <p v-if="!isLoading && allProducts.length === 0" class="mt-4 text-stone-500">
                系统中还没有创建任何商品，请先前往“商品管理”创建。
              </p>

              <p v-if="errorMessage" class="text-red-600 text-sm mt-2">{{ errorMessage }}</p>

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
                  :disabled="isLoading"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
                >
                  保存分配
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
import { ref, watch } from 'vue';
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
  store: { type: Object, default: null } // 接收完整的 store 对象
});
const emit = defineEmits(['close']);

const allProducts = ref([]); // 存储所有商品 (GET /admin/products)
const selectedProductIds = ref([]); // v-model for checkboxes
const isLoading = ref(false);
const errorMessage = ref('');

// ⬇️ 【修改】
// (核心) 当弹窗打开时，获取所有商品和该店铺已选的商品
async function fetchData() {
  if (!props.store) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  allProducts.value = [];
  selectedProductIds.value = [];
  
  try {
    // 1. 获取所有可选的商品
    const productsPromise = apiClient.get('/admin/products');
    
    // 2. 获取该店铺已选的商品 (后端已修改 GET /stores/:id)
    const storePromise = apiClient.get(`/admin/stores/${props.store.id}`);
    
    const [productsResponse, storeResponse] = await Promise.all([productsPromise, storePromise]);
    
    // (所有可选商品)
    allProducts.value = productsResponse.data;
    
    // (预先勾选已选的)
    // ⬅️ 从 storeResponse.data.listings 读取
    selectedProductIds.value = storeResponse.data.listings.map(l => l.productId);

  } catch (error) {
    console.error("加载数据失败:", error);
    errorMessage.value = "加载商品或店铺数据失败。";
  } finally {
    isLoading.value = false;
  }
}
// ⬆️ 【修改】

// (核心) 提交 (不变)
// (此函数发送的 payload { productIds: [...] } 仍然被新后端逻辑支持)
async function handleSubmit() {
  if (!props.store) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    // 调用我们创建的新 API
    await apiClient.put(`/admin/stores/${props.store.id}/products`, {
      productIds: selectedProductIds.value // 发送所有被勾选的 ID
    });
    closeModal(); // 成功后关闭
  } catch (error) {
    console.error("保存失败:", error);
    errorMessage.value = "保存失败，请重试。";
  } finally {
    isLoading.value = false;
  }
}

// 监听弹窗打开/关闭
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // 弹窗打开时，获取最新数据
    fetchData();
  }
});

// 关闭弹窗
function closeModal() {
  emit('close');
}
</script>

<style scoped>
/* 此组件使用 Tailwind 类，不需要额外样式 */
</style>