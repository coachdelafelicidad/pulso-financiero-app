import { createHash, randomInt } from "crypto";

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOtp(email: string, otp: string): string {
  const pepper =
    process.env.PASSWORD_RESET_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "pulso-emergency-reset";
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${otp.trim()}:${pepper}`)
    .digest("hex");
}

export const OTP_TTL_MINUTES = 15;
