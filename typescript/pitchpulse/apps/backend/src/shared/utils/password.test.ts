import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password';

describe('Password utilities', () => {
  it('hashes a password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('compares password with hash correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const password = 'testPassword123';
    const wrongPassword = 'wrongPassword';
    const hash = await hashPassword(password);

    const isValid = await comparePassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});
