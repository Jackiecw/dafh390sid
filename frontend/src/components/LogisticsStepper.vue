<template>
  <div class="stepper-container">
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      class="step-item"
      @click="onStepClick(step.key)"
      :class="{
        'is-completed': step.isCompleted,
        'is-current': step.isCurrent,
        'is-clickable': isAdmin,
      }"
      :title="step.title"
    >
      <div class="step-dot">
        <svg
          v-if="step.isCompleted"
          class="step-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span v-else class="step-number">{{ index + 1 }}</span>
      </div>

      <div class="step-label">{{ step.label }}</div>

      <div v-if="index < steps.length - 1" class="step-line"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 当前状态 (e.g., "SHIPPING")
  currentStatus: {
    type: String,
    required: true,
  },
  // 关联的所有事件 (用于显示提示)
  events: {
    type: Array,
    default: () => [],
  },
  // 是否允许点击 (用于触发状态更新)
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['step-click']);

// 定义物流链路中的所有节点
const STATUS_MAP = [
  { key: 'FACTORY', label: '生产' },
  { key: 'WAREHOUSE_READY', label: '待出库' },
  { key: 'CONTAINER_LOADED', label: '装柜' },
  { key: 'EXPORT_CUSTOMS', label: '出口' },
  { key: 'SHIPPING', label: '运输' },
  { key: 'IMPORT_CUSTOMS', label: '进口' },
  { key: 'LOCAL_DELIVERY', label: '派送' },
  { key: 'COMPLETED', label: '入仓' },
];

// (核心) 计算每个步骤的详细状态
const steps = computed(() => {
  const currentIndex = STATUS_MAP.findIndex((s) => s.key === props.currentStatus);

  return STATUS_MAP.map((step, index) => {
    const event = props.events.find((e) => e.status === step.key);
    const isCompleted = index < currentIndex;
    const isCurrent = index === currentIndex;

    let title = step.label;
    if (event) {
      const date = new Date(event.eventDate).toISOString().split('T')[0];
      title += `\n日期: ${date}`;
      if (event.notes) {
        title += `\n备注: ${event.notes}`;
      }
    } else if (isCurrent) {
      title += ' (当前状态)';
    } else if (isCompleted) {
      title += ' (已完成 - 缺失事件数据)';
    } else {
      title += ' (未开始)';
    }

    return {
      ...step,
      isCompleted,
      isCurrent,
      title,
    };
  });
});

// 当 Admin 点击时，向父组件发送事件
function onStepClick(statusKey) {
  if (!props.isAdmin) return;
  emit('step-click', statusKey);
}
</script>

<style scoped>
.stepper-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  padding: 0.5rem 0;
}
.step-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  text-align: center;
}
.step-item.is-clickable {
  cursor: pointer;
}

/* 圆点 */
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #e5e7eb; /* gray-200 */
  color: #6b7280; /* gray-500 */
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s ease;
  z-index: 1;
}

/* 标签 */
.step-label {
  font-size: 0.75rem; /* 12px */
  color: #6b7280; /* gray-500 */
  margin-top: 0.5rem;
  font-weight: 500;
}

/* 连接线 */
.step-line {
  position: absolute;
  top: 14px; /* 圆点高度的一半 */
  left: 50%;
  width: 100%;
  height: 2px;
  background-color: #e5e7eb; /* gray-200 */
  z-index: 0;
}

/* --- 状态 --- */

/* 已完成 (Completed) */
.step-item.is-completed .step-dot {
  background-color: #3b82f6; /* blue-600 */
  border-color: #3b82f6;
  color: #ffffff;
}
.step-item.is-completed .step-label {
  color: #1f2937; /* gray-800 */
  font-weight: 600;
}
.step-item.is-completed .step-line {
  background-color: #3b82f6; /* blue-600 */
}
.step-icon {
  width: 16px;
  height: 16px;
  color: #ffffff;
}

/* 当前 (Current) */
.step-item.is-current .step-dot {
  background-color: #ffffff;
  border-color: #3b82f6; /* blue-600 */
  color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
.step-item.is-current .step-label {
  color: #3b82f6;
  font-weight: 700;
}

/* 可点击的悬停效果 */
.step-item.is-clickable:hover:not(.is-completed):not(.is-current) .step-dot {
  background-color: #f3f4f6; /* gray-100 */
  border-color: #9ca3af; /* gray-400 */
}
</style>