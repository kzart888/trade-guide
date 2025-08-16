<template>
  <div class="flex gap-2" @paste.prevent="onPaste">
    <input
      v-for="i in length"
      :key="i"
      :ref="(el) => setInputRef(i - 1, el)"
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
import { computed, ref, watch, onMounted, type ComponentPublicInstance } from 'vue';

const props = defineProps<{ modelValue: string; length?: number }>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'complete', v: string): void;
}>();

const length = computed(() => props.length ?? 4);
const chars = computed(() => props.modelValue?.split('').slice(0, length.value) ?? []);

const inputs = ref<(HTMLInputElement | undefined)[]>([]);
function setInputRef(idx: number, el: Element | ComponentPublicInstance | null) {
  if (!el) {
    inputs.value[idx] = undefined;
    return;
  }
  if (el instanceof HTMLInputElement) {
    inputs.value[idx] = el;
  }
}

function focusIndex(idx: number) {
  const el = inputs.value[idx];
  if (el) {
    el.focus();
    el.select();
  }
}

function focusFirstEmpty() {
  const index = Math.max(0, (chars.value.findIndex(c => !c) === -1 ? chars.value.length - 1 : chars.value.findIndex(c => !c)));
  focusIndex(Math.min(index, length.value - 1));
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
  // If user types multiple digits into one box (e.g., mobile), spread them forward
  const current = props.modelValue ?? '';
  const before = current.slice(0, idx);
  const after = current.slice(idx + 1);
  const merged = sanitize(before + val + after);
  emit('update:modelValue', merged);
  const nextIndex = Math.min(idx + Math.max(1, val.length), length.value - 1);
  focusIndex(nextIndex);
  maybeComplete(merged);
}

function onKeydown(idx: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    if ((e.target as HTMLInputElement).value) {
      // clear current cell
      updateAt(idx, '');
    } else if (idx > 0) {
      // move back and clear previous
      e.preventDefault();
      updateAt(idx - 1, '');
      focusIndex(idx - 1);
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

watch(length, (n) => {
  inputs.value.length = n;
});

onMounted(() => {
  // Auto-focus the first empty box for faster typing
  focusFirstEmpty();
});
</script>
