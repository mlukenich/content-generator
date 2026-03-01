export type RuntimeRole = 'app' | 'worker';

interface EnvValidationResult {
  role: RuntimeRole;
  required: string[];
  missing: string[];
}

function requiredByRole(role: RuntimeRole): string[] {
  const common = ['DATABASE_URL', 'REDIS_URL'];

  if (role === 'app') {
    return [...common];
  }

  return [...common];
}

export function validateRuntimeEnv(role: RuntimeRole): EnvValidationResult {
  const required = requiredByRole(role);
  const missing = required.filter((name) => !process.env[name] || process.env[name]?.trim().length === 0);

  if (missing.length > 0) {
    const message = [
      `[CONFIG] Invalid runtime configuration for role "${role}".`,
      `[CONFIG] Missing required environment variables: ${missing.join(', ')}`,
      '[CONFIG] Remediation: ensure these are defined in your .env or deployment environment before startup.',
    ].join('\n');

    throw new Error(message);
  }

  return { role, required, missing };
}
