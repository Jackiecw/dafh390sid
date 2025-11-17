<template>
  <div class="kanban-board">
    <div
      v-for="column in columns"
      :key="column.status"
      class="kanban-column"
      @dragover.prevent="onDragOver(column.status)"
      @dragleave.prevent="onDragLeave(column.status)"
      @drop.prevent="onDrop(column.status)"
      :class="{ 'drag-over': dragOverStatus === column.status }"
    >
      <div class="column-header">
        <span class="column-title">{{ column.label }}</span>
        <span class="column-count">{{ column.batches.length }}</span>
      </div>
      
      <div class="column-body">
        <LogisticsKanbanCard
          v-for="batch in column.batches"
          :key="batch.id"
          :batch="batch"
          :is-admin="isAdmin"
          @click="onCardClick"
          @dragstart="onDragStart(batch)"
        />
        
        <div v-if="column.batches.length === 0" class="column-empty">
          无批次
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import LogisticsKanbanCard from './LogisticsKanbanCard.vue';

const props = defineProps({
  batches: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update-status-request']);

// (与 Stepper 和 Schema 保持一致)
const STATUS_MAP = [
  { key: 'FACTORY', label: '生产中' },
  { key: 'WAREHOUSE_READY', label: '待出库' },
  { key: 'CONTAINER_LOADED', label: '已装柜' },
  { key: 'EXPORT_CUSTOMS', label: '出口清关' },
  { key: 'SHIPPING', label: '国际运输' },
  { key: 'IMPORT_CUSTOMS', label: '进口清关' },
  { key: 'LOCAL_DELIVERY', label: '本地派送' },
  { key: 'COMPLETED', label: '已入仓' },
];

// (核心) 将传入的 batches 数组按状态分组
const columns = computed(() => {
  // (创建一个 map, key 是状态, value 是批次数组)
  const batchesByStatus = props.batches.reduce((acc, batch) => {
    const status = batch.currentStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(batch);
    return acc;
  }, {});

  // (按 STATUS_MAP 的顺序)
  return STATUS_MAP.map((statusInfo) => ({
    ...statusInfo,
    batches: batchesByStatus[statusInfo.key] || [],
  }));
});

// --- 拖拽逻辑 ---
const draggingBatchId = ref(null);
const dragOverStatus = ref(null); // (用于高亮)

function onDragStart(batch) {
  draggingBatchId.value = batch.id;
  dragOverStatus.value = null;
}

function onDragOver(statusKey) {
  if (!props.isAdmin) return;
  dragOverStatus.value = statusKey;
}

function onDragLeave(statusKey) {
  if (dragOverStatus.value === statusKey) {
    dragOverStatus.value = null;
  }
}

function onDrop(targetStatus) {
  if (!props.isAdmin) return;
  
  const batchId = draggingBatchId.value;
  const batch = props.batches.find(b => b.id === batchId);
  
  dragOverStatus.value = null;
  draggingBatchId.value = null;

  if (batch && batch.currentStatus !== targetStatus) {
    // (核心) 不直接修改, 而是发出事件, 通知父组件打开弹窗
    emit('update-status-request', { batch, targetStatus });
  }
}

// (点击卡片，也发出相同事件)
function onCardClick(batch) {
  if (!props.isAdmin) return;
  emit('update-status-request', { batch, targetStatus: null });
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  overflow-x: auto;
  padding: 0.5rem;
  background-color: #f9fafb; /* gray-50 */
  border-radius: 0.5rem;
  min-height: 600px;
}
.kanban-column {
  width: 280px;
  min-width: 280px;
  margin-right: 0.75rem;
  border-radius: 0.5rem; /* rounded-lg */
  background-color: #f3f4f6; /* gray-100 */
  transition: background-color 0.2s ease;
}
.kanban-column.drag-over {
  background-color: #eef2ff; /* blue-100 */
  border: 1px dashed #3b82f6;
}
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid #e5e7eb; /* gray-200 */
}
.column-title {
  font-size: 0.875rem; /* text-sm */
  font-weight: 600; /* font-semibold */
  color: #1f2937; /* gray-800 */
}
.column-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280; /* gray-500 */
  background-color: #e5e7eb;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}
.column-body {
  padding: 0.75rem;
  height: calc(100% - 50px);
  overflow-y: auto;
}
.column-empty {
  padding: 2rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: #9ca3af; /* gray-400 */
}
</style>