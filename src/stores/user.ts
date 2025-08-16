import { defineStore } from 'pinia';
import { userService } from '@/services';

export const useUserStore = defineStore('user', {
  state: () => ({
    username: '' as string,
    approved: false as boolean,
    isAdmin: false as boolean,
    loggingIn: false as boolean,
    error: '' as string,
  }),
  actions: {
    async login(username: string, pin: string) {
      this.loggingIn = true;
      this.error = '';
      try {
        const res = await userService.login(username, pin);
        this.username = res.username;
        this.approved = res.approved;
        this.isAdmin = res.isAdmin;
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
    },
  },
});
