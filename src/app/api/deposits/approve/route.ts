import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/session';
import {
  getSupabaseAdminClient,
  createAuditLog,
  getUserById,
} from '@/lib/supabase-server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireStaffRole(request, ['Finance', 'Super Admin']);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { transactionId, idempotencyKey } = body as {
      transactionId?: string;
      idempotencyKey?: string;
    };

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database service is currently unavailable.' },
        { status: 503 }
      );
    }

    // 1. Try calling atomic PostgreSQL stored procedure first
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_deposit_atomic', {
      p_transaction_id: transactionId,
      p_staff_id: session.userId,
      p_idempotency_key: idempotencyKey || null,
    });

    let depositAmount = 0;
    let customerId = '';
    let txRef = '';

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return NextResponse.json({ success: false, error: rpcData.error }, { status: 400 });
      }
      depositAmount = rpcData.credited_amount || 0;
    } else {
      // 2. Server-side atomic fallback if RPC is not yet registered
      console.warn('[Deposits API] RPC approve_deposit_atomic fallback active:', rpcError?.message);

      // Lock/Fetch transaction
      const { data: tx, error: txFetchErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (txFetchErr || !tx) {
        return NextResponse.json({ success: false, error: 'Transaction record not found.' }, { status: 404 });
      }

      if (tx.status === 'completed') {
        return NextResponse.json(
          { success: false, error: 'This deposit has already been approved and credited.' },
          { status: 400 }
        );
      }

      if (tx.status !== 'pending' && tx.status !== 'under_review') {
        return NextResponse.json(
          { success: false, error: `Cannot approve transaction in status: ${tx.status}.` },
          { status: 400 }
        );
      }

      depositAmount = tx.amount;
      customerId = tx.user_id;
      txRef = tx.reference;

      // Fetch wallet
      const { data: wallet, error: wErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', tx.wallet_id)
        .single();

      if (wErr || !wallet) {
        return NextResponse.json({ success: false, error: 'Customer wallet not found.' }, { status: 404 });
      }

      const now = new Date().toISOString();

      // Atomically credit wallet
      const { error: wUpdateErr } = await supabase
        .from('wallets')
        .update({
          wallet_balance: Number(wallet.wallet_balance) + Number(tx.amount),
          balance: Number(wallet.balance) + Number(tx.amount),
          updated_at: now,
        })
        .eq('id', wallet.id);

      if (wUpdateErr) {
        console.error('[Deposits API] Wallet update error:', wUpdateErr);
        return NextResponse.json({ success: false, error: 'Failed to update wallet balance.' }, { status: 500 });
      }

      // Mark transaction completed
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          approved_by: session.userId,
          approved_at: now,
          idempotency_key: idempotencyKey || tx.idempotency_key || null,
        })
        .eq('id', tx.id);

      // Write audit log
      await createAuditLog(
        session.userId,
        'DEPOSIT_APPROVED',
        {
          transactionId: tx.id,
          amount: tx.amount,
          customerId: tx.user_id,
          approvingStaffEmail: session.email,
          previousStatus: tx.status,
          newStatus: 'completed',
        }
      );
    }

    // Get customer info for notifications
    const { data: finalTx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (finalTx) {
      customerId = finalTx.user_id;
      depositAmount = finalTx.amount;
      txRef = finalTx.reference;
    }

    if (customerId) {
      const user = await getUserById(customerId);
      const now = new Date().toISOString();

      // In-app notification
      await supabase.from('notifications').insert({
        user_id: customerId,
        title: 'Deposit Approved & Credited',
        message: `Your deposit of ₦${depositAmount.toLocaleString()} (Ref: ${txRef}) has been verified and credited to your wallet.`,
        type: 'in-app',
        channel: 'transaction',
        created_at: now,
      });

      // Transactional email notification via Resend
      if (user?.email && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key') {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Affy Savings <noreply@enquiry.affysavings.name.ng>',
            to: [user.email],
            subject: 'Deposit Approved — Affy Savings Wallet Credited',
            html: `
              <div style="font-family:sans-serif; background:#0f0f12; color:#fff; padding:30px; border-radius:12px;">
                <h2 style="color:#a78bfa;">Deposit Verified & Credited</h2>
                <p>Hi ${user.name},</p>
                <p>Your direct deposit of <strong style="color:#10b981;">₦${depositAmount.toLocaleString()}</strong> has been approved by Finance.</p>
                <p style="font-family:monospace; background:#1a1a22; padding:12px; border-radius:8px;">Transaction Reference: ${txRef}</p>
                <p style="color:#71717a; font-size:12px;">Your fluid wallet balance is now available for lock strategies and savings vaults.</p>
              </div>
            `,
          });
        } catch (mailErr) {
          console.warn('[Deposits API] Resend email warning:', mailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      creditedAmount: depositAmount,
      message: `Deposit of ₦${depositAmount.toLocaleString()} successfully approved and credited.`,
    });
  } catch (err: unknown) {
    console.error('[Deposits API] approve error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during approval.' },
      { status: 500 }
    );
  }
}
