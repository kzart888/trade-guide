<template>
  <div class="p-4 space-y-3 pb-20">
    <div class="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur py-2 z-10">
      <div class="text-lg font-600">城市距离配置</div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-sm">
          <span>起点</span>
          <select v-model="originId" class="border rounded px-2 py-1">
            <option v-for="c in cityList" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <button class="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-60" :disabled="saving" @click="save">保存</button>
      </div>
    </div>

    <div class="text-xs text-gray-600">为所选起点设置到其他城市的直达距离（单位：体力）。保存时会自动同步双向距离。</div>

    <div v-if="!originId" class="text-gray-500">暂无城市可选</div>

    <div v-else class="bg-white border rounded divide-y">
      <div v-for="c in otherCities" :key="c.id" class="flex items-center justify-between px-3 py-2">
        <div class="truncate">{{ c.name }}</div>
        <div class="flex items-center gap-2">
          <input type="number" min="0" inputmode="numeric" class="border rounded px-2 py-1 w-24"
            :value="distanceValue(c.id)" @input="onDistance(c.id, $event)" placeholder="未设置" />
          <span class="text-xs text-gray-400">体力</span>
        </div>
      </div>
    </div>

    <div class="mt-3 p-3 bg-white border rounded">
      <div class="text-sm font-600 mb-2">城市管理</div>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-gray-500">重命名当前：</span>
          <input v-model.trim="renameText" class="border rounded px-2 py-1 w-36" :placeholder="currentCityName || '城市名'" />
          <button class="px-2 py-1 border rounded" :disabled="saving || !renameText || renameText===currentCityName" @click="save">应用</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-500">新增城市：</span>
          <input v-model.trim="newCityName" class="border rounded px-2 py-1 w-36" placeholder="城市名" />
          <button class="px-2 py-1 border rounded" :disabled="!canAddCity || saving" @click="onAddCity">添加</button>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <button class="px-2 py-1 border rounded text-red-600 border-red-300" :disabled="!originId || saving" @click="onDeleteCity">删除当前城市</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mt-1">新增城市将自动分配 ID，并默认配置当前产品列表的前三个为可买商品。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useCityStore, useGraphStore } from '@/stores';
import { cityService, graphService } from '@/services';
import { useUiStore } from '@/stores/ui';

const cityStore = useCityStore();
const graphStore = useGraphStore();
const ui = useUiStore();

const originId = ref<string>('');
const saving = ref(false);
const renameText = ref('');
const newCityName = ref('');

const cityList = computed(() => Object.values(cityStore.cities));
const otherCities = computed(() => cityList.value.filter(c => c.id !== originId.value));
const currentCityName = computed(() => cityStore.cities[originId.value]?.name || '');
const canAddCity = computed(() => !!newCityName.value && Object.keys(cityStore.products).length >= 3);

// local edit buffer: destCityId -> distance number | ''
const edits = reactive<Record<string, number | ''>>({});

function hydrateFromEdges() {
  Object.keys(edits).forEach(k => delete edits[k]);
  if (!originId.value) return;
  for (const c of otherCities.value) {
    const e = graphStore.edges.find(e => e.fromCityId === originId.value && e.toCityId === c.id);
    edits[c.id] = e ? e.distance : '';
  }
}

function distanceValue(destId: string) {
  return edits[destId] ?? '';
}
function onDistance(destId: string, e: Event) {
  const v = (e.target as HTMLInputElement).value;
  edits[destId] = v === '' ? '' : Math.max(0, Number(v));
}

async function ensureData() {
  if (!Object.keys(cityStore.cities).length) {
    cityStore.cities = await cityService.list();
  }
  if (!graphStore.edges.length) {
    graphStore.edges = await graphService.listEdges();
  }
  if (!originId.value) {
    originId.value = Object.keys(cityStore.cities)[0] || '';
  }
  hydrateFromEdges();
}

async function save() {
  if (!originId.value) return;
  try {
    saving.value = true;
    // Apply rename if provided
    if (renameText.value && renameText.value !== currentCityName.value) {
      await cityService.rename(originId.value, renameText.value);
      renameText.value = '';
      cityStore.cities = await cityService.list();
    }
    const toUpsert: Record<string, { fromCityId: string; toCityId: string; distance: number }> = {};
    const toDelete: Record<string, { fromCityId: string; toCityId: string }> = {};
    const addUpsert = (a: string, b: string, d: number) => {
      const k1 = `${a}|${b}`;
      const k2 = `${b}|${a}`;
      toUpsert[k1] = { fromCityId: a, toCityId: b, distance: d };
      toUpsert[k2] = { fromCityId: b, toCityId: a, distance: d };
      delete toDelete[k1];
      delete toDelete[k2];
    };
    const addDelete = (a: string, b: string) => {
      const k1 = `${a}|${b}`;
      const k2 = `${b}|${a}`;
      toDelete[k1] = { fromCityId: a, toCityId: b };
      toDelete[k2] = { fromCityId: b, toCityId: a };
      delete toUpsert[k1];
      delete toUpsert[k2];
    };

    for (const [destId, val] of Object.entries(edits)) {
      if (val === '' || (typeof val === 'number' && val <= 0)) {
        addDelete(originId.value, destId);
      } else if (typeof val === 'number' && val > 0) {
        addUpsert(originId.value, destId, val);
      }
    }
    const upserts = Object.values(toUpsert);
    const deletes = Object.values(toDelete);
    if (upserts.length) await graphService.upsertEdges(upserts);
    if (deletes.length) await graphService.deleteEdges(deletes);
    // refresh
    graphStore.edges = await graphService.listEdges();
    ui.success('距离已保存');
  } catch (e: any) {
    ui.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
    hydrateFromEdges();
  }
}

onMounted(() => { ensureData(); });
watch(originId, () => hydrateFromEdges());

function genCityId(name: string, exists: Set<string>) {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || `city_${Math.random().toString(36).slice(2, 8)}`;
  let id = base;
  let i = 1;
  while (exists.has(id)) {
    id = `${base}_${i++}`;
  }
  return id;
}

async function onAddCity() {
  if (!canAddCity.value) return;
  try {
    saving.value = true;
    const exists = new Set(Object.keys(cityStore.cities));
    const id = genCityId(newCityName.value, exists);
    const products = Object.keys(cityStore.products).slice(0, 3) as [string, string, string];
    if (products.length < 3) throw new Error('需先配置至少 3 个商品');
    await cityService.add({ id, name: newCityName.value, buyableProductIds: products });
    cityStore.cities = await cityService.list();
    originId.value = id;
    newCityName.value = '';
    hydrateFromEdges();
    ui.success('城市已添加');
  } catch (e: any) {
    ui.error(e?.message || '添加失败');
  } finally {
    saving.value = false;
  }
}

async function onDeleteCity() {
  if (!originId.value) return;
  const name = cityStore.cities[originId.value]?.name || originId.value;
  const hasEdges = graphStore.edges.some(e => e.fromCityId === originId.value || e.toCityId === originId.value);
  const warn = `确定删除城市「${name}」？这将删除与其相关的距离与价格数据（不可恢复）。` + (hasEdges ? '\n\n注意：存在连边，将一并删除。' : '');
  const ok = window.confirm(warn);
  if (!ok) return;
  try {
    saving.value = true;
    await cityService.remove(originId.value);
    cityStore.cities = await cityService.list();
    graphStore.edges = await graphService.listEdges();
    // pick another
    originId.value = Object.keys(cityStore.cities)[0] || '';
    renameText.value = '';
    hydrateFromEdges();
    ui.success('城市已删除');
  } catch (e: any) {
    ui.error(e?.message || '删除失败');
  } finally {
    saving.value = false;
  }
}
</script>
