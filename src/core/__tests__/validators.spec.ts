import { describe, it, expect } from 'vitest';
import { isNonNegativeInteger, parsePrice, isValidBuySell } from '../validators';

describe('validators', () => {
  it('isNonNegativeInteger', () => {
    expect(isNonNegativeInteger(0)).toBe(true);
    expect(isNonNegativeInteger(10)).toBe(true);
    expect(isNonNegativeInteger(-1)).toBe(false);
    expect(isNonNegativeInteger(1.1)).toBe(false);
    expect(isNonNegativeInteger('1' as any)).toBe(false);
  });

  it('parsePrice', () => {
    expect(parsePrice('0')).toBe(0);
    expect(parsePrice(' 123 ')).toBe(123);
    expect(parsePrice('01')).toBe(1);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-1')).toBeNull();
  });

  it('isValidBuySell', () => {
    expect(isValidBuySell(null, null)).toBe(true);
    expect(isValidBuySell(0, 1)).toBe(true);
    expect(isValidBuySell(10, null)).toBe(true);
    expect(isValidBuySell(-1 as any, 0)).toBe(false);
    expect(isValidBuySell(0.5 as any, 0)).toBe(false);
  });
});
