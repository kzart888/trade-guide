<template>
  <div class="p-3 space-y-2">
    <div class="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur py-0.5 md:py-2 z-10">
      <h1 class="text-sm md:text-lg font-600 leading-5 md:leading-6">计算</h1>
      <button class="px-2 py-0.5 md:px-3 md:py-1.5 bg-blue-600 text-white rounded" @click="onCompute">开始计算</button>
    </div>
    <div v-if="lastUpdatedAt" class="text-xs">
      <span :class="stalenessClass">价格更新时间：{{ new Date(lastUpdatedAt).toLocaleString() }} · {{ minutesAgo }} 分钟前</span>
    </div>
    <div class="space-y-2">
      <label class="flex items-center justify-between gap-2">
        <span class="text-sm whitespace-nowrap">起点城市</span>
        <select v-model="originCityId" class="border rounded px-2 py-1 w-40 min-w-0">
          <option v-for="c in Object.values(cities)" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label class="flex items-center justify-between gap-2">
        <span class="text-sm whitespace-nowrap">体力</span>
        <input v-model.number="stamina" type="number" inputmode="numeric" class="border rounded px-2 py-1 w-28 text-right" />
      </label>
      <label class="flex items-center justify-between gap-2">
        <span class="text-sm whitespace-nowrap">载重</span>
        <input v-model.number="maxWeight" type="number" inputmode="numeric" class="border rounded px-2 py-1 w-28 text-right" />
      </label>
    </div>
    

    <div v-if="plans.length" class="mt-2 bg-white border rounded">
      <div class="px-3 py-1.5 font-600 border-b text-sm">按商品的最佳方案（按利润排序）</div>
      <div v-for="(p,idx) in plans" :key="p.productId" :class="['px-3 py-1.5 border-b last:border-b-0 text-sm grid grid-cols-2 gap-y-1', idx===0 ? 'bg-amber-50' : '']">
        <div>商品：{{ products[p.productId]?.name }}</div>
        <div>目的地：{{ cities[p.toCityId]?.name }}</div>
        <div>最多可买：{{ p.quantity }}</div>
        <div>载重需要：{{ products[p.productId]?.weight * p.quantity }}</div>
        <div>距离：{{ p.distance }}</div>
        <div>总利润：{{ p.totalProfit }}</div>
      </div>
    </div>
    <div v-else class="text-gray-500">暂无可行方案</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useCityStore, useGraphStore, usePriceStore } from '@/stores';
import { computeTopPlansPerBuyable } from '@/core/strategy/computeBestDirectTrip';
import { productService, cityService, graphService, priceService } from '@/services';
import { useUiStore } from '@/stores/ui';
import { humanizeError } from '@/services/errors';
import { useUserStore } from '@/stores/user';

const cityStore = useCityStore();
const graphStore = useGraphStore();
const priceStore = usePriceStore();

const cities = computed(() => cityStore.cities);
const products = computed(() => cityStore.products);
const lastUpdatedAt = computed(() => priceStore.lastUpdatedAt);
const minutesAgo = computed(() => {
  if (!lastUpdatedAt.value) return '-';
  return Math.floor((Date.now() - new Date(lastUpdatedAt.value).getTime()) / 60000);
});
const stalenessClass = computed(() => {
  if (!lastUpdatedAt.value) return 'text-gray-500';
  const m = minutesAgo.value as number;
  if (m >= 90) return 'text-red-600';
  if (m >= 60) return 'text-amber-600';
  return 'text-gray-500';
});

const originCityId = ref('');
const stamina = ref(20);
const maxWeight = ref(100);
const user = useUserStore();

function settingsKey(username: string) {
  // Persist per user; fallback to 'anon' if no user
  const u = username || 'anon';
  return `tg_compute_settings_v1_${u}`;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(settingsKey(user.username));
    if (raw) {
      const s = JSON.parse(raw) as { originCityId?: string; stamina?: number; maxWeight?: number };
      if (s.originCityId) originCityId.value = s.originCityId;
      if (typeof s.stamina === 'number') stamina.value = s.stamina;
      if (typeof s.maxWeight === 'number') maxWeight.value = s.maxWeight;
    }
  } catch {}
}

function saveSettings() {
  try {
    const payload = { originCityId: originCityId.value, stamina: stamina.value, maxWeight: maxWeight.value };
    localStorage.setItem(settingsKey(user.username), JSON.stringify(payload));
  } catch {}
}

const plans = ref<ReturnType<typeof computeTopPlansPerBuyable>>([]);
const ui = useUiStore();

onMounted(async () => {
  try {
    cityStore.cities = await cityService.list();
    cityStore.products = await productService.list();
    graphStore.edges = await graphService.listEdges();
    const { priceMap, lastUpdatedAt } = await priceService.fetchMap();
    priceStore.priceMap = priceMap;
    priceStore.lastUpdatedAt = lastUpdatedAt;
    // Load persisted settings, then ensure origin default
    loadSettings();
    if (!originCityId.value) originCityId.value = Object.keys(cityStore.cities)[0] || '';
  } catch (e) {
    ui.error(humanizeError(e));
  }
});

// Persist on change
watch([originCityId, stamina, maxWeight, () => user.username], () => {
  saveSettings();
});

function onCompute() {
  const params = {
    originCityId: originCityId.value,
    stamina: stamina.value,
    maxWeight: maxWeight.value,
    cities: cityStore.cities,
    products: cityStore.products,
    edges: graphStore.edges,
    priceMap: priceStore.priceMap,
  } as const;
  plans.value = computeTopPlansPerBuyable(params);
}
</script>

<style scoped>
</style>
