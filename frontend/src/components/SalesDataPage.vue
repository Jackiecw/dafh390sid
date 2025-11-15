<template>
  <div class="space-y-8">
    <section class="rounded-3xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] p-6 text-white shadow-xl shadow-blue-900/20">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Sales Intelligence</p>
          <h2 class="text-3xl font-semibold">销售数据</h2>
          <p class="text-sm text-white/80">查看与录入各大渠道的销售指标，保持数据同步。</p>
        </div>
        <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-right backdrop-blur">
          <p class="text-xs text-white/70">当前模式</p>
          <p class="text-xl font-semibold">{{ currentTab === 'management' ? '数据管理' : '数据录入' }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <nav class="flex gap-3">
        <button
          @click="currentTab = 'management'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'management'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          数据管理
        </button>
        <button
          @click="currentTab = 'entry'"
          :class="[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            currentTab === 'entry'
              ? 'bg-[#3B82F6] text-white shadow'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#1F2937]'
          ]"
        >
          数据录入
        </button>
      </nav>
    </section>

    <section class="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div v-if="currentTab === 'management'">
        <SalesDataManagement />
      </div>
      <div v-else>
        <SalesForm />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SalesForm from './SalesForm.vue';
import SalesDataManagement from './SalesDataManagement.vue';

// 默认显示“数据管理”
const currentTab = ref('management'); 
</script>
