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
    const { type, name, amount, targetAmount, durationDays } = body as {
      type?: 'locked' | 'fixed' | 'target' | 'food';
      name?: string;
      amount?: number;
      targetAmount?: number;
      durationDays?: number;
    };

    if (!type || !['locked', 'fixed', 'target', 'food'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid savings plan strategy.' }, { status: 400 });
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Please enter a valid plan name.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Initial savings amount must be greater than ₦0.00.' }, { status: 400 });
    }

    const days = Number(durationDays) || 90;
    const target = Number(targetAmount) || numAmount;

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
        { success: false, error: `Insufficient liquid balance. Available: ₦${available.toLocaleString()}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const planId = generateUUID();
    const txId = generateUUID();
    const ref = `SAV-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Deduct wallet balance
    const { error: wErr } = await supabase
      .from('wallets')
      .update({
        wallet_balance: Math.max(0, Number(wallet.wallet_balance) - numAmount),
        updated_at: now.toISOString(),
      })
      .eq('id', wallet.id);

    if (wErr) {
      return NextResponse.json({ success: false, error: 'Failed to update wallet balance.' }, { status: 500 });
    }

    // 2. Insert savings plan
    const { data: newPlan, error: pErr } = await supabase
      .from('savings_plans')
      .insert({
        id: planId,
        user_id: session.userId,
        type,
        name: name.trim(),
        saved_amount: numAmount,
        target_amount: target,
        end_date: endDate,
        status: 'active',
        created_at: now.toISOString(),
      })
      .select('*')
      .single();

    if (pErr || !newPlan) {
      // Rollback wallet balance
      await supabase
        .from('wallets')
        .update({ wallet_balance: Number(wallet.wallet_balance), updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
      return NextResponse.json({ success: false, error: 'Failed to create savings plan.' }, { status: 500 });
    }

    // 3. Insert transaction
    await supabase.from('transactions').insert({
      id: txId,
      user_id: session.userId,
      wallet_id: wallet.id,
      type: 'savings_deposit',
      amount: numAmount,
      status: 'completed',
      reference: ref,
      category: 'savings',
      description: `Funded ${type.toUpperCase()} plan: "${name.trim()}"`,
      created_at: now.toISOString(),
    });

    // 4. Audit Log
    await createAuditLog(
      session.userId,
      'SAVINGS_PLAN_CREATED',
      { planId, type, name: name.trim(), amount: numAmount, durationDays: days }
    );

    return NextResponse.json({
      success: true,
      plan: newPlan,
      message: `Successfully created and funded "${name.trim()}".`,
    });
  } catch (err: unknown) {
    console.error('[Savings API] create error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
