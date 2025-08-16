import { defineStore } from 'pinia';
import { userService } from '@/services';

export const useUserStore = defineStore('user', {
  state: () => ({
    username: '' as string,
    approved: false as boolean,
    isAdmin: false as boolean,
  isCreator: false as boolean,
    loggingIn: false as boolean,
    error: '' as string,
    hydrated: false as boolean,
  }),
  actions: {
    hydrate() {
      if (this.hydrated) return;
      try {
        const raw = localStorage.getItem('tg_session_v1');
        if (raw) {
          const sess = JSON.parse(raw) as { username: string; approved: boolean; isAdmin: boolean; isCreator?: boolean; ts: number };
          const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
          if (Date.now() - (sess.ts || 0) < maxAgeMs) {
            this.username = sess.username;
            this.approved = !!sess.approved;
            this.isAdmin = !!sess.isAdmin;
            this.isCreator = !!sess.isCreator;
          } else {
            localStorage.removeItem('tg_session_v1');
          }
        }
      } catch {}
      this.hydrated = true;
    },
    async login(username: string, pin: string) {
  // reset state before attempting login
  this.username = '';
  this.approved = false;
  this.isAdmin = false;
  this.isCreator = false;
      this.loggingIn = true;
      this.error = '';
      try {
        const res = await userService.login(username, pin);
        this.username = res.username;
        this.approved = res.approved;
        this.isAdmin = res.isAdmin;
        this.isCreator = res.isCreator;
        try {
          localStorage.setItem('tg_session_v1', JSON.stringify({ username: this.username, approved: this.approved, isAdmin: this.isAdmin, isCreator: this.isCreator, ts: Date.now() }));
        } catch {}
      } catch (e: any) {
        this.error = e?.message || String(e) || '';
        throw e;
      } finally {
        this.loggingIn = false;
      }
    },
    logout() {
      this.username = '';
      this.approved = false;
      this.isAdmin = false;
      this.isCreator = false;
      try { localStorage.removeItem('tg_session_v1'); } catch {}
    },
  },
});
