<template>
  <div>
    <p v-if="isLoading" class="text-stone-500">正在加载 {{ countryCode }} 数据...</p>
    <p v-if="errorMessage" class="text-red-600">{{ errorMessage }}</p>

    <div v-if="!isLoading && modules.length === 0" class="p-6 bg-white rounded-lg shadow text-center text-stone-500">
      <p>
        “{{ countryCode }}”国家暂无数据。
        <button v-if="isAdmin" @click="handleAddModule" class="ml-2 text-indigo-600 font-semibold">
          点此创建第一个板块
        </button>
      </p>
    </div>

    <div v-if="!isLoading && modules.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full border-collapse">
        <thead class="bg-stone-100">
          <tr>
            <th class="table-th w-[15%]">板块</th>
            <th class="table-th w-[15%]">板块责任人</th>
            <th class="table-th w-[30%]">事项</th>
            <th class="table-th w-[15%]">事项责任人</th>
            <th class="table-th w-[15%]">备注</th>
            <th v-if="isAdmin" class="table-th w-[10%]">操作</th>
          </tr>
        </thead>
        
        <template v-for="module in modules" :key="module.id">
          <tr class="border-t border-stone-300">
            <td :rowspan="calcRowSpan(module)" class="table-td-module">
              <EditableCell 
                :value="module.name" 
                type="text"
                :is-admin="isAdmin"
                placeholder="板块名称"
                @save="value => handleSave(value, module.id, 'name', 'module')"
              />
            </td>
            <td :rowspan="calcRowSpan(module)" class="table-td-module">
              <EditableCell 
                :value="module.owner" 
                type="user-select"
                :options="userList"
                :is-admin="isAdmin"
                placeholder="-"
                @save="value => handleSave(value, module.id, 'ownerId', 'module')"
              />
            </td>
            
            <template v-if="module.tasks.length > 0">
              <td class="table-td">
                <EditableCell 
                  :value="module.tasks[0].name" 
                  type="text"
                  :is-admin="isAdmin"
                  placeholder="事项名称"
                  @save="value => handleSave(value, module.tasks[0].id, 'name', 'task')"
                />
              </td>
              <td class="table-td">
                <EditableCell 
                  :value="module.tasks[0].owner" 
                  type="user-select"
                  :options="userList"
                  :is-admin="isAdmin"
                  placeholder="-"
                  @save="value => handleSave(value, module.tasks[0].id, 'ownerId', 'task')"
                />
              </td>
              <td class="table-td">
                <EditableCell 
                  :value="module.tasks[0].notes" 
                  type="text"
                  :is-admin="isAdmin"
                  placeholder="-"
                  @save="value => handleSave(value, module.tasks[0].id, 'notes', 'task')"
                />
              </td>
              <td v-if="isAdmin" class="table-td text-center">
                <button @click="handleDeleteTask(module.tasks[0].id, module.id)" class="text-red-500 hover:text-red-700 p-1 rounded-full">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </td>
            </template>
            
            <template v-else>
              <td class="table-td text-stone-400 italic">...</td>
              <td class="table-td text-stone-400 italic">...</td>
              <td class="table-td text-stone-400 italic">...</td>
              <td v-if="isAdmin" class="table-td"></td>
            </template>
          </tr>
          
          <tr v-for="task in module.tasks.slice(1)" :key="task.id" class="border-t border-stone-200">
            <td class="table-td">
              <EditableCell 
                :value="task.name" 
                type="text"
                :is-admin="isAdmin"
                placeholder="事项名称"
                @save="value => handleSave(value, task.id, 'name', 'task')"
              />
            </td>
            <td class="table-td">
              <EditableCell 
                :value="task.owner" 
                type="user-select"
                :options="userList"
                :is-admin="isAdmin"
                placeholder="-"
                @save="value => handleSave(value, task.id, 'ownerId', 'task')"
              />
            </td>
            <td class="table-td">
              <EditableCell 
                :value="task.notes" 
                type="text"
                :is-admin="isAdmin"
                placeholder="-"
                @save="value => handleSave(value, task.id, 'notes', 'task')"
              />
            </td>
            <td v-if="isAdmin" class="table-td text-center">
              <button @click="handleDeleteTask(task.id, module.id)" class="text-red-500 hover:text-red-700 p-1 rounded-full">
                <TrashIcon class="h-4 w-4" />
              </button>
            </td>
          </tr>
          
          <tr v-if="isAdmin" class="border-t border-stone-200">
            <td class="table-td">
              <button @click="handleAddTask(module.id)" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                <PlusIcon class="h-4 w-4 mr-1" /> 添加事项
              </button>
            </td>
            <td class="table-td"></td>
            <td class="table-td"></td>
            <td class="table-td text-center">
              <button @click="handleDeleteModule(module.id)" class="text-red-600 hover:text-red-800 text-sm font-medium flex items-center">
                <TrashIcon class="h-4 w-4 mr-1" /> 删除板块
              </button>
            </td>
          </tr>

        </template>
        
        <tfoot v-if="isAdmin">
          <tr class="border-t-2 border-stone-400">
            <td colspan="6" class="p-4">
              <button @click="handleAddModule" class="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition text-sm font-medium">
                + 新建板块
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'; // ⬅️ 导入 onMounted
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';
import { TrashIcon, PlusIcon } from '@heroicons/vue/20/solid';
import EditableCell from './EditableCell.vue'; // ⬅️ 导入新组件

// --- Props & Store ---
const props = defineProps({
  countryCode: {
    type: String,
    required: true,
  }
});
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

// --- State ---
const modules = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const userList = ref([]); // ⬅️ 【新增】 用于存储用户下拉列表

// --- 1. 数据获取 ---
async function fetchData(code) {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get(`/operation/data?country=${code}`);
    modules.value = response.data;
  } catch (error) {
    console.error(`获取 ${code} 数据失败:`, error);
    errorMessage.value = `获取 ${code} 数据失败。`;
  } finally {
    isLoading.value = false;
  }
}

// ⬅️ 【新增】 获取所有用户列表 (用于下拉菜单)
async function fetchUsers() {
  try {
    const response = await apiClient.get('/admin/users');
    userList.value = response.data.map(u => ({ id: u.id, nickname: u.nickname }));
  } catch (error) {
    console.error('获取用户列表失败:', error);
    errorMessage.value = '无法加载责任人下拉列表。';
  }
}

// (监视) 当国家代码变化时，重新获取数据
watch(() => props.countryCode, (newCode) => {
  if (newCode) {
    fetchData(newCode);
  }
}, { immediate: true });

// (启动时)
onMounted(() => {
  // ⬇️ 【修复】 只有 Admin 才需要加载用户列表（用于编辑下拉框）
  // 运营专员仅查看，不需要此列表，从而避免 403 错误
  if (isAdmin.value) {
    fetchUsers();
  }
});


// --- 2. 帮助函数 ---
function calcRowSpan(module) {
  const taskCount = module.tasks.length || 1;
  return isAdmin.value ? taskCount + 1 : taskCount;
}

// --- 3. 保存 (来自 EditableCell) ---
async function handleSave(value, id, field, type) {
  try {
    const url = type === 'task' ? `/admin/operation-tasks/${id}` : `/admin/operation-modules/${id}`;
    // (后端期望 { name: "..." } 或 { ownerId: "..." } 或 { notes: "..." })
    const payload = { [field]: value }; 
    
    const response = await apiClient.put(url, payload);
    
    // (乐观更新 UI)
    const moduleIndex = modules.value.findIndex(m => m.id === (type === 'module' ? id : m.tasks.find(t => t.id === id)?.moduleId));
    if (moduleIndex === -1) return;

    if (type === 'module') {
      // (后端返回了更新后的 module，替换它)
      // ⬇️ 【修复】
      // 确保在替换模块时，保留已经加载的任务
      // (或者，更好的方式是让 PUT /admin/operation-modules 返回完整的 module，包括 tasks)
      // (为了安全，我们只更新 owner 和 name)
      modules.value[moduleIndex].name = response.data.name;
      modules.value[moduleIndex].owner = response.data.owner;
    } else {
      // (后端返回了更新后的 task，替换它)
      const taskIndex = modules.value[moduleIndex].tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        modules.value[moduleIndex].tasks[taskIndex] = response.data;
      }
    }
    // ⬆️ 【修复】
  } catch (error) {
    console.error('更新失败:', error);
    errorMessage.value = '更新失败，请刷新页面。';
    fetchData(props.countryCode); // (硬刷新)
  }
}

// --- 4. 增/删 逻辑 ---
async function handleAddTask(moduleId) {
  const name = prompt('请输入新事项的名称:');
  if (!name) return;

  try {
    // (创建时，默认 ownerId 为 null, notes 为 null)
    const response = await apiClient.post('/admin/operation-tasks', {
      name: name,
      moduleId: moduleId,
      ownerId: null,
      notes: null
    });
    const module = modules.value.find(m => m.id === moduleId);
    if (module) {
      module.tasks.push(response.data);
    }
  } catch (error) {
    errorMessage.value = '创建事项失败。';
  }
}

async function handleAddModule() {
  const name = prompt('请输入新板块的名称:');
  if (!name) return;

  try {
    // (创建时，默认 ownerId 为 null)
    const response = await apiClient.post('/admin/operation-modules', {
      name: name,
      countryCode: props.countryCode,
      ownerId: null
    });
    modules.value.push(response.data); // (后端返回的新 module 已包含空 tasks 数组)
  } catch (error) {
    errorMessage.value = '创建板块失败。';
  }
}

async function handleDeleteTask(taskId, moduleId) {
  if (!confirm('确定要删除这个事项吗？')) return;
  try {
    await apiClient.delete(`/admin/operation-tasks/${taskId}`);
    const module = modules.value.find(m => m.id === moduleId);
    if (module) {
      module.tasks = module.tasks.filter(t => t.id !== taskId);
    }
  } catch (error) {
    errorMessage.value = '删除事项失败。';
  }
}

async function handleDeleteModule(moduleId) {
  if (!confirm('确定要删除这个板块及其所有事项吗？\n此操作不可逆！')) return;
  try {
    await apiClient.delete(`/admin/operation-modules/${moduleId}`);
    modules.value = modules.value.filter(m => m.id !== moduleId);
  } catch (error) {
    errorMessage.value = '删除板块失败。';
  }
}
</script>

<style scoped>
.table-th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e5e7eb;
}

.table-td-module {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
  vertical-align: top;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #d4d4d8;
  vertical-align: top;
  padding-top: 1rem; 
}

.table-td {
  padding: 0.5rem 1rem; 
  vertical-align: top;
  font-size: 0.875rem; 
  color: #374151; 
  border-bottom: 1px solid #e5e7eb; 
  height: 100%;
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>