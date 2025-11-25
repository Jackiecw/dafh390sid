<template>
  <div class="space-y-4">
    <section class="rounded-xl bg-sky-600 p-4 text-white shadow">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-white/70">Production & Logistics</p>
          <h2 class="text-xl font-semibold">生产与物流管理</h2>
          <p class="text-xs text-white/80">批次自动编号，订单状态全链路追踪。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <div v-for="stat in heroStats" :key="stat.label" class="rounded-lg bg-white/15 px-3 py-2">
            <p class="text-[11px] text-white/70">{{ stat.label }}</p>
            <p class="text-lg font-semibold">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="currentTab = tab.key"
          :class="[
            'rounded-lg px-3 py-2 text-sm font-semibold',
            currentTab === tab.key ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700',
          ]"
        >
          {{ tab.label }} <span v-if="tab.badge" class="text-xs text-gray-200">({{ tab.badge }})</span>
        </button>
      </div>

      <p v-if="errorMessage" class="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <div v-if="isLoading" class="mt-3 text-sm text-gray-500">加载中...</div>

      <div v-else class="mt-3 space-y-4">
        <!-- 生产管理 -->
        <div v-if="currentTab === 'production'" class="space-y-3">
          <div class="grid gap-2 md:grid-cols-3">
            <div class="rounded-lg border border-sky-100 bg-sky-50 p-3">
              <p class="text-xs text-sky-700">产品数量</p>
              <p class="text-lg font-semibold text-sky-900">{{ formatNumber(overallTotals.totalQuantity) }}</p>
            </div>
            <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p class="text-xs text-emerald-700">金额</p>
              <p class="text-lg font-semibold text-emerald-900">{{ formatCurrency(overallTotals.totalPrice) }}</p>
            </div>
            <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p class="text-xs text-gray-700">箱/体积</p>
              <p class="text-lg font-semibold text-gray-900">
                箱 {{ formatNumber(overallTotals.totalCartons) }} · CBM {{ formatNumber(overallTotals.totalCbm) }}
              </p>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 p-3 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-gray-500">新批次</p>
                <h3 class="text-base font-semibold text-gray-900">创建批次并录入订单</h3>
              </div>
              <button
                v-if="isAdmin"
                type="button"
                class="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                @click="addDraft"
              >
                + 增加订单
              </button>
            </div>

            <div class="grid gap-2 md:grid-cols-3">
              <div>
                <label class="text-xs text-gray-600">销售国家 *</label>
                <select v-model="selectedCountry" class="form-input mt-1 w-full">
                  <option disabled value="">请选择</option>
                  <option v-for="c in countryOptions" :key="c.code" :value="c.code">
                    {{ c.name }} ({{ c.code }})
                  </option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="text-xs text-gray-600">批次备注</label>
                <input v-model="batchNotes" type="text" class="form-input mt-1 w-full" />
              </div>
            </div>

            <div
              v-for="(draft, idx) in orderDrafts"
              :key="idx"
              class="rounded-md border border-gray-100 p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-gray-900">订单 #{{ idx + 1 }}</p>
                <button
                  v-if="orderDrafts.length > 1"
                  class="text-xs text-red-500"
                  type="button"
                  @click="removeDraft(idx)"
                >
                  删除
                </button>
              </div>

              <div class="grid gap-2 md:grid-cols-3">
                <div>
                  <label class="text-xs text-gray-600">订单日期 *</label>
                  <input v-model="draft.orderDate" type="date" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">SKU *</label>
                  <select v-model="draft.productId" class="form-input mt-1 w-full">
                    <option disabled value="">请选择</option>
                    <option v-for="p in productOptions" :key="p.id" :value="p.id">
                      {{ p.sku }} ({{ p.name }})
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-600">SKU 名称 *</label>
                  <input v-model="draft.skuName" type="text" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">产品颜色 *</label>
                  <input v-model="draft.productColor" type="text" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">产品规格 *</label>
                  <input v-model="draft.productSpec" type="text" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">销售地 *</label>
                  <input v-model="draft.salesRegion" type="text" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">插头规格 *</label>
                  <input v-model="draft.plugSpec" type="text" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">数量 *</label>
                  <input v-model.number="draft.quantity" type="number" min="1" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">单价 *</label>
                  <input v-model.number="draft.unitPrice" type="number" step="0.01" class="form-input mt-1 w-full" />
                </div>
                <div>
                  <label class="text-xs text-gray-600">总价</label>
                  <div class="mt-2 text-sm font-semibold text-gray-900">
                    {{ formatCurrency(calcDraftTotal(draft)) }}
                  </div>
                </div>
              </div>

              <div class="grid gap-2 md:grid-cols-4">
                <input v-model="draft.logisticsProvider" class="form-input" placeholder="物流服务商" />
                <input v-model.number="draft.logisticsUnitPrice" type="number" class="form-input" placeholder="物流单价" />
                <input v-model="draft.warehousingProvider" class="form-input" placeholder="仓储服务商" />
                <input v-model="draft.outboundDate" type="date" class="form-input" placeholder="出库日期" />
                <input v-model.number="draft.cartonCount" type="number" class="form-input" placeholder="箱数" />
                <input v-model.number="draft.totalCbm" type="number" class="form-input" placeholder="总体积" />
                <input v-model.number="draft.totalKg" type="number" class="form-input" placeholder="总重量" />
                <input v-model.number="draft.billingCbm" type="number" class="form-input" placeholder="计费体积" />
                <input v-model.number="draft.billingKg" type="number" class="form-input" placeholder="计费重量" />
                <select v-model="draft.billingMethod" class="form-input">
                  <option value="">计费方式</option>
                  <option value="BY_CBM">按体积</option>
                  <option value="BY_WEIGHT">按重量</option>
                  <option value="FLAT_FEE">一次性</option>
                </select>
                <input v-model.number="draft.logisticsFee" type="number" class="form-input" placeholder="物流费用" />
                <input v-model="draft.warehouseDate" type="date" class="form-input" placeholder="入仓日期" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-3">
              <p class="text-xs text-gray-500">创建后状态为“生产中”，编号自动生成。</p>
              <button
                v-if="isAdmin"
                type="button"
                class="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
                @click="submitBatch"
              >
                保存批次
              </button>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th class="px-3 py-2 text-left">批次</th>
                  <th class="px-3 py-2 text-left">国家</th>
                  <th class="px-3 py-2 text-left">订单数</th>
                  <th class="px-3 py-2 text-left">数量</th>
                  <th class="px-3 py-2 text-left">金额</th>
                  <th class="px-3 py-2 text-left">箱</th>
                  <th class="px-3 py-2 text-left">体积</th>
                  <th class="px-3 py-2 text-left">计费重</th>
                  <th class="px-3 py-2 text-left">计费体</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-if="batches.length === 0">
                  <td colspan="9" class="px-3 py-4 text-center text-gray-400">暂无批次</td>
                </tr>
                <tr v-for="batch in batches" :key="batch.id" class="bg-white">
                  <td class="px-3 py-2 font-semibold text-gray-900">{{ batch.batchCode }}</td>
                  <td class="px-3 py-2">{{ batch.countryCode }}</td>
                  <td class="px-3 py-2">{{ batch.orders.length }}</td>
                  <td class="px-3 py-2">{{ formatNumber(batch.stats.totalQuantity) }}</td>
                  <td class="px-3 py-2">{{ formatCurrency(batch.stats.totalPrice) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(batch.stats.totalCartons) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(batch.stats.totalCbm) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(batch.stats.totalBillingKg) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(batch.stats.totalBillingCbm) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 物流管理 -->
        <div v-else class="space-y-3">
          <div class="grid gap-2 md:grid-cols-3">
            <div class="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
              <p class="text-xs text-indigo-700">进行中订单</p>
              <p class="text-lg font-semibold text-indigo-900">{{ inProgressOrders.length }}</p>
              <p class="text-xs text-indigo-600">
                数量 {{ formatNumber(inProgressSummary.totalQuantity) }} · 金额
                {{ formatCurrency(inProgressSummary.totalPrice) }}
              </p>
            </div>
            <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p class="text-xs text-emerald-700">已完成订单</p>
              <p class="text-lg font-semibold text-emerald-900">{{ completedOrders.length }}</p>
              <p class="text-xs text-emerald-600">
                数量 {{ formatNumber(completedSummary.totalQuantity) }} · 金额
                {{ formatCurrency(completedSummary.totalPrice) }}
              </p>
            </div>
            <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p class="text-xs text-gray-700">全局汇总</p>
              <p class="text-sm font-semibold text-gray-900">
                箱 {{ formatNumber(overallTotals.totalCartons) }} · CBM {{ formatNumber(overallTotals.totalCbm) }}
              </p>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200">
            <div class="border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">进行中</div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr>
                    <th class="px-3 py-2 text-left">批次</th>
                    <th class="px-3 py-2 text-left">编号</th>
                    <th class="px-3 py-2 text-left">订单日期</th>
                    <th class="px-3 py-2 text-left">状态</th>
                    <th class="px-3 py-2 text-left">SKU</th>
                    <th class="px-3 py-2 text-left">数量</th>
                    <th class="px-3 py-2 text-left">单价</th>
                    <th class="px-3 py-2 text-left">总价</th>
                    <th class="px-3 py-2 text-left">物流</th>
                    <th class="px-3 py-2 text-left">仓储</th>
                    <th class="px-3 py-2 text-left">箱</th>
                    <th class="px-3 py-2 text-left">体积</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-if="inProgressOrders.length === 0">
                    <td colspan="12" class="px-3 py-4 text-center text-gray-400">暂无进行中订单</td>
                  </tr>
                  <tr
                    v-for="order in inProgressOrders"
                    :key="order.id"
                    class="cursor-pointer bg-white hover:bg-gray-50"
                    @click="openOrderDetail(order.id)"
                  >
                    <td class="px-3 py-2 font-semibold text-gray-900">{{ order.batchCode }}</td>
                    <td class="px-3 py-2">{{ order.orderCode }}</td>
                    <td class="px-3 py-2">{{ formatDate(order.orderDate) }}</td>
                    <td class="px-3 py-2">{{ statusLabel(order.status) }}</td>
                    <td class="px-3 py-2">{{ order.skuName }}</td>
                    <td class="px-3 py-2">{{ order.quantity }}</td>
                    <td class="px-3 py-2">{{ formatCurrency(order.unitPrice) }}</td>
                    <td class="px-3 py-2">{{ formatCurrency(order.totalPrice) }}</td>
                    <td class="px-3 py-2">{{ order.logisticsProvider || '-' }}</td>
                    <td class="px-3 py-2">{{ order.warehousingProvider || '-' }}</td>
                    <td class="px-3 py-2">{{ order.cartonCount ?? '-' }}</td>
                    <td class="px-3 py-2">{{ order.totalCbm ?? '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200">
            <div class="border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">已完成</div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr>
                    <th class="px-3 py-2 text-left">批次</th>
                    <th class="px-3 py-2 text-left">编号</th>
                    <th class="px-3 py-2 text-left">订单日期</th>
                    <th class="px-3 py-2 text-left">状态日期</th>
                    <th class="px-3 py-2 text-left">SKU</th>
                    <th class="px-3 py-2 text-left">数量</th>
                    <th class="px-3 py-2 text-left">单价</th>
                    <th class="px-3 py-2 text-left">总价</th>
                    <th class="px-3 py-2 text-left">物流</th>
                    <th class="px-3 py-2 text-left">仓储</th>
                    <th class="px-3 py-2 text-left">箱</th>
                    <th class="px-3 py-2 text-left">体积</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-if="completedOrders.length === 0">
                    <td colspan="12" class="px-3 py-4 text-center text-gray-400">暂无已完成订单</td>
                  </tr>
                  <tr
                    v-for="order in completedOrders"
                    :key="order.id"
                    class="cursor-pointer bg-white hover:bg-gray-50"
                    @click="openOrderDetail(order.id)"
                  >
                    <td class="px-3 py-2 font-semibold text-gray-900">{{ order.batchCode }}</td>
                    <td class="px-3 py-2">{{ order.orderCode }}</td>
                    <td class="px-3 py-2">{{ formatDate(order.orderDate) }}</td>
                    <td class="px-3 py-2">{{ formatDate(order.statusDate) || '-' }}</td>
                    <td class="px-3 py-2">{{ order.skuName }}</td>
                    <td class="px-3 py-2">{{ order.quantity }}</td>
                    <td class="px-3 py-2">{{ formatCurrency(order.unitPrice) }}</td>
                    <td class="px-3 py-2">{{ formatCurrency(order.totalPrice) }}</td>
                    <td class="px-3 py-2">{{ order.logisticsProvider || '-' }}</td>
                    <td class="px-3 py-2">{{ order.warehousingProvider || '-' }}</td>
                    <td class="px-3 py-2">{{ order.cartonCount ?? '-' }}</td>
                    <td class="px-3 py-2">{{ order.totalCbm ?? '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="detailModalOpen && detailOrder"
      class="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-4xl space-y-3 rounded-lg bg-white p-4 shadow-2xl">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-500">订单详情</p>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ detailOrder.orderCode }} · {{ detailOrder.skuName }}
            </h3>
            <p class="text-xs text-gray-500">
              批次 {{ detailOrder.batchCode }} · 状态 {{ statusLabel(detailOrder.status) }}
            </p>
          </div>
          <button class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600" @click="closeDetail">关闭</button>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <div class="space-y-2 rounded-md border border-gray-200 p-3">
            <p class="text-sm font-semibold text-gray-900">状态时间轴</p>
            <div v-for="step in statusSteps" :key="step.key" class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                  :class="stepState(step.key).isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ stepIndex(step.key) + 1 }}
                </span>
                <div>
                  <p class="text-sm text-gray-900">{{ step.label }}</p>
                  <p class="text-xs text-gray-500">{{ stepState(step.key).date || '未填写' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <input
                  v-model="statusDateInputs[step.key]"
                  type="date"
                  class="form-input w-28"
                  :disabled="!isAdmin"
                />
                <button
                  v-if="isAdmin"
                  type="button"
                  class="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white"
                  @click="updateStatus(step.key)"
                >
                  更新
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-md border border-gray-200 p-3">
            <p class="text-sm font-semibold text-gray-900">物流信息</p>
            <div class="grid gap-2 md:grid-cols-2">
              <input v-model="logisticsForm.logisticsProvider" class="form-input" placeholder="物流服务商" />
              <input v-model.number="logisticsForm.logisticsUnitPrice" class="form-input" type="number" placeholder="物流单价" />
              <input v-model="logisticsForm.warehousingProvider" class="form-input" placeholder="仓储服务商" />
              <select v-model="logisticsForm.billingMethod" class="form-input">
                <option value="">计费方式</option>
                <option value="BY_CBM">按体积</option>
                <option value="BY_WEIGHT">按重量</option>
                <option value="FLAT_FEE">一次性</option>
              </select>
              <input v-model.number="logisticsForm.billingCbm" class="form-input" type="number" placeholder="计费体积" />
              <input v-model.number="logisticsForm.billingKg" class="form-input" type="number" placeholder="计费重量" />
              <input v-model.number="logisticsForm.cartonCount" class="form-input" type="number" placeholder="箱数" />
              <input v-model.number="logisticsForm.totalCbm" class="form-input" type="number" placeholder="总体积" />
              <input v-model.number="logisticsForm.totalKg" class="form-input" type="number" placeholder="总重量" />
              <input v-model.number="logisticsForm.logisticsFee" class="form-input" type="number" placeholder="物流费用" />
              <input v-model="logisticsForm.outboundDate" class="form-input" type="date" placeholder="出库日期" />
              <input v-model="logisticsForm.warehouseDate" class="form-input" type="date" placeholder="入仓日期" />
              <div class="md:col-span-2">
                <input v-model="logisticsForm.notes" class="form-input" placeholder="备注" />
              </div>
            </div>
            <div class="flex justify-end">
              <button
                v-if="isAdmin"
                type="button"
                class="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                @click="saveLogistics"
              >
                保存物流信息
              </button>
            </div>
          </div>
        </div>

        <div class="grid gap-2 rounded-md border border-gray-200 p-3 md:grid-cols-3">
          <div>
            <p class="text-xs text-gray-500">产品信息</p>
            <p class="text-sm font-semibold text-gray-900">
              {{ detailOrder.productColor }} / {{ detailOrder.productSpec }} / {{ detailOrder.salesRegion }}
            </p>
            <p class="text-xs text-gray-500">插头：{{ detailOrder.plugSpec }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">数量 / 单价 / 总价</p>
            <p class="text-sm font-semibold text-gray-900">
              {{ detailOrder.quantity }} · {{ formatCurrency(detailOrder.unitPrice) }} ·
              {{ formatCurrency(detailOrder.totalPrice) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500">物流费用</p>
            <p class="text-sm font-semibold text-gray-900">
              {{ detailOrder.logisticsFee ? formatCurrency(detailOrder.logisticsFee) : '待计算' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import apiClient from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.role === 'admin');

const currentTab = ref('production');
const isLoading = ref(true);
const errorMessage = ref('');

const batches = ref([]);
const overallTotals = reactive({
  totalQuantity: 0,
  totalPrice: 0,
  totalCartons: 0,
  totalCbm: 0,
  totalBillingKg: 0,
  totalBillingCbm: 0,
});

const inProgressOrders = ref([]);
const completedOrders = ref([]);
const inProgressSummary = reactive({
  totalQuantity: 0,
  totalPrice: 0,
  totalCartons: 0,
  totalCbm: 0,
  totalBillingKg: 0,
  totalBillingCbm: 0,
});
const completedSummary = reactive({
  totalQuantity: 0,
  totalPrice: 0,
  totalCartons: 0,
  totalCbm: 0,
  totalBillingKg: 0,
  totalBillingCbm: 0,
});

const productOptions = ref([]);
const countryOptions = ref([]);

const selectedCountry = ref('');
const batchNotes = ref('');
const orderDrafts = ref([createEmptyOrderDraft()]);

const detailModalOpen = ref(false);
const detailOrder = ref(null);
const statusDateInputs = reactive({});
const logisticsForm = reactive({
  logisticsProvider: '',
  logisticsUnitPrice: '',
  warehousingProvider: '',
  billingMethod: '',
  billingCbm: '',
  billingKg: '',
  cartonCount: '',
  totalCbm: '',
  totalKg: '',
  logisticsFee: '',
  outboundDate: '',
  warehouseDate: '',
  notes: '',
});

const statusSteps = [
  { key: 'IN_PRODUCTION', label: '生产中' },
  { key: 'PRODUCTION_DONE', label: '生产完成' },
  { key: 'SHIPPED_OUT', label: '已出库' },
  { key: 'CONTAINER_LOADED', label: '已装柜' },
  { key: 'EXPORTED', label: '出口' },
  { key: 'IN_TRANSIT', label: '运输' },
  { key: 'IMPORTED', label: '进口' },
  { key: 'DELIVERING', label: '派送' },
  { key: 'WAREHOUSED', label: '入仓' },
];
const statusOrder = statusSteps.map((s) => s.key);

const tabs = computed(() => [
  { key: 'production', label: '生产管理', badge: batches.value.length },
  { key: 'logistics', label: '物流管理', badge: inProgressOrders.value.length + completedOrders.value.length },
]);

const heroStats = computed(() => [
  { label: '总产品数', value: formatNumber(overallTotals.totalQuantity), desc: '所有批次累计数量' },
  { label: '在途订单', value: inProgressOrders.value.length || 0, desc: '未入仓' },
  { label: '已完成', value: completedOrders.value.length || 0, desc: '已入仓' },
]);

const numberFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

function formatNumber(value) {
  return numberFormatter.format(value || 0);
}
function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return currencyFormatter.format(Number(value));
}
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyOrderDraft() {
  return {
    orderDate: today(),
    productId: '',
    skuName: '',
    productColor: '',
    productSpec: '',
    salesRegion: '',
    plugSpec: '',
    quantity: 1,
    unitPrice: 0,
    outboundDate: '',
    logisticsProvider: '',
    logisticsUnitPrice: '',
    warehousingProvider: '',
    cartonCount: '',
    totalCbm: '',
    totalKg: '',
    billingCbm: '',
    billingKg: '',
    billingMethod: '',
    logisticsFee: '',
    warehouseDate: '',
    notes: '',
  };
}

function calcDraftTotal(draft) {
  return Number(draft.quantity || 0) * Number(draft.unitPrice || 0);
}

function stepIndex(key) {
  return statusOrder.indexOf(key);
}

function statusLabel(key) {
  const found = statusSteps.find((s) => s.key === key);
  return found ? found.label : key;
}

function stepState(key) {
  const event = detailOrder.value?.statusEvents?.find((e) => e.status === key);
  const isDone = event || statusOrder.indexOf(detailOrder.value?.status) >= statusOrder.indexOf(key);
  return {
    isDone: Boolean(isDone),
    date: event ? formatDate(event.occurredAt) : '',
  };
}

function addDraft() {
  orderDrafts.value.push({
    ...createEmptyOrderDraft(),
    salesRegion: selectedCountry.value || '',
  });
}

function removeDraft(idx) {
  orderDrafts.value.splice(idx, 1);
}

async function fetchOptions() {
  try {
    const [productRes, countryRes] = await Promise.all([
      apiClient.get('/admin/products'),
      apiClient.get('/admin/countries'),
    ]);
    productOptions.value = productRes.data || [];
    countryOptions.value = countryRes.data || [];
  } catch (error) {
    console.error('加载选项失败', error);
    errorMessage.value = '加载产品或国家选项失败';
  }
}

function applyTotals(target, source = {}) {
  target.totalQuantity = source.totalQuantity || 0;
  target.totalPrice = source.totalPrice || 0;
  target.totalCartons = source.totalCartons || 0;
  target.totalCbm = source.totalCbm || 0;
  target.totalBillingKg = source.totalBillingKg || 0;
  target.totalBillingCbm = source.totalBillingCbm || 0;
}

async function fetchBatches() {
  const res = await apiClient.get('/production/batches');
  batches.value = res.data?.batches || [];
  applyTotals(overallTotals, res.data?.overall);
}

async function fetchOrders() {
  const [ingRes, doneRes] = await Promise.all([
    apiClient.get('/production/orders', { params: { view: 'in-progress' } }),
    apiClient.get('/production/orders', { params: { view: 'completed' } }),
  ]);
  inProgressOrders.value = ingRes.data?.orders || [];
  completedOrders.value = doneRes.data?.orders || [];
  applyTotals(inProgressSummary, ingRes.data?.summary);
  applyTotals(completedSummary, doneRes.data?.summary);
}

async function refreshAll() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await Promise.all([fetchBatches(), fetchOrders(), fetchOptions()]);
  } catch (error) {
    console.error('加载数据失败', error);
    errorMessage.value = error.response?.data?.error || '加载数据失败';
  } finally {
    isLoading.value = false;
  }
}

async function submitBatch() {
  if (!isAdmin.value) return;
  if (!selectedCountry.value) {
    errorMessage.value = '请先选择销售国家';
    return;
  }
  const orders = orderDrafts.value.map((draft) => {
    const product = productOptions.value.find((p) => p.id === draft.productId);
    return {
      orderDate: draft.orderDate || today(),
      productId: draft.productId,
      skuName: draft.skuName || product?.sku || '',
      productColor: draft.productColor,
      productSpec: draft.productSpec,
      salesRegion: draft.salesRegion || selectedCountry.value,
      plugSpec: draft.plugSpec,
      quantity: Number(draft.quantity || 0),
      unitPrice: Number(draft.unitPrice || 0),
      totalPrice: calcDraftTotal(draft),
      outboundDate: draft.outboundDate || null,
      logisticsProvider: draft.logisticsProvider || null,
      logisticsUnitPrice: draft.logisticsUnitPrice === '' ? null : Number(draft.logisticsUnitPrice),
      warehousingProvider: draft.warehousingProvider || null,
      cartonCount: draft.cartonCount === '' ? null : Number(draft.cartonCount),
      totalCbm: draft.totalCbm === '' ? null : Number(draft.totalCbm),
      totalKg: draft.totalKg === '' ? null : Number(draft.totalKg),
      billingCbm: draft.billingCbm === '' ? null : Number(draft.billingCbm),
      billingKg: draft.billingKg === '' ? null : Number(draft.billingKg),
      billingMethod: draft.billingMethod || null,
      logisticsFee: draft.logisticsFee === '' ? null : Number(draft.logisticsFee),
      warehouseDate: draft.warehouseDate || null,
      notes: draft.notes || null,
    };
  });

  try {
    await apiClient.post('/admin/production/batches', {
      countryCode: selectedCountry.value,
      notes: batchNotes.value || null,
      orders,
    });
    batchNotes.value = '';
    orderDrafts.value = [createEmptyOrderDraft()];
    await refreshAll();
  } catch (error) {
    console.error('创建批次失败', error);
    errorMessage.value = error.response?.data?.error || '创建批次失败';
  }
}

async function openOrderDetail(orderId) {
  try {
    const res = await apiClient.get(`/production/orders/${orderId}`);
    detailOrder.value = res.data;
    detailModalOpen.value = true;
    statusSteps.forEach((step) => {
      const event = res.data.statusEvents?.find((e) => e.status === step.key);
      statusDateInputs[step.key] = event ? formatDate(event.occurredAt) : '';
    });
    Object.assign(logisticsForm, {
      logisticsProvider: res.data.logisticsProvider || '',
      logisticsUnitPrice: res.data.logisticsUnitPrice ?? '',
      warehousingProvider: res.data.warehousingProvider || '',
      billingMethod: res.data.billingMethod || '',
      billingCbm: res.data.billingCbm ?? '',
      billingKg: res.data.billingKg ?? '',
      cartonCount: res.data.cartonCount ?? '',
      totalCbm: res.data.totalCbm ?? '',
      totalKg: res.data.totalKg ?? '',
      logisticsFee: res.data.logisticsFee ?? '',
      outboundDate: formatDate(res.data.outboundDate) || '',
      warehouseDate: formatDate(res.data.warehouseDate) || '',
      notes: res.data.notes || '',
    });
  } catch (error) {
    console.error('获取订单详情失败', error);
    errorMessage.value = error.response?.data?.error || '获取订单详情失败';
  }
}

function closeDetail() {
  detailModalOpen.value = false;
  detailOrder.value = null;
}

async function updateStatus(statusKey) {
  if (!detailOrder.value) return;
  const dateVal = statusDateInputs[statusKey] || today();
  try {
    const res = await apiClient.post(`/admin/production/orders/${detailOrder.value.id}/status`, {
      status: statusKey,
      occurredAt: dateVal,
    });
    detailOrder.value = res.data;
    await fetchOrders();
  } catch (error) {
    console.error('更新状态失败', error);
    errorMessage.value = error.response?.data?.error || '更新状态失败';
  }
}

async function saveLogistics() {
  if (!detailOrder.value) return;
  try {
    await apiClient.patch(`/admin/production/orders/${detailOrder.value.id}`, {
      logisticsProvider: logisticsForm.logisticsProvider || null,
      logisticsUnitPrice:
        logisticsForm.logisticsUnitPrice === '' ? null : Number(logisticsForm.logisticsUnitPrice),
      warehousingProvider: logisticsForm.warehousingProvider || null,
      billingMethod: logisticsForm.billingMethod || null,
      billingCbm: logisticsForm.billingCbm === '' ? null : Number(logisticsForm.billingCbm),
      billingKg: logisticsForm.billingKg === '' ? null : Number(logisticsForm.billingKg),
      cartonCount: logisticsForm.cartonCount === '' ? null : Number(logisticsForm.cartonCount),
      totalCbm: logisticsForm.totalCbm === '' ? null : Number(logisticsForm.totalCbm),
      totalKg: logisticsForm.totalKg === '' ? null : Number(logisticsForm.totalKg),
      logisticsFee: logisticsForm.logisticsFee === '' ? null : Number(logisticsForm.logisticsFee),
      outboundDate: logisticsForm.outboundDate || null,
      warehouseDate: logisticsForm.warehouseDate || null,
      notes: logisticsForm.notes || null,
    });
    await openOrderDetail(detailOrder.value.id);
    await fetchOrders();
  } catch (error) {
    console.error('保存物流信息失败', error);
    errorMessage.value = error.response?.data?.error || '保存物流信息失败';
  }
}

onMounted(() => {
  refreshAll();
});
</script>
