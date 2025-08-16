<template>
  <div class="p-4 space-y-3 pb-20">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-600">价格录入</h1>
      <div class="text-xs text-gray-500">
        <span v-if="dirty">有未保存更改</span>
        <span v-else>已保存</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <label class="flex items-center gap-2">
        <span>城市</span>
        <select v-model="cityStore.currentCityId" class="border rounded px-2 py-1">
          <option v-for="c in Object.values(cityStore.cities)" :value="c.id" :key="c.id">{{ c.name }}</option>
        </select>
      </label>
    </div>

  <div class="grid grid-cols-[120px_1fr_1fr] gap-2 items-center p-2 bg-white rounded border">
      <div class="text-gray-500">商品</div>
      <div class="text-gray-500">买入价</div>
      <div class="text-gray-500">卖出价</div>
      <template v-for="p in productListSorted" :key="p.id">
        <div class="truncate">{{ p.name }}</div>
        <template v-if="isBuyable(p.id)">
          <input type="number" min="0" inputmode="numeric" class="border rounded px-2 py-1"
            :value="buyPrice(currentCityId,p.id)" @input="onBuy(p.id, $event)" />
        </template>
        <template v-else>
          <input type="number" class="border rounded px-2 py-1 opacity-50" :value="''" disabled placeholder="—" />
        </template>
        <input type="number" min="0" inputmode="numeric" class="border rounded px-2 py-1"
          :value="sellPrice(currentCityId,p.id)" @input="onSell(p.id, $event)" />
      </template>
    </div>

    <div class="flex items-center gap-3">
      <button class="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60" :disabled="!dirty || saving" @click="save">保存</button>
      <button class="px-3 py-2 bg-gray-200 rounded" @click="resetMock">重置Mock</button>
      <div class="text-sm" role="status">
        <span v-if="saving" class="text-blue-600">保存中…</span>
        <span v-else-if="saveStatus==='success'" class="text-green-600">保存成功</span>
        <template v-else-if="saveStatus==='error'">
          <span class="text-red-600">保存失败: {{ errorMessage || '网络或服务异常' }}</span>
          <button class="ml-2 px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-200" @click="save" :disabled="saving">重试</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCityStore, usePriceStore } from '@/stores';
import { productService, cityService, priceService } from '@/services';
import { humanizeError } from '@/services/errors';
import { useUiStore } from '@/stores/ui';

const cityStore = useCityStore();
const priceStore = usePriceStore();

const currentCityId = computed(() => cityStore.currentCityId);
const productList = computed(() => Object.values(cityStore.products));
const productListSorted = computed(() => {
  const list = productList.value.slice();
  const city = cityStore.cities[cityStore.currentCityId];
  if (!city) return list;
  const buyables = new Set(city.buyableProductIds);
  return list.sort((a, b) => Number(!buyables.has(a.id)) - Number(!buyables.has(b.id)));
});
const buyableSet = computed(() => {
  const city = cityStore.cities[cityStore.currentCityId];
  return new Set(city ? city.buyableProductIds : []);
});
function isBuyable(pid: string) {
  return buyableSet.value.has(pid);
}
const dirty = computed(() => priceStore.dirty);
const saving = computed(() => priceStore.saving);
const saveStatus = ref<'idle' | 'success' | 'error'>('idle');
const errorMessage = ref('');
let successTimer: number | undefined;
const ui = useUiStore();

function buyPrice(cityId: string, pid: string) {
  return priceStore.priceMap.get(cityId)?.get(pid)?.buyPrice ?? '';
}
function sellPrice(cityId: string, pid: string) {
  return priceStore.priceMap.get(cityId)?.get(pid)?.sellPrice ?? '';
}

function onBuy(pid: string, e: Event) {
  if (!isBuyable(pid)) return; // ignore edits for non-buyable products to avoid data冗余
  const v = (e.target as HTMLInputElement).value;
  const n = v === '' ? null : Math.max(0, Number(v));
  priceStore.setPrice(currentCityId.value, pid, { buyPrice: n });
}
function onSell(pid: string, e: Event) {
  const v = (e.target as HTMLInputElement).value;
  const n = v === '' ? null : Math.max(0, Number(v));
  priceStore.setPrice(currentCityId.value, pid, { sellPrice: n });
}

async function save() {
  clearTimeoutIfAny();
  errorMessage.value = '';
  saveStatus.value = 'idle';
  try {
    await priceStore.saveBatch(currentCityId.value);
    saveStatus.value = 'success';
  ui.success('价格已保存');
    // 自动清除成功提示
    successTimer = window.setTimeout(() => {
      saveStatus.value = 'idle';
    }, 2000);
  } catch (e: any) {
    saveStatus.value = 'error';
    errorMessage.value = e?.message || String(e) || '';
  ui.error('保存失败');
  }
}

function clearTimeoutIfAny() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = undefined;
  }
}

async function resetMock() {
  try {
    cityStore.cities = await cityService.list();
    cityStore.currentCityId = Object.keys(cityStore.cities)[0] || '';
    cityStore.products = await productService.list();
    const { priceMap, lastUpdatedAt } = await priceService.fetchMap();
    priceStore.priceMap = priceMap as any;
    priceStore.lastUpdatedAt = lastUpdatedAt || new Date();
  } catch (e) {
    ui.error(humanizeError(e));
  }
}

onMounted(() => resetMock());
</script>
