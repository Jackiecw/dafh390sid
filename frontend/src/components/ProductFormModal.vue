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
            <DialogPanel class="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                {{ dialogTitle }}
              </DialogTitle>
              
              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                
                <h4 class="col-span-3 text-sm font-semibold text-indigo-600 border-b pb-1">1. 核心信息</h4>

                <div class="input-group">
                  <label for="sku">内部型号 (SKU) *</label>
                  <input type="text" id="sku" v-model="formData.sku" />
                </div>

                <div class="input-group">
                  <label for="name">内部名称 *</label>
                  <input type="text" id="name" v-model="formData.name" />
                </div>
                
                <div class="input-group">
                  <label for="publicName">对外型号 (可选)</label>
                  <input type="text" id="publicName" v-model="formData.publicName" placeholder="例如: ProView X1" />
                </div>

                <div class="input-group">
                  <label for="category">分类 *</label>
                  <select id="category" v-model="formData.category">
                    <option disabled value="">请选择...</option>
                    <option v-for="opt in options.categories" :key="opt" :value="opt">
                      {{ opt }}
                    </option>
                  </select>
                </div>
                
                <div class="input-group">
                  <label for="cost">成本价 (¥)</label>
                  <input type="number" step="0.01" id="cost" v-model="formData.cost" />
                </div>
                
                <div class="input-group col-span-3">
                  <label for="description">简介</label>
                  <textarea id="description" rows="2" v-model="formData.description" class="form-input"></textarea>
                </div>

                <h4 class="col-span-3 mt-2 text-sm font-semibold text-indigo-600 border-b pb-1">2. 物理规格</h4>

                <div class="input-group">
                  <label for="weightKg">重量 (kg)</label>
                  <input type="number" step="0.01" id="weightKg" v-model="formData.weightKg" placeholder="例如: 1.25" />
                </div>
                
                <div class="input-group">
                  <label for="lengthMm">长 (mm)</label>
                  <input type="number" id="lengthMm" v-model="formData.lengthMm" placeholder="例如: 300" />
                </div>
                
                <div class="input-group">
                  <label for="widthMm">宽 (mm)</label>
                  <input type="number" id="widthMm" v-model="formData.widthMm" placeholder="例如: 200" />
                </div>
                
                <div class="input-group">
                  <label for="heightMm">高 (mm)</label>
                  <input type="number" id="heightMm" v-model="formData.heightMm" placeholder="例如: 100" />
                </div>

                <h4 class="col-span-3 mt-2 text-sm font-semibold text-indigo-600 border-b pb-1">3. 性能参数</h4>

                <div class="input-group">
                  <label for="resolution">分辨率</label>
                  <input type="text" id="resolution" v-model="formData.resolution" placeholder="例如: 1920x1080" />
                </div>

                <div class="input-group">
                  <label for="brightnessAnsi">亮度 (ANSI)</label>
                  <input type="number" id="brightnessAnsi" v-model="formData.brightnessAnsi" />
                </div>

                <div class="input-group">
                  <label for="lightSourceBrightness">光源亮度 (LM)</label>
                  <input type="number" id="lightSourceBrightness" v-model="formData.lightSourceBrightness" />
                </div>

                <div class="input-group">
                  <label for="brightnessUniformity">亮度均匀性 (%)</label>
                  <input type="number" id="brightnessUniformity" v-model="formData.brightnessUniformity" />
                </div>

                <div class="input-group">
                  <label for="noiseDb">工作噪声 (dB)</label>
                  <input type="number" id="noiseDb" v-model="formData.noiseDb" />
                </div>

                <div class="input-group">
                  <label for="contrastRatio">对比度</label>
                  <input type="text" id="contrastRatio" v-model="formData.contrastRatio" placeholder="例如: 1000:1" />
                </div>

                <div class="input-group">
                  <label for="throwRatio">投射比</label>
                  <input type="text" id="throwRatio" v-model="formData.throwRatio" placeholder="例如: 1.2:1" />
                </div>

                <div class="input-group">
                  <label for="projectionSize">建议投影尺寸</label>
                  <input type="text" id="projectionSize" v-model="formData.projectionSize" placeholder="例如: 40-120" />
                </div>

                <div class="input-group">
                  <label for="projectionDistance">建议投影距离 (m)</label>
                  <input type="text" id="projectionDistance" v-model="formData.projectionDistance" placeholder="例如: 1.5-3.5" />
                </div>

                <h4 class="col-span-3 mt-2 text-sm font-semibold text-indigo-600 border-b pb-1">4. 硬件与系统</h4>

                <div class="input-group">
                  <label for="chipset">芯片</label>
                  <input type="text" id="chipset" v-model="formData.chipset" />
                </div>

                <div class="input-group">
                  <label for="ramRom">内存硬盘</label>
                  <input type="text" id="ramRom" v-model="formData.ramRom" placeholder="例如: 1+8" />
                </div>

                <div class="input-group">
                  <label for="os">操作系统</label>
                  <select id="os" v-model="formData.os">
                    <option value="">-- 无 --</option>
                    <option v-for="opt in options.osTypes" :key="opt" :value="opt">
                      {{ opt }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="focusMethod">对焦方式</label>
                  <select id="focusMethod" v-model="formData.focusMethod">
                    <option value="">-- 无 --</option>
                    <option v-for="opt in options.focusMethods" :key="opt" :value="opt">
                      {{ opt }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="keystone">梯形校正</label>
                  <select id="keystone" v-model="formData.keystone">
                    <option value="">-- 无 --</option>
                    <option v-for="opt in options.keystoneMethods" :key="opt" :value="opt">
                      {{ opt }}
                    </option>
                  </select>
                </div>

                <div class="input-group">
                  <label for="wifiVersion">WiFi 版本</label>
                  <input type="text" id="wifiVersion" v-model="formData.wifiVersion" placeholder="例如: 5, 6" />
                </div>

                <div class="input-group">
                  <label for="bluetoothVersion">蓝牙版本</label>
                  <input type="text" id="bluetoothVersion" v-model="formData.bluetoothVersion" placeholder="例如: 5.0" />
                </div>

                <div class="col-span-3 grid grid-cols-4 gap-4 mt-2">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="hasGimbal" v-model="formData.hasGimbal" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                    <label for="hasGimbal" class="text-sm text-gray-900">带云台</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="autoObstacle" v-model="formData.autoObstacle" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                    <label for="autoObstacle" class="text-sm text-gray-900">自动避障</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="autoScreenFit" v-model="formData.autoScreenFit" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                    <label for="autoScreenFit" class="text-sm text-gray-900">自动入幕</label>
                  </div>
                </div>

                <h4 class="col-span-3 mt-2 text-sm font-semibold text-indigo-600 border-b pb-1">5. 内部主图</h4>
                
                <div class="input-group col-span-3">
                  <label for="productImage">商品图片 ({{ isEditMode ? '替换' : '上传' }})</label>
                  <input 
                    type="file" 
                    id="productImage" 
                    @change="onFileSelected"
                    accept="image/png, image/jpeg"
                    class="block w-full text-sm text-stone-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-indigo-50 file:text-indigo-700
                           hover:file:bg-indigo-100"
                  />
                  <img v-if="previewUrl" :src="previewUrl" class="mt-2 h-24 w-24 object-cover rounded">
                </div>

                <p v-if="errorMessage" class="text-red-600 text-sm col-span-3">
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
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
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

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  productToEditId: { type: String, default: null }
});
const emit = defineEmits(['close', 'product-created', 'product-updated']);

// ⬇️ 【修改】 扩展 defaultFormData
const defaultFormData = () => ({
  sku: '',
  name: '',
  category: '',
  cost: null,
  description: '',
  imageUrl: '',
  publicName: '',
  weightKg: null, 
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  resolution: '',
  brightnessAnsi: null,
  brightnessUniformity: null,
  lightSourceBrightness: null,
  noiseDb: null,
  contrastRatio: '',
  throwRatio: '',
  projectionSize: '',
  projectionDistance: '',
  chipset: '',
  ramRom: '',
  os: '',
  focusMethod: '',
  keystone: '',
  hasGimbal: false,
  wifiVersion: '',
  bluetoothVersion: '',
  autoObstacle: false,
  autoScreenFit: false,
});

const formData = ref(defaultFormData());
// ⬇️ 【修改】 扩展 options
const options = ref({ 
  categories: [],
  osTypes: [],
  focusMethods: [],
  keystoneMethods: [],
});
const selectedFile = ref(null); 
const previewUrl = ref(null); 
const errorMessage = ref('');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');

const isEditMode = computed(() => !!props.productToEditId);
const dialogTitle = computed(() => isEditMode.value ? '编辑产品 (产品目录)' : '创建新产品 (产品目录)');
const submitButtonText = computed(() => isEditMode.value ? '保存更改' : '创建产品');

// (不变) 文件选择
function onFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(file); 
  }
}

// ⬇️ 【修改】 获取所有选项
async function fetchOptions() {
  try {
    // (调用我们在 Phase 2 中修改的 API)
    const response = await apiClient.get('/admin/product-options');
    options.value = response.data;
  } catch (error) {
    errorMessage.value = "无法加载分类选项。";
  }
}

// ⬇️ 【修改】 获取详情
async function fetchProductDetails() {
  if (!isEditMode.value) return;
  try {
    // (我们复用 /admin/products 列表)
    const response = await apiClient.get('/admin/products');
    const product = response.data.find(p => p.id === props.productToEditId);

    if (product) {
      // (确保所有字段都被填充，null/undefined 转为空字符串或默认值)
      formData.value = {
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        cost: product.cost || null,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        publicName: product.publicName || '',
        weightKg: product.weightKg || null, 
        lengthMm: product.lengthMm || null,
        widthMm: product.widthMm || null,
        heightMm: product.heightMm || null,
        resolution: product.resolution || '',
        brightnessAnsi: product.brightnessAnsi || null,
        brightnessUniformity: product.brightnessUniformity || null,
        lightSourceBrightness: product.lightSourceBrightness || null,
        noiseDb: product.noiseDb || null,
        contrastRatio: product.contrastRatio || '',
        throwRatio: product.throwRatio || '',
        projectionSize: product.projectionSize || '',
        projectionDistance: product.projectionDistance || '',
        chipset: product.chipset || '',
        ramRom: product.ramRom || '',
        os: product.os || '',
        focusMethod: product.focusMethod || '',
        keystone: product.keystone || '',
        hasGimbal: product.hasGimbal || false,
        wifiVersion: product.wifiVersion || '',
        bluetoothVersion: product.bluetoothVersion || '',
        autoObstacle: product.autoObstacle || false,
        autoScreenFit: product.autoScreenFit || false,
      };
      
      selectedFile.value = null; 
      if (product.imageUrl) {
        previewUrl.value = `${apiBaseUrl}${product.imageUrl}`; 
      } else {
        previewUrl.value = null;
      }
    }
  } catch (error) {
    errorMessage.value = '无法加载商品详情。';
  }
}

// ⬇️ 【修改】 提交表单 (使用 FormData)
async function handleSubmit() {
  errorMessage.value = '';

  const payload = new FormData();
  
  // (附加所有文本和数字字段)
  // (注意：我们将 null/undefined 转为空字符串 ''，后端 Zod 会将其转为 null)
  payload.append('sku', formData.value.sku || '');
  payload.append('name', formData.value.name || '');
  payload.append('category', formData.value.category || '');
  payload.append('cost', formData.value.cost || '');
  payload.append('description', formData.value.description || '');
  
  payload.append('publicName', formData.value.publicName || '');
  payload.append('weightKg', formData.value.weightKg || ''); 
  payload.append('lengthMm', formData.value.lengthMm || '');
  payload.append('widthMm', formData.value.widthMm || '');
  payload.append('heightMm', formData.value.heightMm || '');

  payload.append('resolution', formData.value.resolution || '');
  payload.append('brightnessAnsi', formData.value.brightnessAnsi || '');
  payload.append('brightnessUniformity', formData.value.brightnessUniformity || '');
  payload.append('lightSourceBrightness', formData.value.lightSourceBrightness || '');
  payload.append('noiseDb', formData.value.noiseDb || '');
  payload.append('contrastRatio', formData.value.contrastRatio || '');
  payload.append('throwRatio', formData.value.throwRatio || '');
  payload.append('projectionSize', formData.value.projectionSize || '');
  payload.append('projectionDistance', formData.value.projectionDistance || '');

  payload.append('chipset', formData.value.chipset || '');
  payload.append('ramRom', formData.value.ramRom || '');
  payload.append('os', formData.value.os || '');
  payload.append('focusMethod', formData.value.focusMethod || '');
  payload.append('keystone', formData.value.keystone || '');

  // (附加布尔值)
  payload.append('hasGimbal', formData.value.hasGimbal);
  payload.append('autoObstacle', formData.value.autoObstacle);
  payload.append('autoScreenFit', formData.value.autoScreenFit);

  payload.append('wifiVersion', formData.value.wifiVersion || '');
  payload.append('bluetoothVersion', formData.value.bluetoothVersion || '');

  // (附加文件)
  if (selectedFile.value) {
    payload.append('imageUrl', selectedFile.value); // (后端使用 'imageUrl')
  }

  try {
    let response;
    if (isEditMode.value) {
      response = await apiClient.put(`/admin/products/${props.productToEditId}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' } // (重要)
      });
      emit('product-updated', response.data);
    } else {
      response = await apiClient.post('/admin/products', payload, {
        headers: { 'Content-Type': 'multipart/form-data' } // (重要)
      });
      emit('product-created', response.data);
    }
    closeModal();
  } catch (error) {
    if (error.response && error.response.data.details) {
      errorMessage.value = error.response.data.details.map(d => d.message).join('; ');
    } else if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = '操作失败，请检查网络。';
    }
  }
}

// (不变) Watch
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm(); 
    fetchOptions();
    if (isEditMode.value) {
      fetchProductDetails();
    }
  } else {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
  }
});

function closeModal() { emit('close'); }

// ⬇️ 【修改】 重置表单
function resetForm() {
  formData.value = defaultFormData();
  selectedFile.value = null;
  previewUrl.value = null;
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
  /* ⬇️ 【新增】 确保输入框背景为白色 */
  background-color: #fff;
}
.input-group input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}
</style>