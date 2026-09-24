import { NextRequest } from 'next/server';
import {
  generateOtp,
  storeOtp,
  checkRateLimit,
  recordRateLimitHit,
  OtpType,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';
import { hashPassword, hashPin, validatePassword, validatePin } from '@/lib/credentials';

import { registerPendingUser } from '@/lib/supabase-server';

// In-memory store for pending registrations awaiting OTP verification (fast L1 cache)
export interface PendingRegistration {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  pinHash: string;
  createdAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

export function getPendingRegistration(email: string): PendingRegistration | null {
  const norm = email.toLowerCase().trim();
  const reg = pendingRegistrations.get(norm);
  if (!reg) return null;
  if (Date.now() - reg.createdAt > 15 * 60 * 1000) {
    pendingRegistrations.delete(norm);
    return null;
  }
  return reg;
}

export function clearPendingRegistration(email: string): void {
  pendingRegistrations.delete(email.toLowerCase().trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, name, phone, password, confirmPassword, pin, confirmPin } = body as {
      email?: string;
      type?: OtpType;
      name?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
      pin?: string;
      confirmPin?: string;
    };

    if (!email || typeof email !== 'string') {
      return Response.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    const validTypes: OtpType[] = ['signup', 'login', 'reset_password', 'change_password', 'change_pin'];
    if (!type || !validTypes.includes(type)) {
      return Response.json(
        { success: false, error: 'Invalid verification type.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return Response.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Additional validations if this is a signup initiation
    if (type === 'signup') {
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return Response.json(
          { success: false, error: 'Please enter your full name.' },
          { status: 400 }
        );
      }

      const passVal = validatePassword(password, confirmPassword);
      if (!passVal.valid) {
        return Response.json(
          { success: false, error: passVal.error },
          { status: 400 }
        );
      }

      const pinVal = validatePin(pin, confirmPin);
      if (!pinVal.valid) {
        return Response.json(
          { success: false, error: pinVal.error },
          { status: 400 }
        );
      }

      // Hash credentials on server BEFORE storing pending record
      const passwordHash = await hashPassword(password!);
      const pinHash = await hashPin(pin!);

      pendingRegistrations.set(normalizedEmail, {
        name: name.trim(),
        email: normalizedEmail,
        phone: (phone || '').trim(),
        passwordHash,
        pinHash,
        createdAt: Date.now(),
      });

      // Persist pending registration record to database (with is_verified: false)
      try {
        await registerPendingUser({
          email: normalizedEmail,
          name: name.trim(),
          phone: (phone || '').trim(),
          passwordHash,
          pinHash,
        });
      } catch (dbErr) {
        console.error('[send-otp] Failed to persist pending user to database:', dbErr);
        // Continue with memory cache and OTP dispatch
      }
    }

    // Rate limit check
    const isAllowed = await checkRateLimit(normalizedEmail);
    if (!isAllowed) {
      return Response.json(
        { success: false, error: 'Too many requests. Please wait a few minutes before requesting another code.' },
        { status: 429 }
      );
    }

    // Generate OTP and store it (hashed)
    const otp = generateOtp();
    await storeOtp(normalizedEmail, otp, type);
    await recordRateLimitHit(normalizedEmail);

    // Send via Resend
    const emailResult = await sendOtpEmail(normalizedEmail, otp, type);

    if (!emailResult.success) {
      console.error('[send-otp] Resend delivery failed:', emailResult.error);
      return Response.json(
        {
          success: false,
          error: "We couldn't deliver your verification code. Please try again.",
        },
        { status: 503 }
      );
    }

    return Response.json({
      success: true,
      emailDelivered: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: unknown) {
    console.error('[send-otp] Error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
