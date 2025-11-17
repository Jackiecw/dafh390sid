<template>
  <div
    class="kanban-card"
    :class="{ 'kanban-card--draggable': isAdmin }"
    :draggable="isAdmin"
    @dragstart="onDragStart"
    @click="onClick"
  >
    <div class="card-header">
      <div>
        <p class="card-batch-number">{{ batch.batchNumber }}</p>
        <p class="card-status">{{ statusLabel }}</p>
      </div>
      <div class="card-country" :title="batch.country.name || batch.country.code">
        {{ batch.country.code }}
      </div>
    </div>

    <div class="card-body">
      <p class="card-product" :title="batch.product.name">
        {{ batch.product.sku }} · {{ batch.product.name }}
      </p>
      <p v-if="batch.productSpec" class="card-spec">规格：{{ batch.productSpec }}</p>
      <p class="card-quantity">数量 × {{ batch.quantity }}</p>
    </div>

    <div class="card-footer">
      <p v-if="formattedPrice" class="card-price">¥{{ formattedPrice }}</p>
      <span class="card-eta" :class="etaInfo.state">{{ etaInfo.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const STATUS_LABELS = {
  FACTORY: '生产中',
  WAREHOUSE_READY: '待出库',
  CONTAINER_LOADED: '已装柜',
  EXPORT_CUSTOMS: '出口清关',
  SHIPPING: '国际运输',
  IMPORT_CUSTOMS: '进口清关',
  LOCAL_DELIVERY: '本地派送',
  COMPLETED: '已入仓',
};

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

const statusLabel = computed(() => STATUS_LABELS[props.batch.currentStatus] || '未知状态');

const formattedPrice = computed(() => {
  if (!props.batch.totalPrice) return null;
  return Number(props.batch.totalPrice).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
});

const etaInfo = computed(() => {
  if (!props.batch.estimatedWarehouseDate) {
    return { label: '无 ETA', state: 'eta-none' };
  }
  const eta = new Date(props.batch.estimatedWarehouseDate);
  const now = new Date();
  const diffDays = Math.round((eta - now) / (1000 * 60 * 60 * 24));
  const formatted = eta.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

  if (diffDays < 0) {
    return { label: `延误 ${Math.abs(diffDays)} 天`, state: 'eta-delay' };
  }
  if (diffDays <= 7) {
    return { label: `${formatted} · 即将入仓`, state: 'eta-soon' };
  }
  return { label: `${formatted} ETA`, state: 'eta-normal' };
});

function onDragStart(event) {
  if (!props.isAdmin) return;
  event.dataTransfer.setData('text/plain', props.batch.id);
  event.dataTransfer.dropEffect = 'move';
  emit('dragstart', props.batch);
}

function onClick() {
  emit('click', props.batch);
}
</script>

<style scoped>
.kanban-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 12px 24px -20px rgba(15, 23, 42, 0.8);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -20px rgba(30, 64, 175, 0.5);
  border-color: #cbd5f5;
}
.kanban-card--draggable {
  cursor: grab;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}
.card-batch-number {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1d4ed8;
}
.card-status {
  font-size: 0.75rem;
  color: #475569;
}
.card-country {
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  background-color: #e2e8f0;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.75rem;
}
.card-product {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-spec,
.card-quantity {
  font-size: 0.75rem;
  color: #475569;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}
.card-price {
  font-weight: 600;
  color: #0f172a;
}
.card-eta {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #e2e8f0;
  color: #0f172a;
}
.card-eta.eta-delay {
  background-color: #fee2e2;
  color: #b91c1c;
}
.card-eta.eta-soon {
  background-color: #dbeafe;
  color: #1d4ed8;
}
.card-eta.eta-none {
  background-color: #f8fafc;
  color: #94a3b8;
}
</style>
