<template>
  <div class="kanban-board" :class="{ 'kanban-board--empty': batches.length === 0 }">
    <div
      v-for="column in columns"
      :key="column.status"
      class="kanban-column"
      @dragover.prevent="onDragOver(column.status)"
      @dragleave.prevent="onDragLeave(column.status)"
      @drop.prevent="onDrop(column.status)"
      :class="{ 'drag-over': dragOverStatus === column.status }"
      :style="{ '--accent': column.accent }"
    >
      <div class="column-header">
        <div>
          <p class="column-title">{{ column.label }}</p>
          <p class="column-subtitle">{{ column.subtitle }}</p>
        </div>
        <div class="column-metrics">
          <span class="column-count">{{ column.batches.length }}</span>
          <span v-if="column.totalAmount" class="column-amount">
            ¥{{ column.totalAmount }}
          </span>
        </div>
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
          <p>无批次</p>
          <p class="muted">等待新的进度...</p>
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

// (与 Stepper / Schema 保持一致)
const STATUS_META = [
  { key: 'FACTORY', label: '生产中', subtitle: '排产与备料', accent: '#A5B4FC' },
  { key: 'WAREHOUSE_READY', label: '待出库', subtitle: '成品待发', accent: '#67E8F9' },
  { key: 'CONTAINER_LOADED', label: '已装柜', subtitle: '等待出口', accent: '#34D399' },
  { key: 'EXPORT_CUSTOMS', label: '出口清关', subtitle: '报关与查验', accent: '#FBBF24' },
  { key: 'SHIPPING', label: '国际运输', subtitle: '海运 / 空运', accent: '#F472B6' },
  { key: 'IMPORT_CUSTOMS', label: '进口清关', subtitle: '海外报关', accent: '#FB7185' },
  { key: 'LOCAL_DELIVERY', label: '本地派送', subtitle: '海外末端', accent: '#38BDF8' },
  { key: 'COMPLETED', label: '已入仓', subtitle: '入仓完成', accent: '#A7F3D0' },
];

// (核心) 将传入的 batches 数组按状态分组，顺便统计金额
const columns = computed(() => {
  const batchesByStatus = props.batches.reduce((acc, batch) => {
    const status = batch.currentStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(batch);
    return acc;
  }, {});

  return STATUS_META.map((statusInfo) => {
    const batchesInColumn = batchesByStatus[statusInfo.key] || [];
    const totalAmount = batchesInColumn.reduce((sum, batch) => {
      return sum + (Number(batch.totalPrice) || 0);
    }, 0);

    return {
      ...statusInfo,
      batches: batchesInColumn,
      totalAmount: totalAmount
        ? totalAmount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
        : null,
    };
  });
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
  const batch = props.batches.find((b) => b.id === batchId);

  dragOverStatus.value = null;
  draggingBatchId.value = null;

  if (batch && batch.currentStatus !== targetStatus) {
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
  display: grid;
  grid-auto-flow: column;
  gap: 1rem;
  overflow-x: auto;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 1rem;
  min-height: 540px;
}
.kanban-board--empty {
  justify-content: center;
}
.kanban-column {
  width: 300px;
  min-width: 280px;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #fff, #f8fafc);
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 10px 25px -20px rgba(15, 23, 42, 0.4);
}
.kanban-column::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 6px;
  border-radius: 1rem 0 0 1rem;
  background: var(--accent, #d1d5db);
}
.kanban-column.drag-over {
  border-color: #2563eb;
  box-shadow: 0 15px 35px -15px rgba(37, 99, 235, 0.5);
}
.column-header {
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid #eef2ff;
  border-top-right-radius: 1rem;
}
.column-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}
.column-subtitle {
  font-size: 0.75rem;
  color: #64748b;
}
.column-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}
.column-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #2563eb;
  background-color: rgba(37, 99, 235, 0.12);
  padding: 0.15rem 0.75rem;
  border-radius: 999px;
}
.column-amount {
  font-size: 0.75rem;
  color: #475569;
}
.column-body {
  padding: 1rem;
  height: calc(100% - 70px);
  overflow-y: auto;
}
.column-empty {
  padding: 2rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: #9ca3af;
}
.column-empty .muted {
  font-size: 0.75rem;
}
</style>
