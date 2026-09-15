import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getSupabaseAdminClient,
  createAuditLog,
  generateUUID,
} from '@/lib/supabase-server';
import { hashPassword, validatePassword } from '@/lib/credentials';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Only Super Admin can create staff accounts
    const authCheck = requireStaffRole(request, ['Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { email, name, role, password } = body as {
      email?: string;
      name?: string;
      role?: string;
      password?: string;
    };

    if (!email || !name || !role) {
      return NextResponse.json({ success: false, error: 'Name, email, and role are required.' }, { status: 400 });
    }

    const validRoles = ['Super Admin', 'Operations', 'Customer Support', 'Compliance', 'Finance', 'Content Manager'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid staff role assigned.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // Check if staff already exists
    const { data: existingStaff } = await supabase
      .from('staff_profiles')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json({ success: false, error: 'A staff profile with this email address already exists.' }, { status: 409 });
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

    let passwordHash: string | null = null;
    if (password) {
      const passValidation = validatePassword(password);
      if (!passValidation.valid) {
        return NextResponse.json({ success: false, error: passValidation.error }, { status: 400 });
      }
      passwordHash = await hashPassword(password);
    }

    const now = new Date();
    const newStaffId = generateUUID();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 1. Insert into staff_invitations
    const { data: invitation, error: invErr } = await supabase
      .from('staff_invitations')
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        role,
        permissions: perms,
        invited_by: session.userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        accepted: false,
        created_at: now.toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (invErr) {
      console.warn('[Staff Invite] Insert invitation table warning:', invErr.message);
    }

    // 2. Insert into staff_profiles (active)
    const { data: newProfile, error: profileErr } = await supabase
      .from('staff_profiles')
      .insert({
        id: newStaffId,
        email: normalizedEmail,
        name: name.trim(),
        role,
        permissions: perms,
        password_hash: passwordHash,
        is_active: true,
        created_at: now.toISOString(),
      })
      .select('id, email, name, role, permissions, is_active, created_at')
      .single();

    if (profileErr) {
      console.error('[Staff Invite] staff_profiles insert error:', profileErr);
      return NextResponse.json({ success: false, error: 'Failed to create staff profile.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      'STAFF_CREATED',
      { targetStaffId: newStaffId, targetEmail: normalizedEmail, assignedRole: role },
      { staff_id: session.userId }
    );

    return NextResponse.json({
      success: true,
      message: `Staff member ${normalizedEmail} successfully registered.`,
      staff: newProfile,
      invitation,
    });
  } catch (err: unknown) {
    console.error('[Staff API] /api/staff/invite error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
