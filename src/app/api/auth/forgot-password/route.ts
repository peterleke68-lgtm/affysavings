import { NextRequest, NextResponse } from 'next/server';
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';
import {
  getUserByEmailWithCredentials,
  updateUserPassword,
  createAuditLog,
} from '@/lib/supabase-server';
import { hashPassword, validatePassword } from '@/lib/credentials';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp, newPassword, confirmPassword } = body as {
      action?: 'request_otp' | 'reset_password';
      email?: string;
      otp?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. STEP 1: REQUEST OTP FOR RESET
    if (action === 'request_otp') {
      const isAllowed = await checkRateLimit(normalizedEmail);
      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        );
      }

      const user = await getUserByEmailWithCredentials(normalizedEmail);
      if (user) {
        const resetOtp = generateOtp();
        await storeOtp(normalizedEmail, resetOtp, 'reset_password');
        await recordRateLimitHit(normalizedEmail);
        await sendOtpEmail(normalizedEmail, resetOtp, 'reset_password');
        await createAuditLog(user.id, 'Password Reset OTP Requested', { email: normalizedEmail });
      }

      // Return uniform success response to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password recovery code has been sent.',
      });
    }

    // 2. STEP 2: VERIFY OTP AND SET NEW PASSWORD
    if (action === 'reset_password') {
      if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
        return NextResponse.json(
          { success: false, error: 'A valid 6-digit verification code is required.' },
          { status: 400 }
        );
      }

      const passVal = validatePassword(newPassword, confirmPassword);
      if (!passVal.valid) {
        return NextResponse.json(
          { success: false, error: passVal.error },
          { status: 400 }
        );
      }

      const otpResult = await verifyOtp(normalizedEmail, otp.trim(), 'reset_password');
      if (!otpResult.valid) {
        return NextResponse.json(
          { success: false, error: otpResult.reason || 'Invalid or expired verification code.' },
          { status: 401 }
        );
      }

      const user = await getUserByEmailWithCredentials(normalizedEmail);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Account not found.' },
          { status: 404 }
        );
      }

      const newPasswordHash = await hashPassword(newPassword!);
      const updated = await updateUserPassword(user.id, newPasswordHash);

      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Failed to update password. Please try again.' },
          { status: 500 }
        );
      }

      await createAuditLog(user.id, 'Password Reset Completed (Scrypt Updated)', { email: normalizedEmail });

      return NextResponse.json({
        success: true,
        message: 'Your password has been successfully reset. You can now login.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action parameter.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('[Affy API] /api/auth/forgot-password error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
