import bcrypt from 'bcryptjs';

export function validatePinFormat(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin);
}

export async function hashPin(pin: string, saltRounds = 10): Promise<string> {
  if (!validatePinFormat(pin)) throw new Error('PIN must be 4 digits');
  return await bcrypt.hash(pin, saltRounds);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!validatePinFormat(pin)) return false;
  return await bcrypt.compare(pin, hash);
}
