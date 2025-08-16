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
    // Snapshot from last successful fetch/save to compute per-record diffs
    _baselineMap: new Map() as PriceMap,
    // Set of keys "cityId|productId" modified since baseline
    _pending: new Set<string>(),
    dirty: false,
    lastUpdatedAt: null as Date | null,
    saving: false,
  _pollId: null as number | null,
  }),
  actions: {
    ensureCity(cityId: string) {
      if (!this.priceMap.get(cityId)) this.priceMap.set(cityId, new Map());
      if (!this._baselineMap.get(cityId)) this._baselineMap.set(cityId, new Map());
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
      // Compare against baseline to decide if this record is pending
      const baseCity = this._baselineMap.get(cityId) ?? new Map();
      const base = baseCity.get(productId) ?? { buyPrice: null, sellPrice: null };
      const key = `${cityId}|${productId}`;
      if (next.buyPrice === base.buyPrice && next.sellPrice === base.sellPrice) {
        this._pending.delete(key);
      } else {
        this._pending.add(key);
      }
      this.dirty = this._pending.size > 0;
    },
    setBatch(cityId: string, updates: Record<string, { buyPrice: number | null; sellPrice: number | null }>) {
      this.ensureCity(cityId);
      const cityPrices = this.priceMap.get(cityId)!;
      for (const [pid, rec] of Object.entries(updates)) {
        cityPrices.set(pid, { buyPrice: rec.buyPrice, sellPrice: rec.sellPrice });
        const base = (this._baselineMap.get(cityId)?.get(pid)) ?? { buyPrice: null, sellPrice: null };
        const key = `${cityId}|${pid}`;
        if (rec.buyPrice === base.buyPrice && rec.sellPrice === base.sellPrice) this._pending.delete(key);
        else this._pending.add(key);
      }
      this.dirty = this._pending.size > 0;
    },
  async saveBatch(cityId: string) {
      try {
        this.saving = true;
        const cityPrices = this.priceMap.get(cityId) ?? new Map();
        // Only include changed items for this city
        const changedPids: string[] = [];
        for (const k of this._pending) {
          const [cid, pid] = k.split('|');
          if (cid === cityId) changedPids.push(pid);
        }
        if (changedPids.length === 0) {
          this.dirty = this._pending.size > 0;
          return;
        }
        const records: PriceRecord[] = changedPids.map(productId => {
          const rec = cityPrices.get(productId) ?? { buyPrice: null, sellPrice: null };
          return {
            cityId,
            productId,
            buyPrice: rec?.buyPrice ?? null,
            sellPrice: rec?.sellPrice ?? null,
            updatedAt: new Date(),
            updatedBy: useUserStore().username || 'admin',
          };
        });
    const userId = useUserStore().username || null;
    await priceService.saveBatch(cityId, records, { userId: userId ?? undefined });
        // Merge saved values into baseline and clear pending for this city
        const baseCity = this._baselineMap.get(cityId) ?? new Map();
        for (const pid of changedPids) {
          const rec = cityPrices.get(pid) ?? { buyPrice: null, sellPrice: null };
          baseCity.set(pid, { buyPrice: rec.buyPrice, sellPrice: rec.sellPrice, updatedAt: new Date() } as any);
          this._pending.delete(`${cityId}|${pid}`);
        }
        this._baselineMap.set(cityId, baseCity);
        this.dirty = this._pending.size > 0;
        // After save, re-fetch to sync data/time from server
        await this.refresh();
      } finally {
        this.saving = false;
      }
    },
    async refresh() {
      const { priceMap, lastUpdatedAt } = await priceService.fetchMap();
      this.priceMap = priceMap;
      // Reset baseline and pending on fresh fetch
      this._baselineMap = new Map();
      for (const [cid, cmap] of priceMap.entries()) {
        const clone = new Map<string, any>();
        for (const [pid, rec] of cmap.entries()) {
          clone.set(pid, { buyPrice: rec.buyPrice, sellPrice: rec.sellPrice, updatedAt: rec.updatedAt ?? null });
        }
        this._baselineMap.set(cid, clone as any);
      }
      this._pending.clear();
      this.dirty = false;
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
