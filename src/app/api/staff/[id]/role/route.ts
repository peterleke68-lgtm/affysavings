import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getStaffByIdWithCredentials,
  updateStaffRoleAndPermissions,
  countActiveSuperAdmins,
  createAuditLog,
  DbStaffProfile,
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
    const { role } = body as { role?: DbStaffProfile['role'] };

    const validRoles: DbStaffProfile['role'][] = [
      'Super Admin',
      'Operations',
      'Customer Support',
      'Compliance',
      'Finance',
      'Content Manager',
    ];

    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}.` },
        { status: 400 }
      );
    }

    const targetStaff = await getStaffByIdWithCredentials(targetStaffId);
    if (!targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    // Critical protection: Cannot demote the last active Super Admin
    if (targetStaff.role === 'Super Admin' && role !== 'Super Admin' && targetStaff.is_active) {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Operation rejected: Cannot change the role of the final active Super Admin.' },
          { status: 400 }
        );
      }
    }

    let perms: string[] = [];
    switch (role) {
      case 'Super Admin': perms = ['all']; break;
      case 'Operations': perms = ['manage_users', 'approve_accounts']; break;
      case 'Customer Support': perms = ['view_users', 'view_transactions']; break;
      case 'Compliance': perms = ['review_transactions', 'view_audit_logs', 'unlock_users']; break;
      case 'Finance': perms = ['approve_transactions', 'view_metrics']; break;
      case 'Content Manager': perms = ['manage_cms']; break;
    }

    const updated = await updateStaffRoleAndPermissions(targetStaffId, role, perms);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update staff role in database.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      'STAFF_ROLE_CHANGED',
      {
        targetStaffId,
        targetEmail: targetStaff.email,
        oldRole: targetStaff.role,
        newRole: role,
        assignedPermissions: perms,
      },
      { staff_id: session.userId }
    );

    return NextResponse.json({
      success: true,
      message: `Staff role updated to ${role}.`,
      role,
      permissions: perms,
    });
  } catch (err: unknown) {
    console.error('[Staff API] PATCH /api/staff/[id]/role error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
