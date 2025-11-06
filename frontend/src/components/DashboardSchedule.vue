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
                日程
              </DialogTitle>

              <div class="mt-4">
                <TabGroup>
                  <TabList class="flex space-x-1 rounded-xl bg-indigo-100 p-1">
                    <Tab v-for="category in ['本周重点', '今日', '明日']"
                         :key="category"
                         v-slot="{ selected }"
                         as="template"
                    >
                      <button :class="[
                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                        'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-indigo-200 ring-white',
                        selected
                          ? 'bg-white text-indigo-700 shadow'
                          : 'text-indigo-500 hover:bg-white/[0.12] hover:text-indigo-600',
                      ]">
                        {{ category }}
                      </button>
                    </Tab>
                  </TabList>

                  <TabPanels class="mt-4">
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[200px]">
                      <h4 class="font-bold text-stone-900 mb-2">周报计划</h4>
                      <p class="text-sm text-stone-600 whitespace-pre-wrap">
                        {{ planNextWeek || '暂无计划' }}
                      </p>
                    </TabPanel>
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[200px]">
                      <p class="text-stone-500 text-center">
                        (日历功能 - "今日" 正在开发中...)
                      </p>
                    </TabPanel>
                    <TabPanel class="p-4 bg-stone-50 rounded-lg min-h-[200px]">
                      <p class="text-stone-500 text-center">
                        (日历功能 - "明日" 正在开发中...)
                      </p>
                    </TabPanel>
                  </TabPanels>
                </TabGroup>
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
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@headlessui/vue';

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  planNextWeek: {
    type: String,
    default: '',
  }
});

const emit = defineEmits(['close']);

function closeModal() {
  emit('close');
}
</script>