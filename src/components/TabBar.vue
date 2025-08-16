<template>
  <nav class="h-12 border-t bg-white flex items-center justify-around text-sm fixed bottom-0 left-0 right-0 z-20 shadow-sm pb-safe">
    <RouterLink to="/prices" class="px-2 py-1">价格</RouterLink>
    <RouterLink to="/compute" class="px-2 py-1">计算</RouterLink>
    <template v-if="canAdmin">
      <RouterLink to="/city-config" class="px-2 py-1">商品配置</RouterLink>
      <RouterLink to="/distance-config" class="px-2 py-1">距离配置</RouterLink>
      <RouterLink to="/admin" class="px-2 py-1">用户</RouterLink>
    </template>
    <RouterLink to="/me" class="px-2 py-1">我的</RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { computed } from 'vue';
const user = useUserStore();
const { isAdmin, isCreator } = storeToRefs(user);
const canAdmin = computed(() => (isAdmin.value || (isCreator as any).value));
</script>
