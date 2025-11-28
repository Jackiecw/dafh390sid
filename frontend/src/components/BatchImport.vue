<template>
  <div class="space-y-6">
    <!-- Upload Section -->
    <div class="space-y-6">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="input-group">
                <label for="country">国家</label>
                <select id="country" v-model="selectedCountry" class="form-input">
                    <option value="" disabled>请选择国家</option>
                    <option v-for="country in availableCountries" :key="country.code" :value="country.code">
                        {{ country.name }}
                    </option>
                </select>
            </div>
            
             <div class="input-group">
                <label for="store">所属店铺</label>
                <select id="store" v-model="selectedStoreId" class="form-input" :disabled="!selectedCountry">
                    <option value="" disabled>请选择店铺</option>
                    <option v-for="store in filteredStores" :key="store.id" :value="store.id">{{ store.name }}</option>
                </select>
            </div>

            <div class="col-span-full">
                <label class="block text-sm font-bold text-stone-700 mb-2">上传文件</label>
                <div 
                    class="flex justify-center rounded-lg border-2 border-dashed border-stone-300 px-6 py-10 hover:bg-stone-50 transition-colors"
                    @dragover.prevent
                    @drop.prevent="handleDrop"
                    :class="{'bg-indigo-50 border-indigo-300': isDragging}"
                    @dragenter="isDragging = true"
                    @dragleave="isDragging = false"
                >
                    <div class="text-center">
                        <DocumentArrowUpIcon class="mx-auto h-12 w-12 text-stone-400" aria-hidden="true" />
                        <div class="mt-4 flex text-sm leading-6 text-stone-600 justify-center">
                            <label for="file-upload" class="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500">
                                <span>上传文件</span>
                                <input id="file-upload" name="file-upload" type="file" class="sr-only" @change="handleFileSelect" accept=".xlsx, .xls" />
                            </label>
                            <p class="pl-1">或拖拽文件到这里</p>
                        </div>
                        <p class="text-xs leading-5 text-stone-500">支持 .xlsx, .xls</p>
                        <p v-if="selectedFile" class="mt-2 text-sm font-semibold text-indigo-600">{{ selectedFile.name }}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="flex items-center justify-end gap-x-4 pt-4 border-t border-stone-100">
            <button type="button" class="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50" @click="reset">重置</button>
            <button 
                type="submit" 
                class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="uploadAndPreview"
                :disabled="!selectedFile || !selectedStoreId || loading"
            >
                <span v-if="loading">处理中...</span>
                <span v-else>生成预览</span>
            </button>
        </div>
    </div>


    <div v-if="previewData.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-4 py-5 sm:px-6 border-b border-stone-200 flex justify-between items-center">
            <h3 class="text-lg font-medium leading-6 text-stone-900">预览数据</h3>
            <div class="text-sm text-stone-500">
                已选 {{ selectedCount }} 条 (共 {{ previewData.length }} 条)，
                其中未匹配 <span class="text-red-600 font-bold">{{ selectedUnmatchedCount }}</span> 条
            </div>
        </div>
        
        <!-- Pagination Controls (Top) -->
        <div class="px-4 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between sm:px-6">
            <div class="flex items-center">
                <span class="mr-2 text-sm text-stone-700">每页显示:</span>
                <select v-model="pageSize" class="form-select rounded-md border-stone-300 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                </select>
            </div>
            <div class="flex items-center space-x-2">
                <button 
                    @click="currentPage--" 
                    :disabled="currentPage === 1"
                    class="relative inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                    上一页
                </button>
                <span class="text-sm text-stone-700">
                    第 {{ currentPage }} / {{ totalPages }} 页
                </span>
                <button 
                    @click="currentPage++" 
                    :disabled="currentPage === totalPages"
                    class="relative inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                    下一页
                </button>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-stone-200">
                <thead class="bg-stone-50">
                    <tr>
                        <th scope="col" class="relative px-7 sm:w-12 sm:px-6">
                            <input type="checkbox" class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600" :checked="isAllSelected" @change="toggleSelectAll" />
                        </th>
                        <th scope="col" class="table-th">订单号</th>
                        <th scope="col" class="table-th">日期</th>
                        <th scope="col" class="table-th">状态</th>
                        <th scope="col" class="table-th">商品标题</th>
                        <th scope="col" class="table-th">SKU</th>
                        <th scope="col" class="table-th">数量</th>
                        <th scope="col" class="table-th">金额</th>
                        <th scope="col" class="table-th">匹配状态</th>
                        <th scope="col" class="table-th text-right">操作</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-stone-200 bg-white">
                    <tr v-for="(item, index) in paginatedPreviewData" :key="item.platformOrderId" :class="getRowClass(item)">
                        <td class="relative px-7 sm:w-12 sm:px-6">
                            <input type="checkbox" class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-600" v-model="item.selected" />
                        </td>
                        <td class="table-td font-medium">
                            {{ item.platformOrderId }}
                            <span v-if="item.isUpdate" class="ml-2 inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">更新</span>
                        </td>
                        <td class="table-td text-stone-500 whitespace-nowrap">{{ formatDate(item.orderDate) }}</td>
                        <td class="table-td text-stone-500">
                            <div v-if="item.isUpdate && item.existingData && item.existingData.orderStatus !== item.orderStatus" class="flex flex-col">
                                <span class="line-through text-xs text-stone-400">{{ item.existingData.orderStatus }}</span>
                                <span class="font-bold text-indigo-600">{{ item.orderStatus }}</span>
                            </div>
                            <span v-else>{{ item.orderStatus }}</span>
                        </td>
                        <td class="table-td text-stone-500 max-w-xs truncate" :title="item.title">{{ item.title }}</td>
                        <td class="table-td text-stone-500">{{ item.sku }}</td>
                        <td class="table-td text-stone-500">{{ item.quantity }}</td>
                        <td class="table-td text-stone-500">
                            <div v-if="item.isUpdate && item.existingData && item.existingData.revenue !== item.revenue" class="flex flex-col">
                                <span class="line-through text-xs text-stone-400">{{ item.existingData.revenue }}</span>
                                <span class="font-bold text-indigo-600">{{ item.revenue }}</span>
                            </div>
                            <span v-else>{{ item.revenue }}</span>
                        </td>
                        <td class="table-td">
                            <span v-if="item.listingId" class="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">已匹配 ({{ item.matchType }})</span>
                            <span v-else class="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">未匹配</span>
                        </td>
                        <td class="table-td text-right">
                            <button v-if="!item.listingId" @click="openMappingModal(item)" class="text-indigo-600 hover:text-indigo-900 font-medium">关联</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="bg-stone-50 px-4 py-3 sm:px-6 flex items-center justify-end border-t border-stone-200">
            <button 
                type="button" 
                class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="confirmImport"
                :disabled="selectedCount === 0 || selectedUnmatchedCount > 0 || submitting"
            >
                <span v-if="submitting">提交中...</span>
                <span v-else>确认导入已选</span>
            </button>
        </div>
    </div>

    <MappingModal 
        v-model="showMappingModal" 
        :item="currentMappingItem" 
        :storeId="selectedStoreId"
        @confirm="handleMappingConfirm" 
    />



  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline';
import MappingModal from './MappingModal.vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const selectedCountry = ref('');
const selectedStoreId = ref('');
const selectedFile = ref(null);
const isDragging = ref(false);
const loading = ref(false);
const submitting = ref(false);
const previewData = ref([]);
const stores = ref([]); 


// Pagination State
const currentPage = ref(1);
const pageSize = ref(10);

const showMappingModal = ref(false);
const currentMappingItem = ref(null);

const selectedCount = computed(() => previewData.value.filter(i => i.selected).length);
const selectedUnmatchedCount = computed(() => previewData.value.filter(i => i.selected && !i.listingId).length);
const isAllSelected = computed(() => previewData.value.length > 0 && previewData.value.every(i => i.selected));

// Pagination Computed
const totalPages = computed(() => Math.ceil(previewData.value.length / pageSize.value) || 1);
const paginatedPreviewData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return previewData.value.slice(start, end);
});

// Reset page when data changes
watch(previewData, () => {
    currentPage.value = 1;
});

// Computed: Available Countries based on stores and permissions
const availableCountries = computed(() => {
    const uniqueCountriesMap = new Map();
    stores.value.forEach(store => {
        if (store.country) {
            uniqueCountriesMap.set(store.country.code, store.country);
        }
    });
    const allUniqueCountries = Array.from(uniqueCountriesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

    if (authStore.role === 'admin') {
        return allUniqueCountries; 
    }
    const userCountryCodes = authStore.operatedCountries || []; 
    return allUniqueCountries.filter(country => 
        userCountryCodes.includes(country.code)
    );
});

// Computed: Filtered Stores based on selected country
const filteredStores = computed(() => {
    if (!selectedCountry.value) return [];
    return stores.value.filter(store => store.countryCode === selectedCountry.value);
});

// Watch: Reset store when country changes
watch(selectedCountry, () => {
    selectedStoreId.value = '';
});

// Fetch stores and batches on mount
onMounted(async () => {
    try {
        const response = await apiClient.get('/admin/stores');
        stores.value = response.data;
    } catch (e) {
        console.error("Failed to fetch stores", e);
    }
});





const handleFileSelect = (event) => {
    selectedFile.value = event.target.files[0];
};

const handleDrop = (event) => {
    isDragging.value = false;
    selectedFile.value = event.dataTransfer.files[0];
};

const reset = () => {
    selectedFile.value = null;
    previewData.value = [];
    selectedCountry.value = '';
    selectedStoreId.value = '';
};

const toggleSelectAll = () => {
    const newValue = !isAllSelected.value;
    previewData.value.forEach(item => item.selected = newValue);
};

const uploadAndPreview = async () => {
    if (!selectedFile.value) return;
    
    // Find selected store to get expected platform
    const selectedStore = stores.value.find(s => s.id === selectedStoreId.value);
    if (!selectedStore) {
        alert("请选择有效的店铺");
        return;
    }

    loading.value = true;
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('storeId', selectedStoreId.value); // Append storeId

    try {
        const response = await apiClient.post('/sales-import/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Validation: Check if detected platform matches store platform
        const detectedPlatform = response.data.platform;
        if (detectedPlatform !== selectedStore.platform) {
            alert(`平台不匹配！\n检测到的文件格式: ${detectedPlatform}\n所选店铺平台: ${selectedStore.platform}\n请检查文件或店铺选择。`);
            loading.value = false;
            return;
        }

        // Add selected property to each item
        previewData.value = response.data.data.map(item => ({ ...item, selected: true }));
        
    } catch (e) {
        console.error("Preview failed", e);
        alert("解析失败: " + (e.response?.data?.error || e.message));
    } finally {
        loading.value = false;
    }
};

const openMappingModal = (item) => {
    currentMappingItem.value = item;
    showMappingModal.value = true;
};

const handleMappingConfirm = (mappingResult) => {
    // mappingResult: { originalItem, listingId, listing }
    // Update the item in previewData
    const index = previewData.value.indexOf(mappingResult.originalItem);
    if (index !== -1) {
        previewData.value[index].listingId = mappingResult.listingId;
        previewData.value[index].matchType = 'MANUAL';
        // previewData.value[index].createMapping = true; // REMOVED: Do not create automatic mapping
    }
};

const confirmImport = async () => {
    if (selectedCount.value === 0) {
        alert("请至少选择一条数据");
        return;
    }
    if (selectedUnmatchedCount.value > 0) {
        alert("请先处理已选数据中的未匹配订单");
        return;
    }

    submitting.value = true;
    try {
        const selectedStore = stores.value.find(s => s.id === selectedStoreId.value);
        const itemsToImport = previewData.value.filter(i => i.selected);
        const payload = {
            platform: selectedStore.platform, // Use store platform
            storeId: selectedStoreId.value,
            items: itemsToImport
        };
        
        const response = await apiClient.post('/sales-import/confirm', payload);
        alert(`导入成功! 成功: ${response.data.success}, 失败: ${response.data.failed}`);
        reset();
        reset();
    } catch (e) {
        console.error("Import failed", e);
        alert("导入失败: " + (e.response?.data?.error || e.message));
    } finally {
        submitting.value = false;
    }
};

const getRowClass = (item) => {
    if (!item.listingId) return 'bg-red-50/50';
    if (item.isUpdate) return 'bg-yellow-50/50';
    return 'bg-green-50/50';
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
};
</script>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; 
}
.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
.table-th {
  padding: 0.75rem 1.5rem; 
  text-align: left;
  font-size: 0.75rem; 
  font-weight: 500;
  color: #6b7280; 
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.table-td {
  padding: 1rem 1.5rem; 
  white-space: nowrap;
  font-size: 0.875rem; 
  color: #374151; 
}
</style>
