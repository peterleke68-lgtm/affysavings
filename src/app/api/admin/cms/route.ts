import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import { getSupabaseAdminClient, createAuditLog } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    const { data: configRow } = await supabase
      .from('cms_settings')
      .select('*')
      .eq('key', 'config')
      .maybeSingle();

    return NextResponse.json({
      success: true,
      config: configRow?.value || null,
    });
  } catch (err: unknown) {
    console.error('[CMS API] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch CMS settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Super Admin', 'Content Manager']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('cms_settings')
      .upsert({
        key: 'config',
        value: body,
        updated_at: now,
      });

    if (error) {
      console.error('[CMS API] PUT error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update CMS settings.' }, { status: 500 });
    }

    await createAuditLog(
      session.userId,
      'CMS_CONFIG_UPDATED',
      { updatedBy: session.email, role: session.role }
    );

    return NextResponse.json({
      success: true,
      message: 'Website branding and configuration published successfully.',
    });
  } catch (err: unknown) {
    console.error('[CMS API] PUT exception:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
