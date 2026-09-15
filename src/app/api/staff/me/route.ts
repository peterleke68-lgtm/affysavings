import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ authenticated: false, staff: null }, { status: 200 });
    }

    const { session } = authCheck;
    if (session.role === 'user') {
      return NextResponse.json({ authenticated: false, staff: null }, { status: 200 });
    }

    const supabase = getSupabaseAdminClient();
    let staffData: any = null;

    if (supabase) {
      const { data } = await supabase
        .from('staff_profiles')
        .select('id, email, name, role, permissions, is_active, created_at')
        .eq('id', session.userId)
        .maybeSingle();

      if (data) {
        staffData = data;
      }
    }

    if (!staffData) {
      // Fallback session representation
      staffData = {
        id: session.userId,
        email: session.email,
        name: session.email.split('@')[0],
        role: session.role,
        permissions: session.role === 'Super Admin' ? ['all'] : [],
        is_active: true,
      };
    }

    return NextResponse.json({
      authenticated: true,
      staff: staffData,
    });
  } catch (err: unknown) {
    console.error('[Staff API] /api/staff/me error:', err);
    return NextResponse.json({ authenticated: false, staff: null }, { status: 500 });
  }
}
