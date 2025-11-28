<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Data Import Center</p>
          <h2 class="text-3xl font-semibold">数据导入中心</h2>
          <p class="text-sm text-white/80">批量导入平台报表，或手动录入单条销售数据，保持数据实时更新。</p>
        </div>
        <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
          <p class="text-xs text-white/70">当前操作</p>
          <p class="text-xl font-semibold">{{ currentTab }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex flex-wrap gap-3">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="currentTab = tab.name"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === tab.name
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <component :is="currentTabComponent" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BatchImport from './BatchImport.vue'
import SalesForm from './SalesForm.vue'

const tabs = [
  { name: '批量导入', component: BatchImport },
  { name: '手动录入', component: SalesForm },
]

const currentTab = ref('批量导入')

const currentTabComponent = computed(() => {
  return tabs.find(t => t.name === currentTab.value)?.component
})
</script>

