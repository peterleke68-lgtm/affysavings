import { createHash, randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// -------------------------------------------------------------------
// Persistent Serverless OTP Storage (Supabase PostgreSQL Backed)
// -------------------------------------------------------------------

export interface OtpRecord {
  id?: string;
  otpHash: string;
  email: string;
  type: 'signup' | 'login';
  expiresAt: number;
  attempts: number;
  used: boolean;
  createdAt: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE__KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

// In-memory fallback map in case Supabase is temporarily unreachable
const inMemoryFallbackStore = new Map<string, OtpRecord>();

/** Hash an OTP string with SHA-256 */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/** Generate a cryptographically secure 6-digit OTP */
export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

/** Check rate limit for an email. Returns true if allowed, false if rate-limited. */
export async function checkRateLimit(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count, error } = await supabase
        .from('auth_otps')
        .select('*', { count: 'exact', head: true })
        .eq('email', normalizedEmail)
        .gte('created_at', windowStart);

      if (!error && count !== null) {
        return count < RATE_LIMIT_MAX_REQUESTS;
      }
    } catch (err) {
      console.warn('[otp-store] Rate limit check DB exception (permitting request):', err);
    }
  }

  return true;
}

/** Record an OTP request for rate limiting (no-op when DB tracking is active via insert) */
export async function recordRateLimitHit(_email: string): Promise<void> {
  // Implicitly recorded via row insertion in auth_otps
}

/** Store a new OTP record (invalidates any existing active OTP for this email) */
export async function storeOtp(
  email: string,
  otp: string,
  type: 'signup' | 'login'
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const hashed = hashOtp(otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // 1. Invalidate previous unused OTPs for this email
      await supabase
        .from('auth_otps')
        .update({ used: true })
        .eq('email', normalizedEmail)
        .eq('used', false);

      // 2. Insert fresh hashed OTP record
      const { error } = await supabase.from('auth_otps').insert({
        email: normalizedEmail,
        otp_hash: hashed,
        type,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        used: false,
        created_at: now.toISOString(),
      });

      if (!error) {
        return;
      }
      console.warn('[otp-store] Supabase insert failed, falling back to local memory:', error);
    } catch (err) {
      console.warn('[otp-store] Database error during storeOtp:', err);
    }
  }

  // Fallback to in-memory store if DB is unconfigured
  inMemoryFallbackStore.set(normalizedEmail, {
    otpHash: hashed,
    email: normalizedEmail,
    type,
    expiresAt: expiresAt.getTime(),
    attempts: 0,
    used: false,
    createdAt: now.getTime(),
  });
}

/** Retrieve active OTP record for an email */
export async function getOtpRecord(email: string): Promise<OtpRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('auth_otps')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const expiresAtMs = new Date(data.expires_at).getTime();
        if (Date.now() > expiresAtMs) {
          // Mark as used/expired
          await supabase.from('auth_otps').update({ used: true }).eq('id', data.id);
          return null;
        }

        return {
          id: data.id,
          otpHash: data.otp_hash,
          email: data.email,
          type: data.type,
          expiresAt: expiresAtMs,
          attempts: data.attempts,
          used: data.used,
          createdAt: new Date(data.created_at).getTime(),
        };
      }
    } catch (err) {
      console.warn('[otp-store] Database error during getOtpRecord:', err);
    }
  }

  // Fallback to in-memory
  const record = inMemoryFallbackStore.get(normalizedEmail);
  if (!record || record.used || Date.now() > record.expiresAt) {
    if (record) inMemoryFallbackStore.delete(normalizedEmail);
    return null;
  }
  return record;
}

/**
 * Verify an OTP against the stored record.
 * Returns { valid: true } on success, or { valid: false, reason: string } on failure.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  type: 'signup' | 'login'
): Promise<{ valid: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const record = await getOtpRecord(normalizedEmail);

  if (!record) {
    return { valid: false, reason: 'No active verification code found. Please request a new one.' };
  }

  if (record.type !== type) {
    return { valid: false, reason: 'Verification type mismatch. Please try again.' };
  }

  const supabase = getSupabaseClient();

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    if (supabase && record.id) {
      await supabase.from('auth_otps').update({ used: true }).eq('id', record.id);
    } else {
      inMemoryFallbackStore.delete(normalizedEmail);
    }
    return { valid: false, reason: 'Too many failed attempts. Please request a new verification code.' };
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash !== record.otpHash) {
    const updatedAttempts = record.attempts + 1;
    if (supabase && record.id) {
      await supabase
        .from('auth_otps')
        .update({
          attempts: updatedAttempts,
          used: updatedAttempts >= MAX_VERIFY_ATTEMPTS,
        })
        .eq('id', record.id);
    } else {
      record.attempts = updatedAttempts;
    }

    const remaining = MAX_VERIFY_ATTEMPTS - updatedAttempts;
    return {
      valid: false,
      reason: remaining > 0
        ? `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        : 'Too many failed attempts. Please request a new verification code.',
    };
  }

  // Success — mark as used
  if (supabase && record.id) {
    await supabase.from('auth_otps').update({ used: true }).eq('id', record.id);
  } else {
    record.used = true;
    inMemoryFallbackStore.delete(normalizedEmail);
  }

  return { valid: true };
}

/** Invalidate (delete/consume) any existing OTP for an email */
export async function invalidateOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase
        .from('auth_otps')
        .update({ used: true })
        .eq('email', normalizedEmail)
        .eq('used', false);
    } catch (err) {
      console.warn('[otp-store] Database error during invalidateOtp:', err);
    }
  }

  inMemoryFallbackStore.delete(normalizedEmail);
}

/** Clear all expired OTP records (maintenance utility) */
export async function clearExpired(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('auth_otps')
        .update({ used: true })
        .lt('expires_at', now)
        .eq('used', false);
    } catch (err) {
      console.warn('[otp-store] Database error during clearExpired:', err);
    }
  }
}

