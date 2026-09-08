import { NextRequest } from 'next/server';
import { verifyOtp as verifyOtpStore } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, type } = body as { email?: string; otp?: string; type?: string };

    // Validate input
    if (!email || typeof email !== 'string') {
      return Response.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return Response.json(
        { success: false, error: 'A valid 6-digit verification code is required.' },
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

    // Verify OTP against server-side store
    const result = verifyOtpStore(normalizedEmail, otp, type);

    if (!result.valid) {
      return Response.json(
        { success: false, verified: false, error: result.reason },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      verified: true,
      message: 'Email verified successfully.',
    });
  } catch (err: unknown) {
    console.error('[Affy API] verify-otp error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
