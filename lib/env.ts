import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().default("zafiro-default-session-secret-key-2026"),
  
  // Shiprocket Logistics Credentials
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_API_KEY: z.string().optional(),
  SHIPROCKET_SECRET_KEY: z.string().optional(),

  // Shiprocket Fastrr / Headless Checkout Credentials
  SHIPROCKET_CHECKOUT_APP_ID: z.string().optional(),
  SHIPROCKET_CHECKOUT_API_KEY: z.string().optional(),
  SHIPROCKET_CHECKOUT_API_SECRET: z.string().optional(),
  SHIPROCKET_CHECKOUT_WEBHOOK_SECRET: z.string().optional(),
  SHIPROCKET_CHECKOUT_BASE_URL: z.string().default("https://fastrr-api.shiprocket.in"),

  // SMS & Rate Limiting
  FAST2SMS_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration. Application startup aborted in production.");
    }
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/zafiro"
    });
  }
  return result.data;
}

export const env = validateEnv();
