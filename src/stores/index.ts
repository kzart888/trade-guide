import { defineStore } from 'pinia';
import type { City, Product, Edge, PriceMap, PriceRecord } from '@/core/types/domain';
import { priceService } from '@/services';
import { useUserStore } from './user';

export const useGraphStore = defineStore('graph', {
  state: () => ({
    edges: [] as Edge[],
    version: 0,
  }),
});

export const useCityStore = defineStore('city', {
  state: () => ({
    currentCityId: '' as string,
    cities: {} as Record<string, City>,
    products: {} as Record<string, Product>,
  }),
});

export const usePriceStore = defineStore('price', {
  state: () => ({
    priceMap: new Map() as PriceMap,
    dirty: false,
    lastUpdatedAt: null as Date | null,
    saving: false,
  _pollId: null as number | null,
  }),
  actions: {
    ensureCity(cityId: string) {
      if (!this.priceMap.get(cityId)) this.priceMap.set(cityId, new Map());
    },
    setPrice(cityId: string, productId: string, values: { buyPrice?: number | null; sellPrice?: number | null }) {
      this.ensureCity(cityId);
      const cityPrices = this.priceMap.get(cityId)!;
      const curr = cityPrices.get(productId) ?? { buyPrice: null, sellPrice: null };
      const next = {
        buyPrice: values.buyPrice !== undefined ? values.buyPrice : curr.buyPrice,
        sellPrice: values.sellPrice !== undefined ? values.sellPrice : curr.sellPrice,
      };
      cityPrices.set(productId, next);
      this.dirty = true;
    },
    setBatch(cityId: string, updates: Record<string, { buyPrice: number | null; sellPrice: number | null }>) {
      this.ensureCity(cityId);
      const cityPrices = this.priceMap.get(cityId)!;
      for (const [pid, rec] of Object.entries(updates)) {
        cityPrices.set(pid, { buyPrice: rec.buyPrice, sellPrice: rec.sellPrice });
      }
      this.dirty = true;
    },
  async saveBatch(cityId: string) {
      try {
        this.saving = true;
        const cityPrices = this.priceMap.get(cityId) ?? new Map();
        const records: PriceRecord[] = [];
        for (const [productId, rec] of cityPrices.entries()) {
          records.push({
            cityId,
            productId,
            buyPrice: rec?.buyPrice ?? null,
            sellPrice: rec?.sellPrice ?? null,
            updatedAt: new Date(),
      updatedBy: useUserStore().username || 'admin',
          });
        }
    const userId = useUserStore().username || null;
    await priceService.saveBatch(cityId, records, { userId: userId ?? undefined });
        this.dirty = false;
        // After save, re-fetch to sync data/time from server
        await this.refresh();
      } finally {
        this.saving = false;
      }
    },
    async refresh() {
      const { priceMap, lastUpdatedAt } = await priceService.fetchMap();
      this.priceMap = priceMap;
      this.lastUpdatedAt = lastUpdatedAt ?? new Date();
    },
    startPolling(intervalMs = 60000) {
      if (this._pollId) return;
      // Initial refresh
      this.refresh().catch(() => {});
      this._pollId = window.setInterval(() => {
        this.refresh().catch(() => {});
      }, intervalMs);
    },
    stopPolling() {
      if (this._pollId) {
        clearInterval(this._pollId);
        this._pollId = null;
      }
    },
  },
});
