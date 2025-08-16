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
        <div class="flex items-center gap-1 text-sm">
          <input v-model.trim="renameText" class="border rounded px-2 py-1 w-28" :placeholder="currentCityName || '重命名'" />
          <button class="px-2 py-1 border rounded" :disabled="!canRename" @click="renameCity">重命名</button>
        </div>
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

const cityList = computed(() => Object.values(cityStore.cities));
const otherCities = computed(() => cityList.value.filter(c => c.id !== originId.value));
const currentCityName = computed(() => cityStore.cities[originId.value]?.name || '');
const canRename = computed(() => !!originId.value && !!renameText.value && renameText.value !== currentCityName.value);

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
    const upserts: Array<{ fromCityId: string; toCityId: string; distance: number }> = [];
    const deletes: Array<{ fromCityId: string; toCityId: string }> = [];
    for (const [destId, val] of Object.entries(edits)) {
      if (val === '' || (typeof val === 'number' && val <= 0)) {
        deletes.push({ fromCityId: originId.value, toCityId: destId });
        deletes.push({ fromCityId: destId, toCityId: originId.value });
      } else if (typeof val === 'number' && val > 0) {
        upserts.push({ fromCityId: originId.value, toCityId: destId, distance: val });
        upserts.push({ fromCityId: destId, toCityId: originId.value, distance: val });
      }
    }
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

async function renameCity() {
  if (!canRename.value || !originId.value) return;
  try {
    await cityService.rename(originId.value, renameText.value);
    cityStore.cities = await cityService.list();
    renameText.value = '';
    ui.success('城市已重命名');
  } catch (e: any) {
    ui.error(e?.message || '重命名失败');
  }
}
</script>
