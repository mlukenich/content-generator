import { afterEach, describe, expect, test } from 'bun:test';
import { validateRuntimeEnv } from './env';

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalRedisUrl = process.env.REDIS_URL;

afterEach(() => {
  process.env.DATABASE_URL = originalDatabaseUrl;
  process.env.REDIS_URL = originalRedisUrl;
});

describe('validateRuntimeEnv', () => {
  test('throws when DATABASE_URL missing', () => {
    delete process.env.DATABASE_URL;
    process.env.REDIS_URL = 'redis://localhost:6379';

    expect(() => validateRuntimeEnv('app')).toThrow('DATABASE_URL');
  });

  test('throws when REDIS_URL missing', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    delete process.env.REDIS_URL;

    expect(() => validateRuntimeEnv('worker')).toThrow('REDIS_URL');
  });

  test('passes when required vars exist', () => {
    process.env.DATABASE_URL = 'postgresql://x';
    process.env.REDIS_URL = 'redis://localhost:6379';

    const result = validateRuntimeEnv('app');
    expect(result.missing.length).toBe(0);
    expect(result.required).toContain('DATABASE_URL');
    expect(result.required).toContain('REDIS_URL');
  });
});
