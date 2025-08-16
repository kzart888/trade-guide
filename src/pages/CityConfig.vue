<template>
  <div class="p-4 space-y-4">
    <h1 class="text-lg font-600">商品配置（每城 3 个可买商品）</h1>
    <div class="text-xs text-gray-500">规则：每个城市必须配置且仅能配置 3 个商品，且不可重复。</div>

    <div class="space-y-3">
      <div v-for="c in cityList" :key="c.id" class="p-3 bg-white rounded border">
        <div class="flex items-center justify-between mb-2">
          <div class="font-600">{{ c.name }}</div>
          <div class="text-xs" role="status">
            <span v-if="saving[c.id]" class="text-blue-600">保存中…</span>
            <span v-else-if="status[c.id]==='success'" class="text-green-600">已保存</span>
            <span v-else-if="status[c.id]==='error'" class="text-red-600">保存失败：{{ errorMsg[c.id] || '网络错误' }}</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <select v-for="(pid, idx) in edits[c.id]" :key="idx" class="border rounded px-2 py-1" :value="pid" @change="onChange(c.id, idx, $event)">
            <option v-for="p in productList" :key="p.id" :value="p.id" :disabled="isDisabled(c.id, idx, p.id)">
              {{ p.name }}
            </option>
          </select>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <button class="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-60" :disabled="saving[c.id] || !isValid(c.id) || isUnchanged(c.id)" @click="save(c.id)">保存</button>
          <button class="px-3 py-1.5 bg-gray-100 rounded" :disabled="saving[c.id]" @click="reset(c.id)">重置</button>
          <button v-if="status[c.id]==='error'" class="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-200" :disabled="saving[c.id]" @click="save(c.id)">重试</button>
        </div>
        <div v-if="!isValid(c.id)" class="mt-2 text-xs text-red-600">必须选择 3 个且不可重复</div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { useCityStore } from '@/stores';
import { cityService } from '@/services';
import type { City } from '@/core/types/domain';
import { useUiStore } from '@/stores/ui';
const ui = useUiStore();

const cityStore = useCityStore();
const cityList = computed(() => Object.values(cityStore.cities));
const productList = computed(() => Object.values(cityStore.products));

// 本地编辑态
const edits = reactive<Record<string, [string, string, string]>>({});
const saving = reactive<Record<string, boolean>>({});
const status = reactive<Record<string, 'idle'|'success'|'error'>>({});
const errorMsg = reactive<Record<string, string>>({});

function initEdits() {
  for (const c of cityList.value) {
    edits[c.id] = [...c.buyableProductIds] as [string, string, string];
    status[c.id] = 'idle';
    saving[c.id] = false;
    errorMsg[c.id] = '';
  }
}

function onChange(cityId: string, idx: number, e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  const arr = edits[cityId].slice() as [string, string, string];
  arr[idx] = value;
  edits[cityId] = arr;
  status[cityId] = 'idle';
}

function isDisabled(cityId: string, idx: number, pid: string) {
  const arr = edits[cityId];
  return arr.some((p, i) => i !== idx && p === pid);
}

function isValid(cityId: string) {
  const arr = edits[cityId];
  if (!arr || arr.length !== 3) return false;
  const set = new Set(arr);
  return set.size === 3;
}

function isUnchanged(cityId: string) {
  const curr = cityStore.cities[cityId]?.buyableProductIds;
  const arr = edits[cityId];
  return curr && arr && curr[0] === arr[0] && curr[1] === arr[1] && curr[2] === arr[2];
}

async function save(cityId: string) {
  if (!isValid(cityId)) return;
  saving[cityId] = true;
  status[cityId] = 'idle';
  errorMsg[cityId] = '';
  const old = cityStore.cities[cityId]?.buyableProductIds;
  const next = edits[cityId];
  try {
    await cityService.updateBuyables(cityId, next, { oldBuyables: old });
    // 同步到本地 store
    if (cityStore.cities[cityId]) {
      (cityStore.cities[cityId] as City).buyableProductIds = [next[0], next[1], next[2]] as [string, string, string];
    }
    status[cityId] = 'success';
  ui.success('配置已保存');
  } catch (e: any) {
    status[cityId] = 'error';
    errorMsg[cityId] = e?.message || String(e) || '';
  ui.error('保存失败');
  } finally {
    saving[cityId] = false;
  }
}

function reset(cityId: string) {
  const src = cityStore.cities[cityId]?.buyableProductIds ?? edits[cityId];
  edits[cityId] = [...src] as [string, string, string];
  status[cityId] = 'idle';
  errorMsg[cityId] = '';
}

onMounted(() => {
  // 若还未注入 mock，在其他页面已有 resetMock；这里仅在已存在时初始化
  initEdits();
});
</script>
