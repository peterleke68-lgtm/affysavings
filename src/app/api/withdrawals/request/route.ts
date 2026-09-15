import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/session';
import {
  getSupabaseAdminClient,
  getUserByIdWithCredentials,
  createAuditLog,
} from '@/lib/supabase-server';
import { verifyPin } from '@/lib/credentials';

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireAuthenticatedUser(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const { session } = authCheck;
    const body = await request.json();
    const { amount, accountId, pin } = body as {
      amount?: number;
      accountId?: string;
      pin?: string;
    };

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid withdrawal amount greater than ₦0.00.' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Please select a destination bank account.' },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin.trim())) {
      return NextResponse.json(
        { success: false, error: 'A valid 4-digit transaction PIN is required to authorize withdrawals.' },
        { status: 400 }
      );
    }

    // 1. Verify 4-digit PIN hash
    const user = await getUserByIdWithCredentials(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Customer profile not found.' }, { status: 404 });
    }

    let isPinValid = false;
    if (user.pin_hash) {
      isPinValid = await verifyPin(pin.trim(), user.pin_hash);
    } else {
      // Legacy fallback
      isPinValid = pin.trim().length === 4;
    }

    if (!isPinValid) {
      await createAuditLog(user.id, 'Failed Withdrawal Authorization (Incorrect PIN)', { amount: numAmount });
      return NextResponse.json(
        { success: false, error: 'Incorrect 4-digit transaction PIN. Authorization failed.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database service unavailable.' }, { status: 503 });
    }

    // 2. Call atomic stored procedure or execute server-side reserve logic
    const { data: rpcData, error: rpcError } = await supabase.rpc('request_withdrawal_atomic', {
      p_user_id: session.userId,
      p_amount: numAmount,
      p_account_id: accountId,
      p_description: 'ACH Bank Withdrawal Request',
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return NextResponse.json({ success: false, error: rpcData.error }, { status: 400 });
      }
      return NextResponse.json(rpcData);
    }

    // 3. Server fallback if RPC not yet run
    console.warn('[Withdrawals API] RPC request_withdrawal_atomic fallback active:', rpcError?.message);

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', session.userId).single();
    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found.' }, { status: 404 });
    }

    const liquid = Number(wallet.wallet_balance);
    if (liquid < numAmount) {
      return NextResponse.json(
        { success: false, error: `Insufficient liquid wallet balance. Available: ₦${liquid.toLocaleString()}` },
        { status: 400 }
      );
    }

    const { data: account } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', session.userId)
      .single();

    if (!account) {
      return NextResponse.json({ success: false, error: 'Linked account not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const ref = `WTH-${Math.floor(100000 + Math.random() * 900000)}`;

    // Reserve funds: move from liquid wallet_balance to locked_escrow_balance
    await supabase
      .from('wallets')
      .update({
        wallet_balance: liquid - numAmount,
        locked_escrow_balance: (Number(wallet.locked_escrow_balance) || 0) + numAmount,
        reserved_balance: (Number(wallet.reserved_balance) || 0) + numAmount,
        updated_at: now,
      })
      .eq('id', wallet.id);

    // Insert transaction
    const { data: newTx } = await supabase
      .from('transactions')
      .insert({
        user_id: session.userId,
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount: numAmount,
        status: 'pending',
        reference: ref,
        category: 'other',
        description: `ACH Withdrawal to ${account.bank_name}`,
        created_at: now,
        metadata: {
          bank_name: account.bank_name,
          account_number: account.account_number,
          account_holder: account.account_holder,
          account_id: account.id,
        },
      })
      .select('*')
      .single();

    await createAuditLog(
      session.userId,
      'WITHDRAWAL_REQUESTED',
      { transactionId: newTx?.id, amount: numAmount, reference: ref, bankName: account.bank_name }
    );

    return NextResponse.json({
      success: true,
      message: 'Withdrawal requested successfully. Funds reserved for settlement.',
      transaction: newTx,
      reference: ref,
    });
  } catch (err: unknown) {
    console.error('[Withdrawals API] request error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during withdrawal request.' },
      { status: 500 }
    );
  }
}
