import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp as verifyOtpStore } from '@/lib/otp-store';
import { findOrCreateUser, createAuditLog } from '@/lib/supabase-server';
import { createSessionToken, buildSessionCookieHeader } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, type, name, phone, deviceInfo } = body as {
      email?: string;
      otp?: string;
      type?: string;
      name?: string;
      phone?: string;
      deviceInfo?: any;
    };

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'A valid 6-digit verification code is required.' },
        { status: 400 }
      );
    }

    if (type !== 'signup' && type !== 'login' && type !== '2fa') {
      return NextResponse.json(
        { success: false, error: 'Invalid verification type.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP against server-side store
    const result = await verifyOtpStore(normalizedEmail, otp, type === '2fa' ? 'login' : type);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, verified: false, error: result.reason },
        { status: 401 }
      );
    }

    // Persist or retrieve user from database
    const user = await findOrCreateUser(normalizedEmail, {
      name,
      phone,
      deviceInfo,
    });

    // Record audit log
    await createAuditLog(
      user.id,
      type === 'signup' ? 'User Registration Verified' : 'User Login Verified',
      { email: normalizedEmail, type }
    );

    // Create secure signed session token
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      role: 'user',
    });

    // Build Set-Cookie header
    const cookieHeader = buildSessionCookieHeader(token);

    const response = NextResponse.json({
      success: true,
      verified: true,
      user,
      message: 'Verification successful.',
    });

    response.headers.set('Set-Cookie', cookieHeader);

    return response;
  } catch (err: unknown) {
    console.error('[Affy API] verify-otp error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
