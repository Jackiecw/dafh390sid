<template>
  <TransitionRoot as="template" :show="modelValue">
    <Dialog as="div" class="relative z-50" @close="closeModal">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
              
              <!-- Header -->
              <div class="bg-white px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                <DialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900">关联产品映射</DialogTitle>
                <button @click="closeModal" class="text-gray-400 hover:text-gray-500">
                  <span class="sr-only">Close</span>
                  <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div class="flex h-[600px]">
                <!-- Left Side: Unmatched Item Details -->
                <div class="w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
                    <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">待匹配条目</h4>
                    <div class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
                        <div>
                            <span class="text-xs text-gray-500 block">平台</span>
                            <span class="text-sm font-medium text-gray-900">{{ item?.platform }}</span>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500 block">商品标题</span>
                            <p class="text-sm text-gray-900 mt-1">{{ item?.title }}</p>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500 block">SKU</span>
                            <span class="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">{{ item?.sku }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                             <div>
                                <span class="text-xs text-gray-500 block">数量</span>
                                <span class="text-sm text-gray-900">{{ item?.quantity }}</span>
                            </div>
                             <div>
                                <span class="text-xs text-gray-500 block">金额</span>
                                <span class="text-sm text-gray-900">{{ item?.revenue }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Side: Store Listings Grid -->
                <div class="w-2/3 flex flex-col bg-white">
                    <!-- Search Bar -->
                    <div class="p-4 border-b border-gray-200">
                        <div class="relative">
                            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input 
                                type="text" 
                                v-model="searchQuery" 
                                class="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" 
                                placeholder="搜索店铺在售商品 (标题 / SKU / Code)..."
                                @input="handleSearch"
                            />
                        </div>
                    </div>

                    <!-- Listings Grid -->
                    <div class="flex-1 overflow-y-auto p-4 bg-gray-50">
                        <div v-if="loading" class="flex justify-center items-center h-full">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                        
                        <div v-else-if="filteredListings.length === 0" class="flex flex-col justify-center items-center h-full text-gray-500">
                            <ArchiveBoxXMarkIcon class="h-12 w-12 text-gray-300 mb-2" />
                            <p>未找到匹配的商品</p>
                        </div>

                        <div v-else class="grid grid-cols-2 gap-4">
                            <div 
                                v-for="listing in filteredListings" 
                                :key="listing.id" 
                                class="relative flex flex-col rounded-lg border bg-white p-3 shadow-sm hover:shadow-md cursor-pointer transition-all"
                                :class="selectedListing?.id === listing.id ? 'ring-2 ring-blue-600 border-transparent' : 'border-gray-200 hover:border-blue-300'"
                                @click="selectListing(listing)"
                            >
                                <div class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-32 mb-3">
                                    <img v-if="listing.storeImageUrl" :src="listing.storeImageUrl" class="h-full w-full object-cover object-center lg:h-full lg:w-full" />
                                    <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                                        <PhotoIcon class="h-8 w-8" />
                                    </div>
                                </div>
                                <div class="flex flex-1 flex-col">
                                    <h3 class="text-sm font-medium text-gray-900 line-clamp-2" :title="listing.storeTitle">
                                        {{ listing.storeTitle }}
                                    </h3>
                                    <div class="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                                        <p>SKU: <span class="text-gray-700">{{ listing.product?.sku }}</span></p>
                                        <p>Code: {{ listing.productCode }}</p>
                                    </div>
                                </div>
                                <!-- Checkmark for selected -->
                                <div v-if="selectedListing?.id === listing.id" class="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                                    <CheckIcon class="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                        <button type="button" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" @click="closeModal">取消</button>
                        <button 
                            type="button" 
                            class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                            @click="confirm"
                            :disabled="!selectedListing"
                        >
                            确认关联
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
import { ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon, MagnifyingGlassIcon, PhotoIcon, CheckIcon, ArchiveBoxXMarkIcon } from '@heroicons/vue/24/outline';
import apiClient from '../api';

const props = defineProps({
  modelValue: Boolean,
  item: Object,
  storeId: String 
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const searchQuery = ref('');
const allListings = ref([]); 
const filteredListings = ref([]);
const selectedListing = ref(null);
const loading = ref(false);

watch(() => props.modelValue, async (newVal) => {
    if (newVal && props.storeId) {
        loading.value = true;
        searchQuery.value = '';
        selectedListing.value = null;
        filteredListings.value = [];
        try {
            const response = await apiClient.get(`/admin/store-listings/by-store/${props.storeId}`);
            allListings.value = response.data;
            filteredListings.value = allListings.value; // Show all initially
        } catch (e) {
            console.error("Failed to fetch store listings", e);
            allListings.value = [];
        } finally {
            loading.value = false;
        }
    }
});

const handleSearch = () => {
    if (!searchQuery.value) {
        filteredListings.value = allListings.value;
        return;
    }
    
    const query = searchQuery.value.toLowerCase();
    filteredListings.value = allListings.value.filter(l => 
        l.storeTitle.toLowerCase().includes(query) || 
        (l.product?.sku && l.product.sku.toLowerCase().includes(query)) ||
        (l.productCode && l.productCode.toLowerCase().includes(query))
    );
};

const selectListing = (listing) => {
    selectedListing.value = listing;
};

const closeModal = () => {
  emit('update:modelValue', false);
};

const confirm = () => {
    if (selectedListing.value) {
        emit('confirm', {
            originalItem: props.item,
            listingId: selectedListing.value.id,
            listing: selectedListing.value
        });
        closeModal();
    }
};
</script>
