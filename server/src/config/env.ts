import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Environment variable schema with validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),

  // Uploads
  MAX_UPLOAD_MB: z.string().default('200').transform(Number),
  UPLOAD_DIR: z.string().default('./uploads'),

  // Google Sheets (optional - at least one should be provided)
  SHEETS_API_KEY: z.string().optional(),
  SHEETS_SERVICE_ACCOUNT_JSON: z.string().optional(),

  // OpenRouter AI
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
});

// Validate and export environment variables
export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
