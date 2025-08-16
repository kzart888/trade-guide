<template>
  <div class="p-6 space-y-3">
    <h1 class="text-sm md:text-lg font-600 leading-5 md:leading-6">登录</h1>
    <div class="space-y-2">
      <label class="block text-sm">用户名</label>
  <input v-model.trim="username" class="w-full border rounded px-3 py-2 md:py-2 py-1.5" placeholder="请输入用户名" />
    </div>
    <div class="space-y-2">
      <label class="block text-sm">PIN码（4位）</label>
  <PinInput v-model="pin" :length="4" @complete="submit" />
    </div>
    <div class="flex items-center gap-2">
      <button class="px-2 py-1 md:px-3 md:py-2 bg-blue-600 text-white rounded disabled:opacity-60" :disabled="!canSubmit || loggingIn || waiting" @click="submit">登录</button>
      <span v-if="loggingIn" class="text-sm text-blue-600">登录中…</span>
      <span v-else-if="error" class="text-sm text-red-600">{{ errorHint }}</span>
      <span v-else-if="waiting" class="text-sm text-amber-600">注册成功，等待审批中</span>
    </div>
    <div class="pt-2 text-sm text-gray-600">
      没有账号？
  <button class="underline text-blue-600 disabled:opacity-60" :disabled="!username || !/^\d{4}$/.test(pin) || waiting" @click="register">提交注册（待管理员审批）</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import router from '@/router';
import PinInput from '@/components/PinInput.vue';
import { userService } from '@/services';
import { useUiStore } from '@/stores/ui';

const store = useUserStore();
const ui = useUiStore();
const username = ref('');
const pin = ref('');
const loggingIn = computed(() => store.loggingIn);
const error = computed(() => store.error);
const waiting = ref(false);
const canSubmit = computed(() => username.value.length > 0 && /^\d{4}$/.test(pin.value));
const errorHint = computed(() => {
  switch (error.value) {
    case 'PIN_INVALID': return 'PIN码错误';
    case 'ACCOUNT_LOCKED': return '账户已锁定，请稍后再试';
    case 'USER_NOT_FOUND_OR_NOT_APPROVED': return '用户不存在或未审批';
    default: return error.value;
  }
});

async function submit() {
  try {
  // Clear any stale session before login attempt
  store.logout();
    await store.login(username.value, pin.value);
    try { localStorage.setItem('tg_username', username.value); } catch {}
    router.replace('/compute');
  } catch {}
}

async function register() {
  try {
    await userService.register(username.value, pin.value);
  ui.success('注册已提交，等待管理员审批');
  waiting.value = true;
  } catch (e: any) {
    ui.error(e?.message || '注册失败');
  }
}

onMounted(() => {
  try {
    const saved = localStorage.getItem('tg_username');
    if (saved) username.value = saved;
  } catch {}
});
</script>
