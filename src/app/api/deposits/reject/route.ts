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
    const { transactionId, rejectionReason, reason: legacyReason } = body as {
      transactionId?: string;
      rejectionReason?: string;
      reason?: string;
    };

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required.' }, { status: 400 });
    }

    const reason = (rejectionReason || legacyReason || 'Payment could not be verified by Finance compliance').trim();

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // Call stored procedure or fallback
    const { data: rpcData, error: rpcError } = await supabase.rpc('reject_deposit_atomic', {
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
      const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!tx) {
        return NextResponse.json({ success: false, error: 'Transaction record not found.' }, { status: 404 });
      }

      if (tx.status === 'completed') {
        return NextResponse.json({ success: false, error: 'Cannot reject an already completed transaction.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          description: `${tx.description || 'Deposit'} (Declined: ${reason})`,
        })
        .eq('id', tx.id);

      await createAuditLog(
        session.userId,
        'DEPOSIT_REJECTED',
        {
          transactionId: tx.id,
          amount: tx.amount,
          customerId: tx.user_id,
          rejectionReason: reason,
        }
      );
    }

    const { data: finalTx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (finalTx) {
      // Notify customer
      await supabase.from('notifications').insert({
        user_id: finalTx.user_id,
        title: 'Deposit Request Declined',
        message: `Your deposit request of ₦${finalTx.amount.toLocaleString()} (Ref: ${finalTx.reference}) was declined. Reason: ${reason}`,
        type: 'in-app',
        channel: 'transaction',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit transaction marked as rejected.',
    });
  } catch (err: unknown) {
    console.error('[Deposits API] reject error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during rejection.' },
      { status: 500 }
    );
  }
}
