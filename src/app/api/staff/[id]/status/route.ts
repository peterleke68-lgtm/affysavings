import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getStaffByIdWithCredentials,
  updateStaffStatus,
  countActiveSuperAdmins,
  createAuditLog,
} from '@/lib/supabase-server';

export async function PATCH(
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
    const { is_active } = body as { is_active?: boolean };

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Valid is_active boolean is required.' }, { status: 400 });
    }

    const targetStaff = await getStaffByIdWithCredentials(targetStaffId);
    if (!targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    // Critical protection: Cannot deactivate the last active Super Admin
    if (!is_active && targetStaff.role === 'Super Admin' && targetStaff.is_active) {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Operation rejected: Cannot deactivate the final active Super Admin.' },
          { status: 400 }
        );
      }
    }

    const updated = await updateStaffStatus(targetStaffId, is_active);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update staff status.' }, { status: 500 });
    }

    const action = is_active ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED';
    await createAuditLog(
      session.userId,
      action,
      { targetStaffId, targetEmail: targetStaff.email, role: targetStaff.role, is_active },
      { staff_id: session.userId }
    );

    return NextResponse.json({
      success: true,
      message: `Staff account ${is_active ? 'activated' : 'deactivated'} successfully.`,
      is_active,
    });
  } catch (err: unknown) {
    console.error('[Staff API] PATCH /api/staff/[id]/status error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
