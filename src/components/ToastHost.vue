<template>
  <div class="fixed inset-x-0 bottom-16 px-4 pointer-events-none">
    <div class="flex flex-col gap-2 max-w-sm mx-auto">
      <div v-for="t in toasts" :key="t.id" class="pointer-events-auto px-3 py-2 rounded shadow text-white"
        :class="{ 'bg-green-600': t.type==='success', 'bg-red-600': t.type==='error', 'bg-gray-800': t.type==='info' }">
        <div class="flex items-center justify-between gap-3">
          <span class="truncate">{{ t.message }}</span>
          <button class="text-white/80" @click="dismiss(t.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const { toasts } = storeToRefs(ui);
const { dismiss } = ui;
</script>
