import { z } from 'zod';
import { logError } from '../core/logging';

/**
 * Validates environment variables at startup to ensure "Fast-Fail"
 * and type-safe access to configuration.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database & Cache
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  // API Keys (External Providers)
  GEMINI_API_KEY: z.string().optional(),
  ELEVEN_LABS_API_KEY: z.string().optional(),
  
  // Platform Credentials (YouTube)
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REDIRECT_URI: z.string().url().optional(),
  
  // Platform Credentials (TikTok)
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  
  // Feature Flags
  SKIP_AI: z.coerce.boolean().default(false),
  DEBUG_MODE: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.errors.map(e => e.path.join('.')).join(', ');
      logError('Environment validation failed.', {
        phase: 'startup',
        errorType: 'EnvError',
        errorMessage: `Missing or invalid keys: ${missingKeys}`,
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
