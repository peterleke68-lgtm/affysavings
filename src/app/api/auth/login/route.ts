import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByEmailWithCredentials,
  getStaffByEmailWithCredentials,
  updateUserLockStatus,
  createAuditLog,
} from '@/lib/supabase-server';
import { verifyPassword, sanitizeUser } from '@/lib/credentials';
import { createSessionToken, buildSessionCookieHeader, UserRole } from '@/lib/session';

const MAX_FAILED_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter your email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user is a Staff Profile
    const staffUser = await getStaffByEmailWithCredentials(normalizedEmail);
    if (staffUser) {
      if (!staffUser.is_active) {
        return NextResponse.json(
          { success: false, error: 'This staff account has been deactivated by administration.' },
          { status: 403 }
        );
      }

      let passwordValid = false;
      if (staffUser.password_hash) {
        passwordValid = await verifyPassword(password, staffUser.password_hash);
      } else {
        // Fallback for initial unmigrated default seeds
        passwordValid = password === 'password123';
      }

      if (!passwordValid) {
        await createAuditLog(staffUser.id, 'Failed Staff Login Attempt', { email: normalizedEmail });
        return NextResponse.json(
          { success: false, error: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      await createAuditLog(staffUser.id, 'Staff Login Successful', { email: normalizedEmail, role: staffUser.role });

      const token = createSessionToken({
        id: staffUser.id,
        email: staffUser.email,
        role: staffUser.role as UserRole,
      });

      const response = NextResponse.json({
        success: true,
        userType: 'staff',
        role: staffUser.role,
        user: {
          id: staffUser.id,
          email: staffUser.email,
          name: staffUser.name,
          role: staffUser.role,
          permissions: staffUser.permissions,
        },
        message: 'Staff authentication successful.',
      });

      response.headers.set('Set-Cookie', buildSessionCookieHeader(token));
      return response;
    }

    // 2. Customer Profile Authentication
    const customer = await getUserByEmailWithCredentials(normalizedEmail);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (customer.is_locked) {
      await createAuditLog(customer.id, 'Blocked Login Attempt (Account Locked)', { email: normalizedEmail });
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          error: 'Your account is locked due to multiple failed login attempts. Please contact Compliance support.',
        },
        { status: 403 }
      );
    }

    // Verify password hash
    let isPasswordValid = false;
    if (customer.password_hash) {
      isPasswordValid = await verifyPassword(password, customer.password_hash);
    } else {
      // Legacy unmigrated user check fallback
      isPasswordValid = password === 'password123';
    }

    if (!isPasswordValid) {
      const newAttempts = (customer.failed_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

      await updateUserLockStatus(customer.id, shouldLock, newAttempts);

      await createAuditLog(
        customer.id,
        shouldLock ? 'User Account Locked (Max Failed Logins Exceeded)' : 'Failed Login Attempt',
        { email: normalizedEmail, failedAttempts: newAttempts }
      );

      if (shouldLock) {
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            error: 'Account locked due to 5 failed login attempts. Contact Compliance to restore access.',
          },
          { status: 403 }
        );
      }

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      return NextResponse.json(
        {
          success: false,
          error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`,
        },
        { status: 401 }
      );
    }

    // Successful login: reset failed attempts
    if (customer.failed_attempts > 0) {
      await updateUserLockStatus(customer.id, false, 0);
    }

    await createAuditLog(customer.id, 'User Login Successful (Password Auth)', { email: normalizedEmail });

    const token = createSessionToken({
      id: customer.id,
      email: customer.email,
      role: 'user',
    });

    const safeUser = sanitizeUser(customer);
    const response = NextResponse.json({
      success: true,
      userType: 'customer',
      role: 'user',
      user: safeUser,
      message: 'Login successful.',
    });

    response.headers.set('Set-Cookie', buildSessionCookieHeader(token));
    return response;
  } catch (err: unknown) {
    console.error('[Affy API] /api/auth/login error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
