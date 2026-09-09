import { NextRequest } from 'next/server';
import {
  generateOtp,
  storeOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('[send-otp] POST /api/auth/send-otp endpoint reached');
  try {
    const body = await request.json();
    const { email, type } = body as { email?: string; type?: string };
    console.log('[send-otp] Request received. Type:', type, 'Has email:', !!email);

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
    const isAllowed = await checkRateLimit(normalizedEmail);
    if (!isAllowed) {
      return Response.json(
        { success: false, error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Generate OTP and store it (hashed)
    const otp = generateOtp();
    await storeOtp(normalizedEmail, otp, type);
    await recordRateLimitHit(normalizedEmail);
    console.log('[send-otp] OTP generated & stored. Sending email via Resend...');

    // Send via Resend (includes single retry for transient errors)
    const emailResult = await sendOtpEmail(normalizedEmail, otp, type);

    if (!emailResult.success) {
      // Email delivery failed — do NOT expose OTP or fall back to simulation
      console.error('[send-otp] Email delivery failed:', emailResult.error);
      return Response.json(
        {
          success: false,
          error: "We couldn't send your verification code. Please try again.",
        },
        { status: 503 }
      );
    }

    console.log('[send-otp] Email delivered successfully via Resend.');
    return Response.json({
      success: true,
      emailDelivered: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err: unknown) {
    console.error('[send-otp] Unhandled exception:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
