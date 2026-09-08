import { createHash, randomInt } from 'crypto';

// -------------------------------------------------------------------
// Server-side OTP storage (in-memory, per-process)
// -------------------------------------------------------------------

export interface OtpRecord {
  otpHash: string;
  email: string;
  type: 'signup' | 'login';
  expiresAt: number;
  attempts: number;
  used: boolean;
  createdAt: number;
}

// Rate-limit tracking: email -> array of timestamps
const rateLimitMap = new Map<string, number[]>();

// OTP storage: email (lowercase) -> OtpRecord
const otpStore = new Map<string, OtpRecord>();

// Cleanup interval — remove expired records every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 3;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    clearExpired();
  }, CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/** Hash an OTP string with SHA-256 */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/** Generate a cryptographically secure 6-digit OTP */
export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

/** Check rate limit for an email. Returns true if allowed, false if rate-limited. */
export function checkRateLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Filter to only timestamps within the window
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(key, recentTimestamps);

  return recentTimestamps.length < RATE_LIMIT_MAX_REQUESTS;
}

/** Record an OTP request for rate limiting */
export function recordRateLimitHit(email: string): void {
  const key = email.toLowerCase();
  const timestamps = rateLimitMap.get(key) || [];
  timestamps.push(Date.now());
  rateLimitMap.set(key, timestamps);
}

/** Store a new OTP record (invalidates any existing OTP for this email) */
export function storeOtp(email: string, otp: string, type: 'signup' | 'login'): void {
  ensureCleanupTimer();
  const key = email.toLowerCase();

  otpStore.set(key, {
    otpHash: hashOtp(otp),
    email: key,
    type,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    used: false,
    createdAt: Date.now(),
  });
}

/** Retrieve OTP record for an email (returns null if not found or expired) */
export function getOtpRecord(email: string): OtpRecord | null {
  const key = email.toLowerCase();
  const record = otpStore.get(key);

  if (!record) return null;
  if (record.used) return null;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return null;
  }

  return record;
}

/**
 * Verify an OTP against the stored record.
 * Returns { valid: true } on success, or { valid: false, reason: string } on failure.
 */
export function verifyOtp(
  email: string,
  otp: string,
  type: 'signup' | 'login'
): { valid: boolean; reason?: string } {
  const record = getOtpRecord(email);

  if (!record) {
    return { valid: false, reason: 'No active verification code found. Please request a new one.' };
  }

  if (record.type !== type) {
    return { valid: false, reason: 'Verification type mismatch. Please try again.' };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'Too many failed attempts. Please request a new verification code.' };
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    return {
      valid: false,
      reason: remaining > 0
        ? `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        : 'Too many failed attempts. Please request a new verification code.'
    };
  }

  // Success — mark as used
  record.used = true;
  return { valid: true };
}

/** Invalidate (delete) any existing OTP for an email */
export function invalidateOtp(email: string): void {
  otpStore.delete(email.toLowerCase());
}

/** Clear all expired OTP records and stale rate limit entries */
export function clearExpired(): void {
  const now = Date.now();

  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt || record.used) {
      otpStore.delete(key);
    }
  }

  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recent);
    }
  }
}
