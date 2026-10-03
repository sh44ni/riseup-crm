import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  MODE: z.string().default('development'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MODE: import.meta.env.MODE,
  DEV: Boolean(import.meta.env.DEV),
  PROD: Boolean(import.meta.env.PROD),
});
