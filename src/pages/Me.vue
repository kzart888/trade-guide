<template>
  <div class="p-4 space-y-3 pb-20">
    <div class="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur py-2 z-10">
      <h1 class="text-lg font-600">我的</h1>
      <button class="px-3 py-1.5 border rounded" @click="logout">退出登录</button>
    </div>
    <div class="text-sm text-gray-600">
      <div>用户名：{{ store.username }}</div>
      <div>角色：{{ store.isAdmin ? '管理员' : '普通用户' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import router from '@/router';

const store = useUserStore();
function logout() {
  store.logout();
  router.replace('/login');
}
</script>
