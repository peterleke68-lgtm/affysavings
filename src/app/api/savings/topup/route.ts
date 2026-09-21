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
    const { planId, amount } = body as { planId?: string; amount?: number };

    if (!planId) {
      return NextResponse.json({ success: false, error: 'Savings plan ID is required.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than ₦0.00.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    const wallet = await ensureUserWallet(session.userId);
    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found.' }, { status: 404 });
    }

    const available = Number(wallet.wallet_balance);
    if (available < numAmount) {
      return NextResponse.json(
        { success: false, error: `Insufficient liquid wallet balance. Available: ₦${available.toLocaleString()}` },
        { status: 400 }
      );
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

    if (plan.status !== 'active') {
      return NextResponse.json({ success: false, error: `Cannot top up plan in '${plan.status}' status.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newSavedAmount = Number(plan.saved_amount) + numAmount;
    const isCompleted = newSavedAmount >= Number(plan.target_amount);

    // 1. Deduct wallet
    const { error: wErr } = await supabase
      .from('wallets')
      .update({
        wallet_balance: available - numAmount,
        updated_at: now,
      })
      .eq('id', wallet.id);

    if (wErr) {
      return NextResponse.json({ success: false, error: 'Failed to update wallet balance.' }, { status: 500 });
    }

    // 2. Update savings plan
    const { data: updatedPlan, error: upErr } = await supabase
      .from('savings_plans')
      .update({
        saved_amount: newSavedAmount,
        status: isCompleted ? 'completed' : plan.status,
      })
      .eq('id', plan.id)
      .select('*')
      .single();

    if (upErr || !updatedPlan) {
      // rollback wallet
      await supabase.from('wallets').update({ wallet_balance: available, updated_at: now }).eq('id', wallet.id);
      return NextResponse.json({ success: false, error: 'Failed to top up savings plan.' }, { status: 500 });
    }

    const ref = `SAV-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Record transaction
    await supabase.from('transactions').insert({
      id: generateUUID(),
      user_id: session.userId,
      wallet_id: wallet.id,
      type: 'savings_deposit',
      amount: numAmount,
      status: 'completed',
      reference: ref,
      category: 'savings',
      description: `Funded Savings Vault: "${plan.name}"`,
      created_at: now,
    });

    await createAuditLog(
      session.userId,
      'SAVINGS_PLAN_TOPUP',
      { planId: plan.id, planName: plan.name, amount: numAmount, newBalance: newSavedAmount }
    );

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: `Successfully added ₦${numAmount.toLocaleString()} to "${plan.name}".`,
    });
  } catch (err: unknown) {
    console.error('[Savings Topup API] error:', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
