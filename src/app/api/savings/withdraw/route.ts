import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import {
  getSupabaseAdminClient,
  ensureUserWallet,
  createAuditLog,
  generateUUID,
} from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { planId } = body as { planId?: string };

    if (!planId) {
      return NextResponse.json({ success: false, error: 'Savings plan ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    const wallet = await ensureUserWallet(session.userId);
    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found.' }, { status: 404 });
    }

    // Fetch plan
    const { data: plan, error: pErr } = await supabase
      .from('savings_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', session.userId)
      .single();

    if (pErr || !plan) {
      return NextResponse.json({ success: false, error: 'Savings plan not found.' }, { status: 404 });
    }

    const amount = Number(plan.saved_amount);
    if (amount <= 0) {
      return NextResponse.json({ success: false, error: 'No funds available in this plan to withdraw.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Credit wallet
    const { error: wErr } = await supabase
      .from('wallets')
      .update({
        wallet_balance: Number(wallet.wallet_balance) + amount,
        updated_at: now,
      })
      .eq('id', wallet.id);

    if (wErr) {
      return NextResponse.json({ success: false, error: 'Failed to credit wallet balance.' }, { status: 500 });
    }

    // 2. Mark plan completed / 0 balance
    await supabase
      .from('savings_plans')
      .update({
        saved_amount: 0,
        status: 'completed',
      })
      .eq('id', plan.id);

    const ref = `SAV-WTH-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Insert transaction
    await supabase.from('transactions').insert({
      id: generateUUID(),
      user_id: session.userId,
      wallet_id: wallet.id,
      type: 'savings_withdrawal',
      amount,
      status: 'completed',
      reference: ref,
      category: 'savings',
      description: `Withdrawn matured vault: "${plan.name}"`,
      created_at: now,
    });

    await createAuditLog(
      session.userId,
      'SAVINGS_PLAN_WITHDRAWAL',
      { planId: plan.id, planName: plan.name, amount }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ₦${amount.toLocaleString()} from "${plan.name}" back to your wallet.`,
    });
  } catch (err: unknown) {
    console.error('[Savings Withdraw API] error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
