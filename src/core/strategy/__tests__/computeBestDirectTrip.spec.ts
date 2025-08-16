import { describe, it, expect } from 'vitest';
import { computeBestDirectTrip, type ComputeBestDirectTripParams } from '../computeBestDirectTrip';
import type { City, Edge, PriceMap, Product } from '../../../core/types/domain';

// 构造符合当前类型定义的测试数据
const products: Record<string, Product> = {
  p1: { id: 'p1', name: '丝绸', weight: 10 },
  p2: { id: 'p2', name: '瓷器', weight: 20 },
  p3: { id: 'p3', name: '茶叶', weight: 5 },
};

const cities: Record<string, City> = {
  c1: { id: 'c1', name: '长安', buyableProductIds: ['p1', 'p2', 'p3'] },
  c2: { id: 'c2', name: '洛阳', buyableProductIds: ['p1', 'p2', 'p3'] },
  c3: { id: 'c3', name: '建康', buyableProductIds: ['p1', 'p2', 'p3'] },
  c4: { id: 'c4', name: '成都', buyableProductIds: ['p1', 'p2', 'p3'] },
};

const edges: Edge[] = [
  { fromCityId: 'c1', toCityId: 'c2', distance: 10 },
  { fromCityId: 'c1', toCityId: 'c3', distance: 20 },
  { fromCityId: 'c1', toCityId: 'c4', distance: 30 },
];

const basePriceMap: PriceMap = new Map();
basePriceMap.set(
  'c1',
  new Map<string, { buyPrice: number | null; sellPrice: number | null }>([
    ['p1', { buyPrice: 100, sellPrice: 90 }],
    ['p2', { buyPrice: 500, sellPrice: 450 }],
    ['p3', { buyPrice: 50, sellPrice: 40 }],
  ]),
);
basePriceMap.set(
  'c2',
  new Map<string, { buyPrice: number | null; sellPrice: number | null }>([
    ['p1', { buyPrice: 110, sellPrice: 120 }],
    ['p2', { buyPrice: 520, sellPrice: 580 }],
    ['p3', { buyPrice: 55, sellPrice: 60 }],
  ]),
);
basePriceMap.set(
  'c3',
  new Map<string, { buyPrice: number | null; sellPrice: number | null }>([
    ['p1', { buyPrice: 105, sellPrice: 115 }],
    ['p2', { buyPrice: 510, sellPrice: 600 }],
    ['p3', { buyPrice: 60, sellPrice: 70 }],
  ]),
);
basePriceMap.set(
  'c4',
  new Map<string, { buyPrice: number | null; sellPrice: number | null }>([
    ['p1', { buyPrice: null, sellPrice: 130 }],
  ]),
);

function clonePriceMap(pm: PriceMap): PriceMap {
  const out: PriceMap = new Map();
  for (const [cityId, inner] of pm.entries()) {
    const innerClone = new Map<string, { buyPrice: number | null; sellPrice: number | null }>();
    for (const [pid, rec] of inner.entries()) {
      innerClone.set(pid, rec ? { buyPrice: rec.buyPrice, sellPrice: rec.sellPrice } : { buyPrice: null, sellPrice: null });
    }
    out.set(cityId, innerClone);
  }
  return out;
}

describe('computeBestDirectTrip', () => {
  const base: Omit<ComputeBestDirectTripParams, 'stamina' | 'maxWeight'> = {
    originCityId: 'c1',
    cities,
    products,
    edges,
    priceMap: basePriceMap,
  };

  it('应该返回最高利润方案', () => {
    const params: ComputeBestDirectTripParams = { ...base, stamina: 25, maxWeight: 100 };
    const plan = computeBestDirectTrip(params);
    expect(plan).not.toBeNull();
    // 期望为 p2 -> c3，总利润 500
    expect(plan!.productId).toBe('p2');
    expect(plan!.toCityId).toBe('c3');
    expect(plan!.totalProfit).toBe(500);
  });

  it('没有正利润时返回 null', () => {
  const noProfit = clonePriceMap(basePriceMap);
    noProfit.get('c2')?.set('p1', { buyPrice: 110, sellPrice: 100 });
    noProfit.get('c2')?.set('p2', { buyPrice: 520, sellPrice: 500 });
    noProfit.get('c2')?.set('p3', { buyPrice: 55, sellPrice: 50 });
    noProfit.get('c3')?.set('p1', { buyPrice: 105, sellPrice: 100 });
    noProfit.get('c3')?.set('p2', { buyPrice: 510, sellPrice: 500 });
    noProfit.get('c3')?.set('p3', { buyPrice: 60, sellPrice: 50 });
  // also neutralize c4 p1 to avoid accidental profit
  noProfit.get('c4')?.set('p1', { buyPrice: null, sellPrice: 90 });

    const params: ComputeBestDirectTripParams = { ...base, priceMap: noProfit, stamina: 30, maxWeight: 100 };
    const plan = computeBestDirectTrip(params);
    expect(plan).toBeNull();
  });

  it('体力不足时返回 null', () => {
    const params: ComputeBestDirectTripParams = { ...base, stamina: 5, maxWeight: 100 };
    const plan = computeBestDirectTrip(params);
    expect(plan).toBeNull();
  });

  it('按载重正确计算数量与利润', () => {
  const params: ComputeBestDirectTripParams = { ...base, stamina: 25, maxWeight: 45 };
    const plan = computeBestDirectTrip(params);
    expect(plan?.productId).toBe('p2');
    expect(plan?.toCityId).toBe('c3');
    expect(plan?.quantity).toBe(2);
    expect(plan?.totalProfit).toBe(200);
  });

  it('最大载重过小则返回 null', () => {
    const params: ComputeBestDirectTripParams = { ...base, stamina: 30, maxWeight: 4 };
    const plan = computeBestDirectTrip(params);
    expect(plan).toBeNull();
  });

  it('平手时按利润/体力与距离打破僵局', () => {
  const tie = clonePriceMap(basePriceMap);
  tie.get('c2')?.set('p1', { buyPrice: 100, sellPrice: 120 }); // 利润200, 距离10, pps=20
  tie.get('c3')?.set('p2', { buyPrice: 500, sellPrice: 540 }); // 利润200, 距离20, pps=10
  // 降低其他干扰项以形成明确的平手场景
  tie.get('c2')?.set('p2', { buyPrice: 520, sellPrice: 500 }); // 非盈利
  tie.get('c3')?.set('p3', { buyPrice: 60, sellPrice: 55 }); // 亏损
  // 限制体力，排除 c4 (distance 30)
  const params: ComputeBestDirectTripParams = { ...base, priceMap: tie, stamina: 25, maxWeight: 100 };
    const plan = computeBestDirectTrip(params);
    expect(plan?.productId).toBe('p1');
    expect(plan?.toCityId).toBe('c2');
  });

  it('起点城市缺少价格返回 null', () => {
    const params: ComputeBestDirectTripParams = { ...base, originCityId: 'c4', stamina: 30, maxWeight: 100 };
    const plan = computeBestDirectTrip(params);
    expect(plan).toBeNull();
  });
});
