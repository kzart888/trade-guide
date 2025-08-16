/**
 * @file Domain-specific types for the Trade Guide application.
 * This file contains the core data structures used throughout the application,
 * representing key entities like cities, products, and trade plans.
 *
 * These types are based on the definitions in `docs/data-models.md` and `README.md`.
 */

/**
 * Represents a tradable product.
 */
export interface Product {
  id: string;
  name: string;
  weight: number;
}

/**
 * Represents a city in the trade network.
 */
export interface City {
  id: string;
  name: string;
  /**
   * A fixed-size array of three product IDs that are available for purchase in this city.
   */
  buyableProductIds: [string, string, string];
}

/**
 * Represents a direct connection (edge) between two cities.
 */
export interface Edge {
  fromCityId: string;
  toCityId: string;
  distance: number;
}

/**
 * Represents the price information for a product in a specific city.
 */
export interface PriceRecord {
  cityId: string;
  productId: string;
  buyPrice: number | null;
  sellPrice: number | null;
  updatedAt: Date;
  updatedBy: string; // User ID
}

/**
 * A map structure for efficient price lookups.
 * `Map<cityId, Map<productId, { buyPrice: number | null; sellPrice: number | null }>>`
 */
export type PriceMap = Map<string, Map<string, {
  buyPrice: number | null;
  sellPrice: number | null;
  updatedAt?: Date | null;
}>>;

/**
 * Represents a calculated optimal trade journey for a single product.
 * This is the output of the core strategy computation.
 */
export interface TradePlan {
  productId: string;
  fromCityId: string;
  toCityId: string;
  quantity: number;
  unitProfit: number;
  totalProfit: number;
  distance: number;
  profitPerStamina: number;
}

/**
 * Represents a user of the application.
 */
export interface User {
  id: string;
  username: string;
  /**
   * The hashed PIN for the user.
   */
  pinHash: string;
  isApproved: boolean;
  isAdmin: boolean;
}

/**
 * Represents an audit log entry for a specific action.
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string; // e.g., 'PRICE_UPDATE', 'CITY_CREATE'
  details: Record<string, any>; // Flexible object for action-specific data
}
