<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur py-0.5 md:py-2 z-10">
      <h1 class="text-sm md:text-lg font-600 leading-5 md:leading-6">用户管理</h1>
      <button class="px-2 py-0.5 md:px-3 md:py-1 rounded bg-gray-200" @click="load" :disabled="loading">{{ loading ? '加载中…' : '刷新' }}</button>
    </div>
    <p v-if="!canManage" class="text-red-500">权限不足：仅管理员或创建者可访问。</p>

    <div v-else class="space-y-3">
      <div class="flex items-center gap-2">
        <span v-if="error" class="text-red-500">{{ error }}</span>
      </div>

      <div class="bg-white border rounded">
        <div class="px-3 py-2 font-600 border-b">待审批 ({{ pending.length }})</div>
        <div class="px-3 pt-2 pb-1">
          <input v-model.trim="pendingQuery" class="border rounded px-2 py-1 w-full text-sm" placeholder="搜索待审批用户名" />
        </div>
        <div v-if="filteredPending.length===0" class="px-3 py-6 text-gray-500">暂无</div>
        <div v-else class="divide-y">
          <div v-for="u in filteredPending" :key="u.id" class="flex items-center justify-between px-3 py-2">
            <div>
              <div class="font-600">{{ u.username }}</div>
              <div class="text-xs text-gray-500">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '' }}</div>
            </div>
            <div class="flex gap-2">
              <button class="px-2 py-1 border rounded" :disabled="loading" @click="doApprove(u.id, true)">通过</button>
              <button class="px-2 py-1 border rounded" :disabled="loading" @click="doApprove(u.id, false)">拒绝</button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border rounded">
        <div class="px-3 py-2 font-600 border-b">全部用户 ({{ all.length }})</div>
        <!-- Filters -->
        <div class="px-3 py-2 grid grid-cols-1 gap-2 md:grid-cols-4 md:items-center">
          <input v-model.trim="query" class="border rounded px-2 py-1 text-sm md:col-span-2" placeholder="搜索用户名…" />
          <select v-model="roleFilter" class="border rounded px-2 py-1 text-sm">
            <option value="all">全部角色</option>
            <option value="admin">管理员</option>
            <option value="member">普通用户</option>
          </select>
          <div class="grid grid-cols-2 gap-2 md:col-span-1">
            <select v-model="statusFilter" class="border rounded px-2 py-1 text-sm">
              <option value="all">全部状态</option>
              <option value="locked">已锁定</option>
              <option value="unlocked">未锁定</option>
            </select>
            <select v-model="sortBy" class="border rounded px-2 py-1 text-sm">
              <option value="ctime_desc">创建时间↓</option>
              <option value="ctime_asc">创建时间↑</option>
              <option value="name_asc">用户名A→Z</option>
              <option value="name_desc">用户名Z→A</option>
            </select>
          </div>
        </div>
        <div v-if="filteredAll.length===0" class="px-3 py-6 text-gray-500">暂无</div>
        <div v-else class="divide-y">
          <!-- Paged list -->
          <div v-for="u in pagedAll" :key="u.id" class="px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-600 truncate">{{ u.username }}
                  <span v-if="u.is_admin" class="ml-2 text-xs px-1 rounded bg-amber-100 text-amber-700">管理员</span>
                  <span v-if="u.username==='admin'" class="ml-1 text-xs px-1 rounded bg-indigo-100 text-indigo-700">创建者</span>
                  <span v-if="(u as any).locked_until && new Date((u as any).locked_until) > new Date()" class="ml-1 text-xs px-1 rounded bg-red-100 text-red-700">已锁定</span>
                </div>
                <div class="text-xs text-gray-500">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '' }}</div>
              </div>
              <button class="px-2 py-1 border rounded" @click="toggleExpand(u.id)">{{ expanded.has(u.id) ? '收起' : '操作' }}</button>
            </div>
            <!-- Expandable actions -->
            <div v-if="expanded.has(u.id)" class="mt-2 flex flex-wrap items-center gap-2">
              <button class="px-2 py-1 border rounded" :disabled="loading || u.username==='admin' || !isCreator" @click="toggleAdmin(u)">{{ u.is_admin ? '取消管理员' : '设为管理员' }}</button>
              <button class="px-2 py-1 border rounded" :disabled="loading || !(isAdmin||isCreator) || !(u as any).locked_until || new Date((u as any).locked_until) <= new Date()" @click="unlock(u)">解除锁定</button>
              <button class="px-2 py-1 border rounded" :disabled="loading || !(isAdmin||isCreator) || (u.username==='admin' && !isCreator)" @click="resetPin(u)">重置PIN</button>
              <button class="px-2 py-1 border rounded text-red-600 border-red-300" :disabled="loading || u.username==='admin' || !isCreator" @click="deleteUser(u)">删除用户</button>
            </div>
          </div>
        </div>
        <!-- Pagination -->
        <div v-if="totalPages>1" class="px-3 py-2 flex items-center justify-between text-sm border-t">
          <div>第 {{ currentPage }} / {{ totalPages }} 页 · 共 {{ filteredAll.length }} 人</div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 border rounded" :disabled="currentPage===1" @click="currentPage--">上一页</button>
            <button class="px-2 py-1 border rounded" :disabled="currentPage===totalPages" @click="currentPage++">下一页</button>
          </div>
        </div>
      </div>

    </div>
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { userService } from '@/services';
import { useUserStore } from '@/stores/user';
import { useUiStore } from '@/stores/ui';

const user = useUserStore();
const ui = useUiStore();
const isAdmin = computed(() => user.isAdmin);
const isCreator = computed(() => (user as any).isCreator);
const canManage = computed(() => isAdmin.value || isCreator.value);

const loading = ref(false);
const error = ref('');
const pending = ref<Array<{ id: string; username: string; created_at?: string }>>([]);
const all = ref<Array<{ id: string; username: string; approved: boolean; is_admin: boolean; created_at?: string; locked_until?: string; failed_attempts?: number }>>([]);

// Filters & search
const query = ref('');
const roleFilter = ref<'all'|'admin'|'member'>('all');
const statusFilter = ref<'all'|'locked'|'unlocked'>('all');
const sortBy = ref<'ctime_desc'|'ctime_asc'|'name_asc'|'name_desc'>('ctime_desc');
const pageSize = ref(20);
const currentPage = ref(1);
const expanded = ref(new Set<string>());
const pendingQuery = ref('');

const filteredPending = computed(() => {
  const q = pendingQuery.value.trim().toLowerCase();
  if (!q) return pending.value;
  return pending.value.filter(u => u.username.toLowerCase().includes(q));
});

function isLocked(u: { locked_until?: string }) {
  return !!(u.locked_until && new Date(u.locked_until) > new Date());
}

const filteredAll = computed(() => {
  let list = all.value.slice();
  const q = query.value.trim().toLowerCase();
  if (q) list = list.filter(u => u.username.toLowerCase().includes(q));
  if (roleFilter.value !== 'all') {
    list = list.filter(u => roleFilter.value === 'admin' ? u.is_admin : !u.is_admin);
  }
  if (statusFilter.value !== 'all') {
    list = list.filter(u => statusFilter.value === 'locked' ? isLocked(u) : !isLocked(u));
  }
  switch (sortBy.value) {
    case 'ctime_asc':
      list.sort((a,b) => new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime());
      break;
    case 'name_asc':
      list.sort((a,b) => a.username.localeCompare(b.username));
      break;
    case 'name_desc':
      list.sort((a,b) => b.username.localeCompare(a.username));
      break;
    default:
      list.sort((a,b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime());
  }
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAll.value.length / pageSize.value)));
const pagedAll = computed(() => {
  const page = Math.min(currentPage.value, totalPages.value);
  const start = (page - 1) * pageSize.value;
  return filteredAll.value.slice(start, start + pageSize.value);
});

function toggleExpand(id: string) {
  const s = expanded.value;
  if (s.has(id)) s.delete(id); else s.add(id);
  // force reactivity by creating a new Set
  expanded.value = new Set(s);
}

// Reset page when filters/search change
watch([query, roleFilter, statusFilter, sortBy], () => {
  currentPage.value = 1;
});
// Clamp page if filtered count shrinks
watch(filteredAll, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    [pending.value, all.value] = await Promise.all([
      userService.listPending(),
      userService.listAll(),
    ]);
  } catch (e: any) {
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

async function doApprove(id: string, approved: boolean) {
  loading.value = true;
  try {
    await userService.approve(id, approved, { adminUserId: user.username });
    ui.success(approved ? '已通过审批' : '已拒绝');
  // Optimistic update: remove from pending immediately
  pending.value = pending.value.filter(p => p.id !== id);
  await load();
  } catch (e: any) {
    ui.error(e?.message || '操作失败');
  } finally {
    loading.value = false;
  }
}

async function toggleAdmin(u: { id: string; is_admin: boolean; username: string }) {
  if (!isCreator.value) return;
  try {
    await userService.setAdmin(u.id, !u.is_admin);
    await load();
    ui.success('已更新管理员身份');
  } catch (e: any) {
    ui.error(e?.message || '更新失败');
  }
}

async function deleteUser(u: { id: string; username: string }) {
  if (!isCreator.value) return;
  const ok = window.confirm(`确定强制删除用户「${u.username}」？此用户将无法登录。`);
  if (!ok) return;
  try {
    await userService.deleteUser(u.id);
  // Remove from local lists immediately, then refresh
  pending.value = pending.value.filter(p => p.id !== u.id && p.username !== u.username);
  all.value = all.value.filter(a => a.id !== u.id && a.username !== u.username);
  await load();
    ui.success('用户已删除/禁用登录');
  } catch (e: any) {
    ui.error(e?.message || '删除失败');
  }
}

onMounted(() => {
  if (canManage.value) load();
});

async function resetPin(u: { id: string; username: string }) {
  if (!(isAdmin.value || isCreator.value)) return;
  if (u.username === 'admin' && !isCreator.value) {
    return ui.error('管理员不可重置创建者的 PIN');
  }
  const pin = window.prompt(`为用户「${u.username}」设置新 PIN（4位数字）:`);
  if (!pin) return;
  if (!/^\d{4}$/.test(pin)) return ui.error('PIN 必须是 4 位数字');
  try {
    await userService.resetPin(u.id, pin, { operatorId: user.username });
    ui.success('已重置 PIN');
  } catch (e: any) {
    ui.error(e?.message || '重置失败');
  }
}

async function unlock(u: { id: string; username: string }) {
  if (!(isAdmin.value || isCreator.value)) return;
  try {
    await userService.unlock(u.id);
    await load();
    ui.success('已解除锁定');
  } catch (e: any) {
    ui.error(e?.message || '解除失败');
  }
}
</script>
