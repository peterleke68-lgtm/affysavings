import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getStaffByIdWithCredentials,
  updateStaffPassword,
  createAuditLog,
} from '@/lib/supabase-server';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/credentials';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, [
      'Super Admin',
      'Operations',
      'Customer Support',
      'Compliance',
      'Finance',
      'Content Manager',
    ]);

    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is required.' }, { status: 400 });
    }

    const validation = validatePassword(newPassword, confirmPassword);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const staffProfile = await getStaffByIdWithCredentials(session.userId);
    if (!staffProfile) {
      return NextResponse.json({ success: false, error: 'Staff profile not found.' }, { status: 404 });
    }

    // Verify current password
    let isCurrentValid = false;
    if (staffProfile.password_hash) {
      isCurrentValid = await verifyPassword(currentPassword, staffProfile.password_hash);
    } else {
      isCurrentValid = currentPassword === 'password123';
    }

    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: 'Incorrect current password.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword!);
    const updated = await updateStaffPassword(session.userId, newHash);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update password in database.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      'STAFF_PASSWORD_CHANGED_SELF',
      { staffId: session.userId, email: staffProfile.email, role: staffProfile.role },
      { staff_id: session.userId }
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: unknown) {
    console.error('[Staff API] POST /api/staff/change-password error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
