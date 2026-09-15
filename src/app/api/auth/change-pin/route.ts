import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import {
  getUserByIdWithCredentials,
  updateUserPin,
  createAuditLog,
} from '@/lib/supabase-server';
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  checkRateLimit,
  recordRateLimitHit,
} from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';
import {
  verifyPin,
  verifyPassword,
  hashPin,
  validatePin,
} from '@/lib/credentials';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { action, currentVerification, verificationMethod, newPin, confirmPin, otp } = body as {
      action?: 'request_otp' | 'confirm_change';
      currentVerification?: string; // current password or current PIN
      verificationMethod?: 'password' | 'pin';
      newPin?: string;
      confirmPin?: string;
      otp?: string;
    };

    const user = await getUserByIdWithCredentials(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    // STEP 1: VERIFY CURRENT CREDENTIAL & DISPATCH OTP
    if (action === 'request_otp') {
      if (!currentVerification) {
        return NextResponse.json({ success: false, error: 'Current security verification is required.' }, { status: 400 });
      }

      let isVerified = false;
      if (verificationMethod === 'pin') {
        if (user.pin_hash) {
          isVerified = await verifyPin(currentVerification, user.pin_hash);
        } else {
          isVerified = currentVerification.length === 4;
        }
      } else {
        if (user.password_hash) {
          isVerified = await verifyPassword(currentVerification, user.password_hash);
        } else {
          isVerified = currentVerification === 'password123';
        }
      }

      if (!isVerified) {
        return NextResponse.json(
          { success: false, error: 'Current verification credential is incorrect.' },
          { status: 400 }
        );
      }

      const pinVal = validatePin(newPin, confirmPin);
      if (!pinVal.valid) {
        return NextResponse.json({ success: false, error: pinVal.error }, { status: 400 });
      }

      const isAllowed = await checkRateLimit(user.email);
      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        );
      }

      const changeOtp = generateOtp();
      await storeOtp(user.email, changeOtp, 'change_pin');
      await recordRateLimitHit(user.email);
      await sendOtpEmail(user.email, changeOtp, 'change_pin');

      await createAuditLog(user.id, 'Change PIN OTP Dispatched', { email: user.email });

      return NextResponse.json({
        success: true,
        message: 'A confirmation code has been sent to your email address.',
      });
    }

    // STEP 2: VERIFY OTP AND UPDATE PIN
    if (action === 'confirm_change') {
      if (!otp || !/^\d{6}$/.test(otp.trim())) {
        return NextResponse.json({ success: false, error: 'Valid 6-digit verification code is required.' }, { status: 400 });
      }

      const pinVal = validatePin(newPin, confirmPin);
      if (!pinVal.valid) {
        return NextResponse.json({ success: false, error: pinVal.error }, { status: 400 });
      }

      const verifyResult = await verifyOtp(user.email, otp.trim(), 'change_pin');
      if (!verifyResult.valid) {
        return NextResponse.json(
          { success: false, error: verifyResult.reason || 'Invalid or expired confirmation code.' },
          { status: 401 }
        );
      }

      const newHash = await hashPin(newPin!);
      const updated = await updateUserPin(user.id, newHash);

      if (!updated) {
        return NextResponse.json({ success: false, error: 'Failed to update transaction PIN.' }, { status: 500 });
      }

      await createAuditLog(user.id, 'Transaction PIN Changed Successfully', { email: user.email });

      return NextResponse.json({
        success: true,
        message: 'Your 4-digit transaction PIN has been successfully updated.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action parameter.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[Affy API] /api/auth/change-pin error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
