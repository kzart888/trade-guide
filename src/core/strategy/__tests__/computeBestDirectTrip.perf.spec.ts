import { describe, it, expect } from 'vitest';
import { computeBestDirectTrip } from '../computeBestDirectTrip';
import type { City, Edge, Product, PriceMap } from '../../types/domain';

// Build a larger graph to measure performance
function buildPerfData(degree = 30) {
  const origin = 'c0';
  const cities: Record<string, City> = {
    [origin]: { id: origin, name: 'Origin', buyableProductIds: ['p1','p2','p3'] },
  };
  const products: Record<string, Product> = {
    p1: { id: 'p1', name: 'A', weight: 10 },
    p2: { id: 'p2', name: 'B', weight: 20 },
    p3: { id: 'p3', name: 'C', weight: 5 },
  };
  const edges: Edge[] = [];
  const priceMap: PriceMap = new Map([
    [origin, new Map([
      ['p1', { buyPrice: 100, sellPrice: 0 }],
      ['p2', { buyPrice: 200, sellPrice: 0 }],
      ['p3', { buyPrice: 50, sellPrice: 0 }],
    ])],
  ]);
  for (let i = 1; i <= degree; i++) {
    const id = `c${i}`;
    cities[id] = { id, name: `N${i}`, buyableProductIds: ['p1','p2','p3'] };
    edges.push({ fromCityId: origin, toCityId: id, distance: 10 + (i % 5) });
    priceMap.set(id, new Map([
      ['p1', { buyPrice: null, sellPrice: 120 + (i % 3) }],
      ['p2', { buyPrice: null, sellPrice: 240 + (i % 7) }],
      ['p3', { buyPrice: null, sellPrice: 60 + (i % 11) }],
    ]));
  }
  return { originCityId: origin, stamina: 20, maxWeight: 100, cities, products, edges, priceMap };
}

describe('computeBestDirectTrip performance', () => {
  it('should run under 100ms for degree 30', () => {
    const params = buildPerfData(30);
    const start = (globalThis.performance ?? { now: () => Date.now() }).now();
    const plan = computeBestDirectTrip(params);
    const elapsed = (globalThis.performance ?? { now: () => Date.now() }).now() - start;
    expect(plan).not.toBeNull();
    expect(elapsed).toBeLessThan(100);
  });
});
