import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp as verifyOtpStore, OtpType } from '@/lib/otp-store';
import {
  getUserByEmailWithCredentials,
  createVerifiedUser,
  createAuditLog,
  getUserByEmail,
} from '@/lib/supabase-server';
import { createSessionToken, buildSessionCookieHeader } from '@/lib/session';
import { getPendingRegistration, clearPendingRegistration } from '../send-otp/route';
import { sanitizeUser } from '@/lib/credentials';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, type, deviceInfo } = body as {
      email?: string;
      otp?: string;
      type?: OtpType;
      deviceInfo?: any;
    };

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { success: false, error: 'A valid 6-digit verification code is required.' },
        { status: 400 }
      );
    }

    const validTypes: OtpType[] = ['signup', 'login', 'reset_password', 'change_password', 'change_pin'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification type.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP against server-side store
    const result = await verifyOtpStore(normalizedEmail, otp.trim(), type);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, verified: false, error: result.reason },
        { status: 401 }
      );
    }

    // Handle signup activation
    if (type === 'signup') {
      const pendingReg = getPendingRegistration(normalizedEmail);
      
      // Check if user already exists in database if pendingReg cache was cleared
      let existingUserInDb = null;
      if (!pendingReg) {
        existingUserInDb = await getUserByEmailWithCredentials(normalizedEmail);
        if (!existingUserInDb) {
          return NextResponse.json(
            { success: false, error: 'Registration session expired. Please submit the signup form again.' },
            { status: 400 }
          );
        }
      }

      // Create or update verified user in database with password & PIN hashes
      const user = await createVerifiedUser({
        email: normalizedEmail,
        name: pendingReg?.name || existingUserInDb?.name,
        phone: pendingReg?.phone || existingUserInDb?.phone,
        passwordHash: pendingReg?.passwordHash || existingUserInDb?.password_hash || undefined,
        pinHash: pendingReg?.pinHash || existingUserInDb?.pin_hash || undefined,
        deviceInfo,
      });

      clearPendingRegistration(normalizedEmail);

      // Record audit log
      await createAuditLog(
        user.id,
        'User Registration Completed (OTP Verified)',
        { email: normalizedEmail }
      );

      // Create secure signed session token
      const token = createSessionToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      const safeUser = sanitizeUser(user);
      const cookieHeader = buildSessionCookieHeader(token);

      const response = NextResponse.json({
        success: true,
        verified: true,
        user: safeUser,
        message: 'Account verified and created successfully.',
      });

      response.headers.set('Set-Cookie', cookieHeader);
      return response;
    }

    // Handle generic OTP verification (e.g., for password reset or settings)
    const existingUser = await getUserByEmail(normalizedEmail);

    return NextResponse.json({
      success: true,
      verified: true,
      user: existingUser,
      message: 'Code verified successfully.',
    });
  } catch (err: unknown) {
    console.error('[Affy API] verify-otp error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
