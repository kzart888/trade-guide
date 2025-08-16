import type { City, Product, Edge, PriceMap } from '@/core/types/domain';

export const mockCities: Record<string, City> = {
  c1: { id: 'c1', name: '长安', buyableProductIds: ['p1','p2','p3'] },
  c2: { id: 'c2', name: '洛阳', buyableProductIds: ['p1','p2','p3'] },
  c3: { id: 'c3', name: '建康', buyableProductIds: ['p1','p2','p3'] },
};

export const mockProducts: Record<string, Product> = {
  p1: { id: 'p1', name: '丝绸', weight: 10 },
  p2: { id: 'p2', name: '瓷器', weight: 20 },
  p3: { id: 'p3', name: '茶叶', weight: 5 },
};

export const mockEdges: Edge[] = [
  { fromCityId: 'c1', toCityId: 'c2', distance: 10 },
  { fromCityId: 'c1', toCityId: 'c3', distance: 20 },
];

export const mockPriceMap: PriceMap = new Map([
  ['c1', new Map([
    ['p1', { buyPrice: 100, sellPrice: 90 }],
    ['p2', { buyPrice: 500, sellPrice: 450 }],
    ['p3', { buyPrice: 50, sellPrice: 40 }],
  ])],
  ['c2', new Map([
    ['p1', { buyPrice: 110, sellPrice: 120 }],
    ['p2', { buyPrice: 520, sellPrice: 580 }],
    ['p3', { buyPrice: 55, sellPrice: 60 }],
  ])],
  ['c3', new Map([
    ['p1', { buyPrice: 105, sellPrice: 115 }],
    ['p2', { buyPrice: 510, sellPrice: 600 }],
    ['p3', { buyPrice: 60, sellPrice: 70 }],
  ])],
]);
