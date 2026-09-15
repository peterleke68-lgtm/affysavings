import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getStaffByIdWithCredentials,
  updateStaffPassword,
  createAuditLog,
} from '@/lib/supabase-server';
import { hashPassword, validatePassword } from '@/lib/credentials';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = requireStaffRole(request, ['Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const { id: targetStaffId } = await params;

    if (!targetStaffId) {
      return NextResponse.json({ success: false, error: 'Staff ID is required.' }, { status: 400 });
    }

    const body = await request.json();
    const { password } = body as { password?: string };

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const targetStaff = await getStaffByIdWithCredentials(targetStaffId);
    if (!targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    const newHash = await hashPassword(password!);
    const updated = await updateStaffPassword(targetStaffId, newHash);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update staff password in database.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      'STAFF_PASSWORD_RESET_BY_ADMIN',
      { targetStaffId, targetEmail: targetStaff.email, role: targetStaff.role },
      { staff_id: session.userId }
    );

    return NextResponse.json({
      success: true,
      message: `Password for staff member ${targetStaff.email} has been successfully reset.`,
    });
  } catch (err: unknown) {
    console.error('[Staff API] POST /api/staff/[id]/password error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
