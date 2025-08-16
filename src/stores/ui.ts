import { defineStore } from 'pinia';

export type Toast = { id: number; type: 'success'|'error'|'info'; message: string; ttl?: number };

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as Toast[],
    seq: 1,
  }),
  actions: {
    show(message: string, type: Toast['type'] = 'info', ttl = 2000) {
      const id = this.seq++;
      this.toasts.push({ id, type, message, ttl });
      if (ttl && ttl > 0) {
        setTimeout(() => this.dismiss(id), ttl);
      }
      return id;
    },
    dismiss(id: number) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },
    success(msg: string, ttl?: number) { return this.show(msg, 'success', ttl); },
    error(msg: string, ttl?: number) { return this.show(msg, 'error', ttl); },
    info(msg: string, ttl?: number) { return this.show(msg, 'info', ttl); },
  }
});
