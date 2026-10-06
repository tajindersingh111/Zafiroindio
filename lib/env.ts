import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  
  // Shiprocket Logistics Credentials
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_API_KEY: z.string().optional(),
  SHIPROCKET_SECRET_KEY: z.string().optional(),

  // Shiprocket Fastrr / Headless Checkout Credentials
  NEXT_PUBLIC_SHIPROCKET_APP_ID: z.string().optional(),
  SHIPROCKET_CHECKOUT_APP_ID: z.string().optional(),
  SHIPROCKET_CHECKOUT_API_KEY: z.string().optional(),
  SHIPROCKET_CHECKOUT_API_SECRET: z.string().optional(),
  SHIPROCKET_CHECKOUT_WEBHOOK_SECRET: z.string().optional(),
  SHIPROCKET_CHECKOUT_BASE_URL: z.string().default("https://fastrr-api.shiprocket.in"),

  SHIPROCKET_CHECKOUT_TOKEN_PATH: z.string().optional(),
  SHIPROCKET_TRACKING_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  FAST2SMS_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("⚠️ Environment variables warning:", result.error.format());
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/zafiro"
    });
  }
  return result.data;
}

export const env = validateEnv();
