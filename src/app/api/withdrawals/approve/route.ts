import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getSupabaseAdminClient,
  createAuditLog,
  getUserById,
} from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Finance', 'Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { transactionId } = body as { transactionId?: string };

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // Call stored procedure or fallback
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_withdrawal_atomic', {
      p_transaction_id: transactionId,
      p_staff_id: session.userId,
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return NextResponse.json({ success: false, error: rpcData.error }, { status: 400 });
      }
    } else {
      // Fallback
      const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction record not found.' }, { status: 404 });
      }

      if (tx.status === 'completed') {
        return NextResponse.json({ success: false, error: 'Withdrawal is already completed.' }, { status: 400 });
      }

      const { data: wallet } = await supabase.from('wallets').select('*').eq('id', tx.wallet_id).single();
      if (!wallet) {
        return NextResponse.json({ success: false, error: 'Wallet not found.' }, { status: 404 });
      }

      const now = new Date().toISOString();
      await supabase
        .from('wallets')
        .update({
          balance: Math.max(0, Number(wallet.balance) - Number(tx.amount)),
          locked_escrow_balance: Math.max(0, (Number(wallet.locked_escrow_balance) || 0) - Number(tx.amount)),
          reserved_balance: Math.max(0, (Number(wallet.reserved_balance) || 0) - Number(tx.amount)),
          updated_at: now,
        })
        .eq('id', wallet.id);

      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          approved_by: session.userId,
          approved_at: now,
        })
        .eq('id', tx.id);

      await createAuditLog(
        session.userId,
        'WITHDRAWAL_APPROVED',
        { transactionId: tx.id, amount: tx.amount, customerId: tx.user_id }
      );
    }

    const { data: finalTx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (finalTx) {
      await supabase.from('notifications').insert({
        user_id: finalTx.user_id,
        title: 'Withdrawal Processed & Settled',
        message: `Your withdrawal of ₦${finalTx.amount.toLocaleString()} (Ref: ${finalTx.reference}) has been approved and paid out.`,
        type: 'in-app',
        channel: 'transaction',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal settled and marked as completed.',
    });
  } catch (err: unknown) {
    console.error('[Withdrawals API] approve error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during withdrawal approval.' },
      { status: 500 }
    );
  }
}
