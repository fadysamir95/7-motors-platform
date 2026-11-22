const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERN = /change[-_ ]?me|dev[-_ ]?secret|replace[-_ ]?with|your[-_ ]?secret|example|password|secret123/i;

/**
 * Validates environment variables at boot (used by ConfigModule.forRoot).
 * The application refuses to start when the JWT secret is missing, too short
 * or an obvious placeholder, so no insecure default can ever be used.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const secret = config.JWT_SECRET;

  if (typeof secret !== 'string' || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long.`);
  }
  if (PLACEHOLDER_PATTERN.test(secret)) {
    throw new Error('JWT_SECRET looks like a placeholder/default value. Set a unique random secret.');
  }

  return config;
}
