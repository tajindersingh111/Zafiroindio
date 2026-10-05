import { readSettings } from "@/lib/db/store";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export interface ShiprocketAuthConfig {
  apiKey?: string;
  apiSecret?: string;
  email?: string;
  password?: string;
}

export async function getShiprocketToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  const settings = (readSettings<any>("settings") || {}) as any;
  const apiKey = process.env.SHIPROCKET_API_KEY || settings.shiprocket_api_key || settings.shiprocketAppId;
  const apiSecret = process.env.SHIPROCKET_SECRET_KEY || settings.shiprocket_secret_key;
  const email = process.env.SHIPROCKET_EMAIL || settings.shiprocketEmail;
  const password = process.env.SHIPROCKET_PASSWORD || settings.shiprocketPassword;

  if (!email || (!password && !apiSecret)) {
    return apiKey || null;
  }

  try {
    const payload = password
      ? { email, password }
      : { email, password: apiSecret };

    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        cachedToken = data.token;
        tokenExpiry = now + 9 * 24 * 60 * 60 * 1000; // 9 days cache
        return cachedToken;
      }
    }
  } catch (err) {
    console.warn("Shiprocket auth token request failed:", err);
  }

  return apiKey || null;
}
