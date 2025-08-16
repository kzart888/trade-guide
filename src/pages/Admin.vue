<template>
  <div class="p-4">
    <h1 class="text-lg font-600 mb-2">审批管理</h1>
    <p v-if="!isAdmin" class="text-red-500">权限不足：仅管理员可访问。</p>

  <div v-else>
      <div class="flex items-center gap-2 mb-3">
    <button class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400" @click="load" :disabled="loading">
          {{ loading ? '加载中…' : '刷新' }}
        </button>
        <span v-if="error" class="text-red-500">{{ error }}</span>
      </div>

      <h2 class="text-md font-600 mb-2">待审批用户 ({{ pending.length }})</h2>
      <div v-if="pending.length === 0" class="text-gray-500">暂无待审批用户。</div>
      <ul v-else class="space-y-2">
        <li v-for="u in pending" :key="u.id" class="flex items-center justify-between bg-gray-100 rounded px-3 py-2">
          <div class="flex flex-col">
            <span class="font-600">{{ u.username }}</span>
            <span class="text-xs text-gray-500">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '' }}</span>
          </div>
          <div class="flex gap-2">
      <button class="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600" :disabled="loading" @click="doApprove(u.id, true)">通过</button>
      <button class="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" :disabled="loading" @click="doApprove(u.id, false)">拒绝</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { userService } from '@/services';
import { useUserStore } from '@/stores/user';
import { useUiStore } from '@/stores/ui';

const user = useUserStore();
const ui = useUiStore();
const isAdmin = user.isAdmin;

const loading = ref(false);
const error = ref('');
const pending = ref<Array<{ id: string; username: string; created_at?: string }>>([]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    pending.value = await userService.listPending();
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
    await load();
  } catch (e: any) {
  ui.error(e?.message || '操作失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (isAdmin) load();
});
</script>
