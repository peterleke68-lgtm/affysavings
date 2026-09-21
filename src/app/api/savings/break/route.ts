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
    const { planId, penaltyPercent } = body as { planId?: string; penaltyPercent?: number };

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

    const { data: plan, error: pErr } = await supabase
      .from('savings_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', session.userId)
      .single();

    if (pErr || !plan) {
      return NextResponse.json({ success: false, error: 'Savings plan not found.' }, { status: 404 });
    }

    const saved = Number(plan.saved_amount);
    if (saved <= 0) {
      return NextResponse.json({ success: false, error: 'No funds to break.' }, { status: 400 });
    }

    const feePct = penaltyPercent !== undefined ? penaltyPercent : (plan.type === 'locked' ? 2.5 : 0);
    const penaltyFee = (saved * feePct) / 100;
    const netReturn = saved - penaltyFee;

    const now = new Date().toISOString();

    // 1. Credit net return to wallet
    await supabase
      .from('wallets')
      .update({
        wallet_balance: Number(wallet.wallet_balance) + netReturn,
        updated_at: now,
      })
      .eq('id', wallet.id);

    // 2. Mark plan broken
    await supabase
      .from('savings_plans')
      .update({
        saved_amount: 0,
        status: 'broken',
      })
      .eq('id', plan.id);

    // 3. Record penalty fee if > 0
    if (penaltyFee > 0) {
      await supabase.from('transactions').insert({
        id: generateUUID(),
        user_id: session.userId,
        wallet_id: wallet.id,
        type: 'penalty_fee',
        amount: penaltyFee,
        status: 'completed',
        reference: `FEE-${Math.floor(100000 + Math.random() * 900000)}`,
        category: 'penalty',
        description: `Early Lock Liquid Penalty (${feePct}%) on "${plan.name}"`,
        created_at: now,
      });
    }

    // 4. Record savings withdrawal
    await supabase.from('transactions').insert({
      id: generateUUID(),
      user_id: session.userId,
      wallet_id: wallet.id,
      type: 'savings_withdrawal',
      amount: netReturn,
      status: 'completed',
      reference: `SAV-BRK-${Math.floor(100000 + Math.random() * 900000)}`,
      category: 'savings',
      description: `Early Liquidation Return on "${plan.name}"`,
      created_at: now,
    });

    await createAuditLog(
      session.userId,
      'SAVINGS_PLAN_BROKEN_EARLY',
      { planId: plan.id, planName: plan.name, savedAmount: saved, penaltyFee, netReturn }
    );

    return NextResponse.json({
      success: true,
      message: `Plan liquidated early. Net ₦${netReturn.toLocaleString()} credited back to your wallet (Fee: ₦${penaltyFee.toLocaleString()}).`,
    });
  } catch (err: unknown) {
    console.error('[Savings Break API] error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
