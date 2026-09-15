import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Finance', 'Super Admin', 'Compliance', 'Customer Support', 'Operations']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    let query = supabase
      .from('transactions')
      .select('*, users:user_id(name, email, phone)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[Finance API] transactions error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch transactions.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
    });
  } catch (err: unknown) {
    console.error('[Finance API] error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
