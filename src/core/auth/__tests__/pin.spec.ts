import { describe, it, expect } from 'vitest';
import { validatePinFormat, hashPin, verifyPin } from '../pin';

describe('PIN auth', () => {
  it('validates 4-digit format', () => {
    expect(validatePinFormat('0000')).toBe(true);
    expect(validatePinFormat('1234')).toBe(true);
    expect(validatePinFormat('12')).toBe(false);
    expect(validatePinFormat('abcd')).toBe(false);
    expect(validatePinFormat('12345')).toBe(false);
  });

  it('hashes and verifies a valid PIN', async () => {
    const hash = await hashPin('1234');
    expect(await verifyPin('1234', hash)).toBe(true);
    expect(await verifyPin('0000', hash)).toBe(false);
  });

  it('rejects invalid PIN format for hash', async () => {
    await expect(hashPin('12a4')).rejects.toThrow();
  });
});
