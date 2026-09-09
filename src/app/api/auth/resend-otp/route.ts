import { NextRequest } from 'next/server';
import {
  generateOtp,
  storeOtp,
  invalidateOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('[resend-otp] POST /api/auth/resend-otp endpoint reached');
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

    // Rate limit check
    const isAllowed = await checkRateLimit(normalizedEmail);
    if (!isAllowed) {
      return Response.json(
        { success: false, error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Invalidate any existing OTP for this email
    await invalidateOtp(normalizedEmail);

    // Generate fresh OTP and store it
    const otp = generateOtp();
    await storeOtp(normalizedEmail, otp, type);
    await recordRateLimitHit(normalizedEmail);
    console.log('[resend-otp] Fresh OTP generated & stored. Sending email via Resend...');

    // Send via Resend (includes single retry for transient errors)
    const emailResult = await sendOtpEmail(normalizedEmail, otp, type);

    if (!emailResult.success) {
      // Email delivery failed — do NOT expose OTP or fall back to simulation
      console.error('[resend-otp] Email delivery failed:', emailResult.error);
      return Response.json(
        {
          success: false,
          error: "We couldn't send your verification code. Please try again.",
        },
        { status: 503 }
      );
    }

    console.log('[resend-otp] Email delivered successfully via Resend.');
    return Response.json({
      success: true,
      emailDelivered: true,
      message: 'A new verification code has been sent to your email.',
    });
  } catch (err: unknown) {
    console.error('[resend-otp] Unhandled exception:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
