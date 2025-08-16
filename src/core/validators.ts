export function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function parsePrice(input: string): number | null {
  if (input == null) return null;
  const t = input.trim();
  if (!/^\d+$/.test(t)) return null;
  const v = Number(t);
  return v >= 0 ? v : null;
}

export function isValidBuySell(buy: number | null, sell: number | null): boolean {
  // Both null allowed; otherwise each must be non-negative integer
  const ok = (x: number | null) => x == null || (Number.isInteger(x) && x >= 0);
  return ok(buy) && ok(sell);
}
