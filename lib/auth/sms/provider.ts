export interface SendSmsParams {
  phone: string;
  message: string;
  otp?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendSms(params: SendSmsParams): Promise<SendSmsResult>;
  sendOtp(phone: string, otp: string): Promise<SendSmsResult>;
}
