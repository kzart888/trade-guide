import type { City, Edge, PriceMap, Product, TradePlan } from '../types/domain';

/**
 * Parameters for the `computeBestDirectTrip` function.
 */
export interface ComputeBestDirectTripParams {
  originCityId: string;
  stamina: number;
  maxWeight: number;
  cities: Record<string, City>;
  products: Record<string, Product>;
  edges: Edge[];
  priceMap: PriceMap;
}

/**
 * Calculates the best single-stop trade plan from a given origin city.
 *
 * The strategy is to enumerate through the three buyable products at the origin,
 * find all directly reachable cities within the given stamina limit, and
 * calculate the potential profit for selling each product there.
 *
 * The "best" plan is determined by the highest total profit. Ties are broken
 * by the highest profit per stamina unit, and then by the shortest distance.
 *
 * @param params - The necessary data for calculation.
 * @returns The most profitable trade plan, or null if no profitable trip is possible.
 */
export function computeBestDirectTrip(params: ComputeBestDirectTripParams): TradePlan | null {
  const { originCityId, stamina, maxWeight, cities, products, edges, priceMap } = params;

  const originCity = cities[originCityId];
  if (!originCity) {
    console.error(`Error: Origin city with ID '${originCityId}' not found.`);
    return null;
  }

  const originPrices = priceMap.get(originCityId);
  if (!originPrices) {
    // It's possible there are no prices for the origin city yet.
    return null;
  }

  const candidatePlans: TradePlan[] = [];

  // 1. Find all directly reachable neighbor cities based on stamina
  const reachableNeighbors = edges.filter(
    edge => (edge.fromCityId === originCityId && edge.distance <= stamina)
  );

  // 2. Iterate through the 3 buyable products in the origin city
  for (const productId of originCity.buyableProductIds) {
    const product = products[productId];
    const originProductPrices = originPrices.get(productId);

    // Skip if product info or buy price is missing
    if (!product || !originProductPrices?.buyPrice) {
      continue;
    }

    const buyPrice = originProductPrices.buyPrice;

    // 3. Calculate max quantity based on weight
    const quantity = Math.floor(maxWeight / product.weight);
    if (quantity === 0) {
      continue;
    }

    // 4. Iterate through reachable neighbors to find the best sell location
    for (const neighborEdge of reachableNeighbors) {
      const destinationCityId = neighborEdge.toCityId;
      const destinationPrices = priceMap.get(destinationCityId);
      const destinationProductPrices = destinationPrices?.get(productId);

      // Skip if sell price is missing or not profitable
      if (!destinationProductPrices?.sellPrice || destinationProductPrices.sellPrice <= buyPrice) {
        continue;
      }

      const sellPrice = destinationProductPrices.sellPrice;
      const unitProfit = sellPrice - buyPrice;
      const totalProfit = unitProfit * quantity;
      const distance = neighborEdge.distance;
      const profitPerStamina = totalProfit / distance; // distance is used as stamina cost

      candidatePlans.push({
        productId,
        fromCityId: originCityId,
        toCityId: destinationCityId,
        quantity,
        unitProfit,
        totalProfit,
        distance,
        profitPerStamina,
      });
    }
  }

  // 5. If no profitable plans found, return null
  if (candidatePlans.length === 0) {
    return null;
  }

  // 6. Sort candidates to find the best plan
  candidatePlans.sort((a, b) => {
    // Primary sort: totalProfit (descending)
    if (a.totalProfit !== b.totalProfit) {
      return b.totalProfit - a.totalProfit;
    }
    // Secondary sort: profitPerStamina (descending)
    if (a.profitPerStamina !== b.profitPerStamina) {
      return b.profitPerStamina - a.profitPerStamina;
    }
    // Tertiary sort: distance (ascending)
    return a.distance - b.distance;
  });

  return candidatePlans[0];
}

/**
 * Compute the best plan per buyable product at the origin, returning up to 3 entries
 * sorted by totalProfit desc, then profitPerStamina desc, then distance asc.
 */
export function computeTopPlansPerBuyable(params: ComputeBestDirectTripParams): TradePlan[] {
  const { originCityId, stamina, maxWeight, cities, products, edges, priceMap } = params;
  const originCity = cities[originCityId];
  if (!originCity) return [];
  const originPrices = priceMap.get(originCityId);
  if (!originPrices) return [];

  const reachableNeighbors = edges.filter(e => e.fromCityId === originCityId && e.distance <= stamina);
  const bestByProduct = new Map<string, TradePlan>();

  for (const productId of originCity.buyableProductIds) {
    const product = products[productId];
    const op = originPrices.get(productId);
    if (!product || !op?.buyPrice) continue;
    const buyPrice = op.buyPrice;
    const quantity = Math.floor(maxWeight / product.weight);
    if (quantity === 0) continue;

    for (const edge of reachableNeighbors) {
      const destPrices = priceMap.get(edge.toCityId)?.get(productId);
      if (!destPrices?.sellPrice || destPrices.sellPrice <= buyPrice) continue;
      const unitProfit = destPrices.sellPrice - buyPrice;
      const totalProfit = unitProfit * quantity;
      const plan: TradePlan = {
        productId,
        fromCityId: originCityId,
        toCityId: edge.toCityId,
        quantity,
        unitProfit,
        totalProfit,
        distance: edge.distance,
        profitPerStamina: totalProfit / edge.distance,
      };
      const prev = bestByProduct.get(productId);
      if (!prev
        || plan.totalProfit > prev.totalProfit
        || (plan.totalProfit === prev.totalProfit && plan.profitPerStamina > prev.profitPerStamina)
        || (plan.totalProfit === prev.totalProfit && plan.profitPerStamina === prev.profitPerStamina && plan.distance < prev.distance)
      ) {
        bestByProduct.set(productId, plan);
      }
    }
  }

  const out = Array.from(bestByProduct.values());
  out.sort((a, b) => {
    if (a.totalProfit !== b.totalProfit) return b.totalProfit - a.totalProfit;
    if (a.profitPerStamina !== b.profitPerStamina) return b.profitPerStamina - a.profitPerStamina;
    return a.distance - b.distance;
  });
  return out;
}
