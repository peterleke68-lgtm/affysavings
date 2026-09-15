import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getSupabaseAdminClient,
  updateUserLockStatus,
  createAuditLog,
} from '@/lib/supabase-server';
import { sanitizeUser } from '@/lib/credentials';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Super Admin', 'Operations', 'Compliance', 'Customer Support', 'Finance']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.toLowerCase().trim();

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    let query = supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, is_verified, is_locked, failed_attempts, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('[Admin Users API] Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch user directory.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (err: unknown) {
    console.error('[Admin Users API] Error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Super Admin', 'Compliance', 'Operations']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { userId, isLocked } = body as { userId?: string; isLocked?: boolean };

    if (!userId || typeof isLocked !== 'boolean') {
      return NextResponse.json({ success: false, error: 'User ID and lock state boolean are required.' }, { status: 400 });
    }

    const updated = await updateUserLockStatus(userId, isLocked, isLocked ? 3 : 0);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update user lock status.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      isLocked ? 'CUSTOMER_ACCOUNT_LOCKED' : 'CUSTOMER_ACCOUNT_UNLOCKED',
      { targetUserId: userId, performedBy: session.email, role: session.role }
    );

    return NextResponse.json({
      success: true,
      message: `Account has been ${isLocked ? 'locked' : 'unlocked'} successfully.`,
    });
  } catch (err: unknown) {
    console.error('[Admin Users API] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
