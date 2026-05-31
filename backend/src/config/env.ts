import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  APP_URL: z.string().optional(),
  APP_URL_2: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_APP_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(): AppEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${errors}`);
  }
  return result.data;
}
