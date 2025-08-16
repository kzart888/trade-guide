<template>
  <div class="flex gap-2" @paste.prevent="onPaste">
    <input
      v-for="i in length"
      :key="i"
      ref="setInputRef"
      :value="chars[i-1] || ''"
      type="password"
      inputmode="numeric"
      pattern="\\d*"
      maxlength="1"
      class="w-10 h-10 text-center border rounded"
      @input="onInput(i-1, $event)"
      @keydown="onKeydown(i-1, $event)"
      @focus="onFocus(i-1, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance } from 'vue';

const props = defineProps<{ modelValue: string; length?: number }>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'complete', v: string): void;
}>();

const length = computed(() => props.length ?? 4);
const chars = computed(() => props.modelValue?.split('').slice(0, length.value) ?? []);

const inputs = ref<HTMLInputElement[]>([]);
function setInputRef(el: Element | ComponentPublicInstance | null) {
  if (el && el instanceof HTMLInputElement) inputs.value.push(el);
}

function focusIndex(idx: number) {
  const el = inputs.value[idx];
  if (el) {
    el.focus();
    el.select();
  }
}

function sanitize(s: string) {
  return (s || '').replace(/\D+/g, '').slice(0, length.value);
}

function onInput(idx: number, e: Event) {
  const val = (e.target as HTMLInputElement).value.replace(/\D+/g, '');
  if (!val) {
    updateAt(idx, '');
    return;
  }
  // If user types multiple digits into one box (e.g. mobile), spread them
  const current = props.modelValue ?? '';
  const before = current.slice(0, idx);
  const after = current.slice(idx + 1);
  const merged = sanitize(before + val + after);
  emit('update:modelValue', merged);
  const nextIndex = Math.min(idx + val.length, length.value - 1);
  focusIndex(nextIndex);
  maybeComplete(merged);
}

function onKeydown(idx: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    const current = props.modelValue ?? '';
    if ((e.target as HTMLInputElement).value) {
      // clear current cell
      updateAt(idx, '');
    } else if (idx > 0) {
      // move back and clear
      e.preventDefault();
      focusIndex(idx - 1);
      updateAt(idx - 1, '');
    }
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    e.preventDefault();
    focusIndex(idx - 1);
  } else if (e.key === 'ArrowRight' && idx < length.value - 1) {
    e.preventDefault();
    focusIndex(idx + 1);
  } else if (!/\d/.test(e.key) && e.key.length === 1) {
    // block non-digit characters
    e.preventDefault();
  }
}

function onFocus(_idx: number, e: Event) {
  (e.target as HTMLInputElement).select();
}

function updateAt(idx: number, digit: string) {
  const current = props.modelValue ?? '';
  const list = current.split('');
  while (list.length < length.value) list.push('');
  list[idx] = (digit || '').replace(/\D+/g, '').slice(0, 1);
  const next = sanitize(list.join(''));
  emit('update:modelValue', next);
}

function onPaste(e: ClipboardEvent) {
  const data = sanitize(e.clipboardData?.getData('text') || '');
  if (!data) return;
  emit('update:modelValue', data);
  maybeComplete(data);
}

function maybeComplete(code: string) {
  if (code.length === length.value) emit('complete', code);
}

// Ensure refs list matches DOM order after mount/updates
watch(length, () => { inputs.value = []; });
</script>
