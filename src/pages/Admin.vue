<template>
  <div class="p-4 space-y-4">
    <h1 class="text-lg font-600">用户管理</h1>
    <p v-if="!canManage" class="text-red-500">权限不足：仅管理员或创建者可访问。</p>

    <div v-else class="space-y-3">
      <div class="flex items-center gap-2">
        <button class="px-3 py-1 rounded bg-gray-200" @click="load" :disabled="loading">{{ loading ? '加载中…' : '刷新' }}</button>
        <span v-if="error" class="text-red-500">{{ error }}</span>
      </div>

      <div class="bg-white border rounded">
        <div class="px-3 py-2 font-600 border-b">待审批 ({{ pending.length }})</div>
        <div v-if="pending.length===0" class="px-3 py-6 text-gray-500">暂无</div>
        <div v-else class="divide-y">
          <div v-for="u in pending" :key="u.id" class="flex items-center justify-between px-3 py-2">
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
        <div v-if="all.length===0" class="px-3 py-6 text-gray-500">暂无</div>
        <div v-else class="divide-y">
          <div v-for="u in all" :key="u.id" class="flex items-center justify-between px-3 py-2">
            <div>
              <div class="font-600">{{ u.username }}
                <span v-if="u.is_admin" class="ml-2 text-xs px-1 rounded bg-amber-100 text-amber-700">管理员</span>
                <span v-if="u.username==='admin'" class="ml-1 text-xs px-1 rounded bg-indigo-100 text-indigo-700">创建者</span>
                <span v-if="(u as any).locked_until && new Date((u as any).locked_until) > new Date()" class="ml-1 text-xs px-1 rounded bg-red-100 text-red-700">已锁定</span>
              </div>
              <div class="text-xs text-gray-500">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '' }}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-2 py-1 border rounded" :disabled="loading || u.username==='admin' || !isCreator" @click="toggleAdmin(u)">{{ u.is_admin ? '取消管理员' : '设为管理员' }}</button>
              <button
                class="px-2 py-1 border rounded"
                :disabled="loading || !(isAdmin||isCreator) || !(u as any).locked_until || new Date((u as any).locked_until) <= new Date()"
                @click="unlock(u)"
              >解除锁定</button>
              <button
                class="px-2 py-1 border rounded"
                :disabled="loading || !(isAdmin||isCreator) || (u.username==='admin' && !isCreator)"
                @click="resetPin(u)"
              >重置PIN</button>
              <button class="px-2 py-1 border rounded text-red-600 border-red-300" :disabled="loading || u.username==='admin' || !isCreator" @click="deleteUser(u)">删除用户</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
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
