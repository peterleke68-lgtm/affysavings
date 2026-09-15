import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import { getAllStaffProfiles } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const staffList = await getAllStaffProfiles();

    return NextResponse.json({
      success: true,
      staff: staffList,
    });
  } catch (err: unknown) {
    console.error('[Staff API] GET /api/staff error:', err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve staff profiles.' }, { status: 500 });
  }
}
