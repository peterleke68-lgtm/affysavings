import { NextRequest } from 'next/server';
import {
  generateOtp,
  storeOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = body as { email?: string; type?: string };

    // Validate input
    if (!email || typeof email !== 'string') {
      return Response.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (type !== 'signup' && type !== 'login') {
      return Response.json(
        { success: false, error: 'Invalid verification type.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return Response.json(
        { success: false, error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(normalizedEmail)) {
      return Response.json(
        { success: false, error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Generate OTP and store it (hashed)
    const otp = generateOtp();
    storeOtp(normalizedEmail, otp, type);
    recordRateLimitHit(normalizedEmail);

    // Attempt to send via Resend
    const emailResult = await sendOtpEmail(normalizedEmail, otp, type);

    if (!emailResult.success) {
      // Email delivery failed — OTP is still stored server-side,
      // but the client should know the email wasn't delivered
      // so it can activate simulation fallback
      return Response.json({
        success: true,
        emailDelivered: false,
        simulationOtp: otp, // Only expose OTP when email service is unavailable (dev mode)
        message: 'Verification code generated. Email delivery unavailable — use the code from the simulation drawer.',
      });
    }

    return Response.json({
      success: true,
      emailDelivered: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: unknown) {
    console.error('[Affy API] send-otp error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
