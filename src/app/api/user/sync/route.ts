import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import {
  getSupabaseAdminClient,
  getUserById,
  ensureUserWallet,
} from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // 1. Fetch sanitized user profile
    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // 2. Ensure and fetch wallet
    const wallet = await ensureUserWallet(session.userId);

    // 3. Fetch user's transactions from Supabase
    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (txErr) {
      console.warn('[User Sync] Fetch transactions warning:', txErr.message);
    }

    // 4. Fetch user's savings plans from Supabase
    const { data: savingsPlans, error: spErr } = await supabase
      .from('savings_plans')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (spErr) {
      console.warn('[User Sync] Fetch savings plans warning:', spErr.message);
    }

    // 5. Fetch linked accounts
    const { data: linkedAccounts, error: laErr } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (laErr) {
      console.warn('[User Sync] Fetch linked accounts warning:', laErr.message);
    }

    // 6. Fetch in-app notifications
    const { data: notifications, error: notifErr } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${session.userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifErr) {
      console.warn('[User Sync] Fetch notifications warning:', notifErr.message);
    }

    return NextResponse.json({
      success: true,
      user,
      wallet: wallet || {
        id: '',
        user_id: session.userId,
        balance: 0,
        wallet_balance: 0,
        reserved_balance: 0,
        currency: 'NGN',
      },
      transactions: transactions || [],
      savingsPlans: savingsPlans || [],
      linkedAccounts: linkedAccounts || [],
      notifications: notifications || [],
    });
  } catch (err: unknown) {
    console.error('[User Sync API] GET exception:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize account data.' },
      { status: 500 }
    );
  }
}
