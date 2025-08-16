<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
  <div v-if="!hasBackend" class="text-xs text-white bg-amber-600 text-center py-1">演示模式（未连接后端）：数据来自本地 Mock，保存为本地无效操作</div>
    <router-view class="flex-1" />
    <TabBar />
  <ToastHost />
  </div>
</template>

<script setup lang="ts">
import TabBar from '@/components/TabBar.vue';
import ToastHost from '@/components/ToastHost.vue';
import { onMounted, onUnmounted } from 'vue';
import { usePriceStore } from '@/stores';
import { hasBackend } from '@/services/supabaseClient';

const priceStore = usePriceStore();
onMounted(() => {
  priceStore.startPolling(60000);
});
onUnmounted(() => {
  priceStore.stopPolling();
});
</script>
