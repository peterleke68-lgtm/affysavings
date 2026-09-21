import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import {
  getSupabaseAdminClient,
  ensureUserWallet,
  createAuditLog,
  getUserById,
} from '@/lib/supabase-server';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { amount, paymentMethod, description } = body as {
      amount?: number;
      paymentMethod?: string;
      description?: string;
    };

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid deposit amount greater than ₦0.00.' },
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

    // Ensure wallet exists
    const wallet = await ensureUserWallet(session.userId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Customer wallet could not be retrieved.' },
        { status: 500 }
      );
    }

    // Generate unique server-side reference
    const txRef = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    // 1. Insert transaction with PENDING status (NO balance credit yet!)
    const { data: newTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.userId,
        wallet_id: wallet.id,
        type: 'deposit',
        amount: numAmount,
        status: 'pending',
        reference: txRef,
        category: 'income',
        description: description || `Direct Bank Deposit (${paymentMethod || 'bank_transfer'})`,
        created_at: now,
      })
      .select('*')
      .single();

    if (txError || !newTx) {
      console.error('[Deposits API] Insert transaction error:', txError);
      return NextResponse.json(
        { success: false, error: 'Failed to create pending deposit transaction.' },
        { status: 500 }
      );
    }

    // 2. Audit log
    await createAuditLog(
      session.userId,
      'Deposit Initiated (Pending Verification)',
      { transactionId: newTx.id, amount: numAmount, reference: txRef }
    );

    // 3. In-app notification
    await supabase.from('notifications').insert({
      user_id: session.userId,
      title: 'Deposit Under Review',
      message: `Your deposit request of ₦${numAmount.toLocaleString()} (Ref: ${txRef}) is pending Finance verification.`,
      type: 'in-app',
      channel: 'transaction',
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      transaction: newTx,
      reference: txRef,
      message: 'Deposit request created. Please complete bank transfer and notify support.',
    });
  } catch (err: unknown) {
    console.error('[Deposits API] initiate error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while initiating deposit.' },
      { status: 500 }
    );
  }
}
