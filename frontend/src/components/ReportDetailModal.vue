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
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                周报详情
              </DialogTitle>
              
              <div v-if="report" class="mt-4 space-y-4">
                
                <div class="flex space-x-8 text-sm">
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-500">周开始日期</span>
                    <span>{{ formatDate(report.weekStartDate) }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-500">提交人</span>
                    <span>{{ report.author.nickname }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-500">提交时间</span>
                    <span>{{ formatDateTime(report.createdAt) }}</span>
                  </div>
                </div>

                <div class="report-section">
                  <label>本周总结</label>
                  <p>{{ report.summaryThisWeek }}</p>
                </div>

                <div class="report-section">
                  <label>下周计划</label>
                  <p>{{ report.planNextWeek }}</p>
                </div>

                <div class="report-section">
                  <label>遇到的问题</label>
                  <p>{{ report.problemsEncountered || '无' }}</p>
                </div>

                <div class="report-section">
                  <label>其他</label>
                  <p>{{ report.other || '无' }}</p>
                </div>

              </div>

              <div class="mt-6 flex justify-end">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                >
                  关闭
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
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

// (这是一个“哑”组件，它只接收 props)
defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  report: {
    type: Object,
    default: null,
  }
});

const emit = defineEmits(['close']);

function closeModal() {
  emit('close');
}

// (辅助函数)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
}
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('zh-CN', { hour12: false });
}
</script>

<style scoped>
/* (用于显示周报内容的样式) */
.report-section {
  margin-top: 1rem;
}
.report-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: bold;
  font-size: 0.875rem; /* 14px */
}
.report-section p {
  padding: 0.75rem;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f8f9fa;
  font-size: 0.9rem;
  /* (关键) 允许长文本自动换行 */
  white-space: pre-wrap; 
  word-wrap: break-word;
}
</style>