-- =========================================================================
-- AFFY SAVINGS: AUTHENTICATION & FINANCIAL ENGINE REDESIGN MIGRATION
-- Migration Date: 2026-09-11
-- Description:
--   1. Adds secure credential fields (password_hash, pin_hash) to users and staff_profiles.
--   2. Adds reserved_balance to wallets for safe withdrawal reservation.
--   3. Adds approval & idempotency metadata to transactions with expanded status constraint.
--   4. Updates auth_otps type constraint to support password reset, change password, and change PIN.
--   5. Adds staff_invitations table for server-backed staff onboarding.
--   6. Implements atomic, race-condition-safe PostgreSQL stored procedures for deposits & withdrawals.
-- =========================================================================

-- 1. USERS: Credential Fields
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 2. STAFF PROFILES: Credential Fields
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. WALLETS: Reserved Balance for Escrow/Withdrawals
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (reserved_balance >= 0);

-- 4. TRANSACTIONS: Financial Processing Metadata & Constraints
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.staff_profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'direct_bank_transfer',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Safe update of transactions status CHECK constraint
DO $$
BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
  ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_status_check 
    CHECK (status IN ('pending', 'under_review', 'completed', 'rejected', 'failed', 'reversed'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update handled: %', SQLERRM;
END $$;

-- 5. AUTH_OTPS: Safe constraint expansion for all sensitive actions
DO $$
BEGIN
  ALTER TABLE public.auth_otps DROP CONSTRAINT IF EXISTS auth_otps_type_check;
  ALTER TABLE public.auth_otps 
    ADD CONSTRAINT auth_otps_type_check 
    CHECK (type IN ('signup', 'login', 'reset_password', 'change_password', 'change_pin'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'auth_otps constraint update handled: %', SQLERRM;
END $$;

-- 6. STAFF INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Super Admin', 'Operations', 'Customer Support', 'Compliance', 'Finance', 'Content Manager')),
  permissions TEXT[] DEFAULT '{}'::text[] NOT NULL,
  invited_by UUID REFERENCES public.staff_profiles(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to staff_invitations" ON public.staff_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');


-- =========================================================================
-- ATOMIC STORED PROCEDURES (Concurrency Safe & Idempotent)
-- =========================================================================

-- 1. ATOMIC DEPOSIT APPROVAL
CREATE OR REPLACE FUNCTION public.approve_deposit_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  -- 1. Lock transaction row (prevents concurrent race conditions)
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction record not found.');
  END IF;

  -- 2. Enforce valid state transition
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction has already been approved and credited.');
  ELSIF v_tx.status NOT IN ('pending', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not in a pending review state.');
  END IF;

  -- 3. Lock user wallet row
  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated customer wallet not found.');
  END IF;

  -- 4. Atomically credit wallet balance
  UPDATE public.wallets 
  SET 
    wallet_balance = wallet_balance + v_tx.amount,
    balance = balance + v_tx.amount,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  -- 5. Finalize transaction record
  UPDATE public.transactions 
  SET 
    status = 'completed',
    approved_by = p_staff_id,
    approved_at = NOW(),
    idempotency_key = COALESCE(p_idempotency_key, idempotency_key, encode(gen_random_bytes(16), 'hex'))
  WHERE id = v_tx.id;

  -- 6. Log immutable audit entry
  INSERT INTO public.audit_logs (
    id, user_id, action, details, created_at
  ) VALUES (
    uuid_generate_v4(),
    p_staff_id,
    'DEPOSIT_APPROVED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'amount', v_tx.amount,
      'customer_id', v_tx.user_id,
      'previous_status', v_tx.status,
      'new_status', 'completed',
      'credited_at', NOW()
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Deposit successfully approved and credited.',
    'credited_amount', v_tx.amount,
    'new_wallet_balance', v_wallet.wallet_balance + v_tx.amount
  );
END;
$$;


-- 2. ATOMIC DEPOSIT REJECTION
CREATE OR REPLACE FUNCTION public.reject_deposit_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction record not found.');
  END IF;

  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reject a completed transaction.');
  ELSIF v_tx.status IN ('rejected', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is already rejected.');
  END IF;

  UPDATE public.transactions 
  SET 
    status = 'rejected',
    approved_by = p_staff_id,
    approved_at = NOW(),
    rejection_reason = COALESCE(p_rejection_reason, 'Payment could not be verified by Finance')
  WHERE id = v_tx.id;

  INSERT INTO public.audit_logs (
    id, user_id, action, details, created_at
  ) VALUES (
    uuid_generate_v4(),
    p_staff_id,
    'DEPOSIT_REJECTED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'amount', v_tx.amount,
      'customer_id', v_tx.user_id,
      'rejection_reason', p_rejection_reason
    ),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'message', 'Deposit transaction marked as rejected.');
END;
$$;


-- 3. ATOMIC WITHDRAWAL REQUEST (Reserves funds in escrow)
CREATE OR REPLACE FUNCTION public.request_withdrawal_atomic(
  p_user_id UUID,
  p_amount NUMERIC,
  p_account_id UUID,
  p_description TEXT DEFAULT 'Withdrawal Request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_account RECORD;
  v_tx_id UUID;
  v_ref TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal amount must be greater than zero.');
  END IF;

  -- Lock user wallet
  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found.');
  END IF;

  -- Check available unreserved balance
  IF (v_wallet.wallet_balance - v_wallet.reserved_balance) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient available liquid balance.');
  END IF;

  -- Verify linked account
  SELECT * INTO v_account 
  FROM public.linked_accounts 
  WHERE id = p_account_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Selected linked bank account not found.');
  END IF;

  -- Reserve the funds
  UPDATE public.wallets 
  SET 
    reserved_balance = reserved_balance + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  v_tx_id := uuid_generate_v4();
  v_ref := 'WTH-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));

  -- Insert pending withdrawal transaction
  INSERT INTO public.transactions (
    id, user_id, wallet_id, type, amount, status, reference, category, description, created_at, metadata
  ) VALUES (
    v_tx_id,
    p_user_id,
    v_wallet.id,
    'withdrawal',
    p_amount,
    'pending',
    v_ref,
    'other',
    COALESCE(p_description, 'ACH Withdrawal to ' || v_account.bank_name),
    NOW(),
    jsonb_build_object(
      'bank_name', v_account.bank_name,
      'account_number', v_account.account_number,
      'account_holder', v_account.account_holder,
      'account_id', p_account_id
    )
  );

  INSERT INTO public.audit_logs (
    id, user_id, action, details, created_at
  ) VALUES (
    uuid_generate_v4(),
    p_user_id,
    'WITHDRAWAL_INITIATED',
    jsonb_build_object(
      'transaction_id', v_tx_id,
      'amount', p_amount,
      'reference', v_ref,
      'bank_name', v_account.bank_name
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal initiated successfully. Funds reserved for settlement.',
    'transaction_id', v_tx_id,
    'reference', v_ref,
    'reserved_amount', p_amount,
    'available_balance', (v_wallet.wallet_balance - v_wallet.reserved_balance - p_amount)
  );
END;
$$;


-- 4. ATOMIC WITHDRAWAL APPROVAL (Finalizes settlement and deducts balance)
CREATE OR REPLACE FUNCTION public.approve_withdrawal_atomic(
  p_transaction_id UUID,
  p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal transaction not found.');
  END IF;

  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal has already been finalized.');
  ELSIF v_tx.status NOT IN ('pending', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is not pending review.');
  END IF;

  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet not found.');
  END IF;

  -- Deduct from actual balance and clear reserved balance
  UPDATE public.wallets 
  SET 
    wallet_balance = GREATEST(0.00, wallet_balance - v_tx.amount),
    balance = GREATEST(0.00, balance - v_tx.amount),
    reserved_balance = GREATEST(0.00, reserved_balance - v_tx.amount),
    updated_at = NOW()
  WHERE id = v_wallet.id;

  UPDATE public.transactions 
  SET 
    status = 'completed',
    approved_by = p_staff_id,
    approved_at = NOW()
  WHERE id = v_tx.id;

  INSERT INTO public.audit_logs (
    id, user_id, action, details, created_at
  ) VALUES (
    uuid_generate_v4(),
    p_staff_id,
    'WITHDRAWAL_APPROVED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'amount', v_tx.amount,
      'customer_id', v_tx.user_id,
      'settled_at', NOW()
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal successfully approved and settled.',
    'amount', v_tx.amount
  );
END;
$$;


-- 5. ATOMIC WITHDRAWAL REJECTION (Releases reserved funds back to available wallet)
CREATE OR REPLACE FUNCTION public.reject_withdrawal_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal transaction not found.');
  END IF;

  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reject an already settled withdrawal.');
  ELSIF v_tx.status IN ('rejected', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is already rejected.');
  END IF;

  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet not found.');
  END IF;

  -- Release the reserved balance back to customer
  UPDATE public.wallets 
  SET 
    reserved_balance = GREATEST(0.00, reserved_balance - v_tx.amount),
    updated_at = NOW()
  WHERE id = v_wallet.id;

  UPDATE public.transactions 
  SET 
    status = 'rejected',
    approved_by = p_staff_id,
    approved_at = NOW(),
    rejection_reason = COALESCE(p_rejection_reason, 'Withdrawal rejected by Finance compliance')
  WHERE id = v_tx.id;

  INSERT INTO public.audit_logs (
    id, user_id, action, details, created_at
  ) VALUES (
    uuid_generate_v4(),
    p_staff_id,
    'WITHDRAWAL_REJECTED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'amount', v_tx.amount,
      'customer_id', v_tx.user_id,
      'rejection_reason', p_rejection_reason
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal rejected. Reserved funds successfully restored to available balance.'
  );
END;
$$;
