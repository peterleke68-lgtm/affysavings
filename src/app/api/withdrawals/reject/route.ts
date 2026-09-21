import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getSupabaseAdminClient,
  createAuditLog,
} from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Finance', 'Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { transactionId, rejectionReason, reason: legacyReason } = body as {
      transactionId?: string;
      rejectionReason?: string;
      reason?: string;
    };

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required.' }, { status: 400 });
    }

    const reason = (rejectionReason || legacyReason || 'Withdrawal rejected by Finance compliance').trim();

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // Call stored procedure or fallback
    const { data: rpcData, error: rpcError } = await supabase.rpc('reject_withdrawal_atomic', {
      p_transaction_id: transactionId,
      p_staff_id: session.userId,
      p_rejection_reason: reason,
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
        return NextResponse.json({ success: false, error: 'Cannot reject an already completed withdrawal.' }, { status: 400 });
      }

      const { data: wallet } = await supabase.from('wallets').select('*').eq('id', tx.wallet_id).single();
      if (wallet) {
        const now = new Date().toISOString();
        // Release reserved funds back to available liquid balance
        await supabase
          .from('wallets')
          .update({
            wallet_balance: Number(wallet.wallet_balance) + Number(tx.amount),
            locked_escrow_balance: Math.max(0, (Number(wallet.locked_escrow_balance) || 0) - Number(tx.amount)),
            reserved_balance: Math.max(0, (Number(wallet.reserved_balance) || 0) - Number(tx.amount)),
            updated_at: now,
          })
          .eq('id', wallet.id);
      }

      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          description: `${tx.description || 'Withdrawal'} (Declined: ${reason})`,
        })
        .eq('id', tx.id);

      await createAuditLog(
        session.userId,
        'WITHDRAWAL_REJECTED',
        { transactionId: tx.id, amount: tx.amount, customerId: tx.user_id, rejectionReason: reason }
      );
    }

    const { data: finalTx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (finalTx) {
      await supabase.from('notifications').insert({
        user_id: finalTx.user_id,
        title: 'Withdrawal Declined',
        message: `Your withdrawal of ₦${finalTx.amount.toLocaleString()} (Ref: ${finalTx.reference}) was declined. Reason: ${reason}. Reserved funds have been restored.`,
        type: 'in-app',
        channel: 'transaction',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal rejected and reserved funds released back to customer.',
    });
  } catch (err: unknown) {
    console.error('[Withdrawals API] reject error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during withdrawal rejection.' },
      { status: 500 }
    );
  }
}
