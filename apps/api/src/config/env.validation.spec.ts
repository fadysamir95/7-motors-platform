import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const strong = 'a3f9c1e7b2d84056a1b3c5d7e9f0123456789abcdef0123456789abcdef01234';

  it('accepts a strong secret', () => {
    expect(validateEnv({ JWT_SECRET: strong })).toEqual({ JWT_SECRET: strong });
  });

  it('rejects a missing secret', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET is required/);
  });

  it('rejects an empty secret', () => {
    expect(() => validateEnv({ JWT_SECRET: '   ' })).toThrow(/JWT_SECRET is required/);
  });

  it('rejects a short secret', () => {
    expect(() => validateEnv({ JWT_SECRET: 'abc123' })).toThrow(/at least 32/);
  });

  it.each([
    'change-me-in-production-change-me-in-production',
    'dev-secret-change-in-prod-dev-secret-change-in-prod',
    'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARS',
  ])('rejects placeholder secret %s', (value) => {
    expect(() => validateEnv({ JWT_SECRET: value })).toThrow(/placeholder/);
  });
});
