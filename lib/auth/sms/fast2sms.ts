import { SmsProvider, SendSmsParams, SendSmsResult } from "./provider";

export class Fast2SmsProvider implements SmsProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || "";
    this.baseUrl = "https://www.fast2sms.com/dev/bulkV2";
  }

  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV !== "production") {
        return { success: true, messageId: `DEV-MOCK-${Date.now()}` };
      }
      return { success: false, error: "SMS service is not configured" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${this.baseUrl}?authorization=${encodeURIComponent(this.apiKey)}&route=q&message=${encodeURIComponent(params.message)}&language=english&flash=0&numbers=${encodeURIComponent(params.phone)}`,
        {
          method: "GET",
          headers: {
            "cache-control": "no-cache"
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: "SMS gateway request failed" };
      }

      const data = await response.json();
      if (data && data.return === true) {
        return {
          success: true,
          messageId: Array.isArray(data.request_id) ? data.request_id[0] : String(data.request_id || Date.now())
        };
      }

      return {
        success: false,
        error: data?.message || "Failed to send SMS"
      };
    } catch {
      return { success: false, error: "SMS service temporary network failure" };
    }
  }

  async sendOtp(phone: string, otp: string): Promise<SendSmsResult> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV !== "production") {
        return { success: true, messageId: `DEV-OTP-MOCK-${Date.now()}` };
      }
      return { success: false, error: "SMS service is not configured" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${this.baseUrl}?authorization=${encodeURIComponent(this.apiKey)}&variables_values=${encodeURIComponent(otp)}&route=otp&numbers=${encodeURIComponent(phone)}`,
        {
          method: "GET",
          headers: {
            "cache-control": "no-cache"
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: "SMS gateway request failed" };
      }

      const data = await response.json();
      if (data && data.return === true) {
        return {
          success: true,
          messageId: Array.isArray(data.request_id) ? data.request_id[0] : String(data.request_id || Date.now())
        };
      }

      return {
        success: false,
        error: data?.message || "Failed to send OTP SMS"
      };
    } catch {
      return { success: false, error: "SMS service network timeout" };
    }
  }
}

export const smsProvider: SmsProvider = new Fast2SmsProvider();
