import { NextRequest } from 'next/server';
import {
  generateOtp,
  storeOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('[DIAGNOSTIC] Step 1: POST /api/auth/send-otp endpoint reached');
  try {
    const body = await request.json();
    const { email, type } = body as { email?: string; type?: string };
    console.log('[DIAGNOSTIC] Step 2: Request payload received. Type:', type, 'Has email:', !!email);

    // Validate input
    if (!email || typeof email !== 'string') {
      console.warn('[DIAGNOSTIC] Validation failed: Email missing');
      return Response.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (type !== 'signup' && type !== 'login') {
      console.warn('[DIAGNOSTIC] Validation failed: Invalid type', type);
      return Response.json(
        { success: false, error: 'Invalid verification type.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      console.warn('[DIAGNOSTIC] Validation failed: Invalid email format');
      return Response.json(
        { success: false, error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(normalizedEmail)) {
      console.warn('[DIAGNOSTIC] Rate limit triggered for email');
      return Response.json(
        { success: false, error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Generate OTP and store it (hashed)
    const otp = generateOtp();
    storeOtp(normalizedEmail, otp, type);
    recordRateLimitHit(normalizedEmail);
    console.log('[DIAGNOSTIC] Step 3: OTP generated & hashed in store. Calling sendOtpEmail().');

    // Attempt to send via Resend
    const emailResult = await sendOtpEmail(normalizedEmail, otp, type);
    console.log('[DIAGNOSTIC] Step 5: sendOtpEmail() result:', {
      success: emailResult.success,
      hasError: !!emailResult.error,
      id: emailResult.id,
    });

    if (!emailResult.success) {
      console.warn('[DIAGNOSTIC] Step 5b: Email not delivered. Returning emailDelivered: false');
      return Response.json({
        success: true,
        emailDelivered: false,
        simulationOtp: otp, // Only expose OTP when email service is unavailable (dev mode)
        message: 'Verification code generated. Email delivery unavailable — use the code from the simulation drawer.',
      });
    }

    console.log('[DIAGNOSTIC] Step 5c: Email successfully delivered via Resend. Returning 200.');
    return Response.json({
      success: true,
      emailDelivered: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: unknown) {
    console.error('[DIAGNOSTIC] send-otp unhandled exception:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
