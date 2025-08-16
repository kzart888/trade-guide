<template>
  <div class="p-4 space-y-4 pb-20">
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
    <div class="p-3 bg-white border rounded">
      <div class="text-sm font-600 mb-2">商品管理</div>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <input v-model.trim="newProduct.name" class="border rounded px-2 py-1 w-40" placeholder="商品名" />
          <input v-model.number="newProduct.weight" type="number" min="1" inputmode="numeric" class="border rounded px-2 py-1 w-28" placeholder="重量" />
          <button class="px-2 py-1 border rounded" :disabled="!canAddProduct" @click="addProduct">新增</button>
        </div>
        <div class="divide-y">
          <div v-for="p in productList" :key="p.id" class="flex items-center justify-between py-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="truncate">{{ p.name }}</div>
              <div class="text-xs text-gray-400">重量: {{ p.weight }}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-2 py-1 border rounded" @click="onRenameProduct(p.id, p.name)">改名</button>
              <button class="px-2 py-1 border rounded" @click="onEditWeight(p.id, p.weight)">改重量</button>
              <button class="px-2 py-1 border rounded text-red-600 border-red-300" @click="onDeleteProduct(p.id, p.name)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { useCityStore } from '@/stores';
import { cityService, productService } from '@/services';
import type { City } from '@/core/types/domain';
import { useUiStore } from '@/stores/ui';
const ui = useUiStore();

const cityStore = useCityStore();
const cityList = computed(() => Object.values(cityStore.cities));
const productList = computed(() => Object.values(cityStore.products));
const canAddProduct = computed(() => !!newProduct.name && (newProduct.weight || 0) > 0);
const newProduct = reactive<{ name: string; weight: number | null }>({ name: '', weight: null });

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

function genProductId(name: string, exists: Set<string>) {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || `product_${Math.random().toString(36).slice(2, 8)}`;
  let id = base;
  let i = 1;
  while (exists.has(id)) id = `${base}_${i++}`;
  return id;
}

async function addProduct() {
  try {
    const exists = new Set(Object.keys(cityStore.products));
    const id = genProductId(newProduct.name, exists);
    await productService.add({ id, name: newProduct.name, weight: Number(newProduct.weight) });
    cityStore.products = await productService.list();
    Object.assign(newProduct, { name: '', weight: null });
    ui.success('商品已新增');
  } catch (e: any) {
    ui.error(e?.message || '新增失败');
  }
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

async function onRenameProduct(productId: string, currentName: string) {
  const next = window.prompt('输入新商品名：', currentName);
  if (!next || next.trim() === currentName) return;
  try {
    await productService.rename(productId, next.trim());
    cityStore.products = await productService.list();
    ui.success('商品已改名');
  } catch (e: any) {
    ui.error(e?.message || '改名失败');
  }
}

async function onDeleteProduct(productId: string, name: string) {
  try {
    // soft try delete
    await productService.remove(productId);
    cityStore.products = await productService.list();
    // also refresh cities to reflect potential constraints
    cityStore.cities = await cityService.list();
    initEdits();
    ui.success('商品已删除');
  } catch (e: any) {
    if (String(e?.message || e).includes('HAS_ASSOCIATIONS')) {
      const ok = window.confirm(`商品「${name}」被城市配置引用。是否强制删除？\n\n强制删除将自动调整各城市的 3 个可买商品，以保持规则。`);
      if (!ok) return;
      try {
        await productService.remove(productId, { force: true });
        cityStore.products = await productService.list();
        cityStore.cities = await cityService.list();
        initEdits();
        ui.success('已强制删除并修复配置');
      } catch (e2: any) {
        ui.error(e2?.message || '强制删除失败');
      }
    } else {
      ui.error(e?.message || '删除失败');
    }
  }
}

async function onEditWeight(productId: string, weight: number) {
  const nextStr = window.prompt('输入新重量（正整数）:', String(weight));
  if (nextStr == null) return;
  const next = Number(nextStr);
  if (!Number.isFinite(next) || next <= 0) return ui.error('重量必须为正整数');
  try {
    await productService.update(productId, { weight: Math.floor(next) });
    cityStore.products = await productService.list();
    ui.success('重量已更新');
  } catch (e: any) {
    ui.error(e?.message || '更新失败');
  }
}
</script>
