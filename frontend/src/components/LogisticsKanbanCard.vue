<template>
  <div
    class="kanban-card"
    :draggable="isAdmin"
    @dragstart="onDragStart"
    @click="onClick"
  >
    <div class="card-header">
      <span class="card-batch-number">{{ batch.batchNumber }}</span>
      <span class="card-country">{{ batch.country.code }}</span>
    </div>
    <p class="card-title" :title="batch.product.name">
      {{ batch.product.sku }}
    </p>
    <div class="card-footer">
      <span class="card-quantity">x {{ batch.quantity }}</span>
      <span class="card-date">{{ etaDate }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  batch: {
    type: Object,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click', 'dragstart']);

// (计算预计入仓日期)
const etaDate = computed(() => {
  if (!props.batch.estimatedWarehouseDate) return '无ETA';
  return new Date(props.batch.estimatedWarehouseDate)
    .toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
});

function onDragStart(event) {
  if (!props.isAdmin) return;
  // (将批次 ID 放入拖拽数据中)
  event.dataTransfer.setData('text/plain', props.batch.id);
  event.dataTransfer.dropEffect = 'move';
}

function onClick() {
  // (点击卡片，通知父组件)
  emit('click', props.batch);
}
</script>

<style scoped>
.kanban-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb; /* gray-200 */
  border-radius: 0.5rem; /* rounded-lg */
  padding: 0.75rem; /* p-3 */
  margin-bottom: 0.5rem; /* mb-2 */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.kanban-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db; /* gray-300 */
}
.admin-draggable {
  cursor: move;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}
.card-batch-number {
  font-size: 0.875rem; /* text-sm */
  font-weight: 600; /* font-semibold */
  color: #3b82f6; /* text-blue-600 */
}
.card-country {
  font-size: 0.75rem; /* text-xs */
  font-weight: 600;
  color: #6b7280; /* gray-500 */
  background-color: #f3f4f6; /* gray-100 */
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}
.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937; /* gray-800 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #4b5563; /* gray-600 */
}
.card-quantity {
  font-weight: 500;
}
.card-date {
  font-weight: 500;
}
</style>