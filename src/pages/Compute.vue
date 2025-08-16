<template>
  <div class="p-4 space-y-3">
    <h1 class="text-lg font-600">计算</h1>
    <div v-if="lastUpdatedAt" class="text-xs">
      <span :class="stalenessClass">价格上次更新时间：{{ new Date(lastUpdatedAt).toLocaleString() }}（{{ minutesAgo }} 分钟前）</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col">
        <span>起点城市</span>
        <select v-model="originCityId" class="border rounded px-2 py-1">
          <option v-for="c in Object.values(cities)" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label class="flex flex-col">
        <span>体力</span>
        <input v-model.number="stamina" type="number" inputmode="numeric" class="border rounded px-2 py-1" />
      </label>
      <label class="flex flex-col">
        <span>载重</span>
        <input v-model.number="maxWeight" type="number" inputmode="numeric" class="border rounded px-2 py-1" />
      </label>
    </div>
    <button class="btn" @click="onCompute">开始计算</button>

    <div v-if="plan" class="mt-4 border rounded p-3 bg-white">
      <div>商品: {{ products[plan.productId]?.name }}</div>
      <div>目的地: {{ cities[plan.toCityId]?.name }}</div>
      <div>数量: {{ plan.quantity }}</div>
      <div>总利润: {{ plan.totalProfit }}</div>
      <div>距离: {{ plan.distance }}</div>
    </div>
    <div v-else class="text-gray-500">暂无可行方案</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCityStore, useGraphStore, usePriceStore } from '@/stores';
import { computeBestDirectTrip } from '@/core/strategy/computeBestDirectTrip';
import { productService, cityService, graphService, priceService } from '@/services';
import { useUiStore } from '@/stores/ui';
import { humanizeError } from '@/services/errors';

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

const plan = ref<ReturnType<typeof computeBestDirectTrip> | null>(null);
const ui = useUiStore();

onMounted(async () => {
  try {
    cityStore.cities = await cityService.list();
    cityStore.products = await productService.list();
    graphStore.edges = await graphService.listEdges();
    const { priceMap, lastUpdatedAt } = await priceService.fetchMap();
    priceStore.priceMap = priceMap;
    priceStore.lastUpdatedAt = lastUpdatedAt;
    originCityId.value = Object.keys(cityStore.cities)[0] || '';
  } catch (e) {
    ui.error(humanizeError(e));
  }
});

function onCompute() {
  plan.value = computeBestDirectTrip({
    originCityId: originCityId.value,
    stamina: stamina.value,
    maxWeight: maxWeight.value,
    cities: cityStore.cities,
    products: cityStore.products,
    edges: graphStore.edges,
    priceMap: priceStore.priceMap,
  });
}
</script>

<style scoped>
</style>
