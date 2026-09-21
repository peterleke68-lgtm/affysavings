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
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: rawTransactions, error } = await query;

    if (error) {
      console.error('[Finance API] transactions error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch transactions.' }, { status: 500 });
    }

    const transactions = rawTransactions || [];

    // Collect all unique user IDs to attach user details
    const userIds = Array.from(new Set(transactions.map((t: any) => t.user_id).filter(Boolean)));
    
    let userMap: Record<string, { id: string; name: string; email: string; phone: string }> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .in('id', userIds);

      if (!uErr && usersData) {
        usersData.forEach((u: any) => {
          userMap[u.id] = u;
        });
      }
    }

    const enrichedTransactions = transactions.map((t: any) => {
      const userInfo = userMap[t.user_id] || {
        id: t.user_id,
        name: t.recipient_name || 'Customer',
        email: t.recipient_email || 'customer@affysavings.com',
        phone: '',
      };
      return {
        ...t,
        user: userInfo,
        users: userInfo, // For backwards compatibility
      };
    });

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
    });
  } catch (err: unknown) {
    console.error('[Finance API] error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
