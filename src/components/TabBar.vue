<template>
  <nav class="h-12 border-t bg-white flex items-center justify-around text-sm">
    <RouterLink to="/prices" class="px-2 py-1">价格</RouterLink>
    <RouterLink to="/compute" class="px-2 py-1">计算</RouterLink>
    <RouterLink to="/city-config" class="px-2 py-1">商品配置</RouterLink>
    <RouterLink to="/admin" class="px-2 py-1">审批</RouterLink>
    <RouterLink to="/me" class="px-2 py-1">我的</RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
