import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/compute' },
  { path: '/prices', component: () => import('@/pages/PriceEntry.vue') },
  { path: '/compute', component: () => import('@/pages/Compute.vue') },
  { path: '/city-config', component: () => import('@/pages/CityConfig.vue') },
  { path: '/distance-config', component: () => import('@/pages/DistanceConfig.vue') },
  { path: '/admin', component: () => import('@/pages/Admin.vue') },
  { path: '/me', component: () => import('@/pages/Me.vue') },
  { path: '/login', component: () => import('@/pages/Login.vue') },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Simple auth guard for selected routes
const protectedPaths = new Set(['/prices', '/compute', '/city-config', '/admin', '/me']);
router.beforeEach((to) => {
  if (!protectedPaths.has(to.path)) return true;
  const store = useUserStore();
  if (!store.username) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.path === '/admin' && !store.isAdmin) {
    return { path: '/compute', query: { msg: 'forbidden' } };
  }
  return true;
});

export default router;
