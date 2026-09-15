-- =========================================================================
-- AFFY SAVINGS: AUTHENTICATION & FINANCIAL BACKEND OVERHAUL MIGRATION
-- Migration Date: 2026-09-11
-- Description:
--   1. Adds password_hash, pin_hash, lockout tracking to public.users
--   2. Adds locked_escrow_balance to public.wallets
--   3. Adds approval/rejection audit and idempotency columns to public.transactions
--   4. Adds staff_id actor support to public.audit_logs
--   5. Deploys hardened, SECURITY DEFINER atomic stored procedures for:
--        - approve_deposit_atomic (with independent staff role validation)
--        - approve_withdrawal_atomic (with strict escrow accounting)
--        - reject_withdrawal_atomic (with strict escrow refund accounting)
--   6. Restricts RPC EXECUTE to service_role (revoking public/anon execution)
--   7. Fixes infinite recursion on staff_profiles RLS and locks financial tables
-- =========================================================================

-- 1. USERS: CREDENTIALS, PIN & LOCKOUT COLUMNS
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. WALLETS: ESCROW BALANCE FOR WITHDRAWAL ISOLATION
ALTER TABLE public.wallets 
  ADD COLUMN IF NOT EXISTS locked_escrow_balance NUMERIC(14,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC(14,2) DEFAULT 0.00;

-- Ensure non-negative check on escrow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_locked_escrow_non_negative'
  ) THEN
    ALTER TABLE public.wallets 
      ADD CONSTRAINT wallets_locked_escrow_non_negative CHECK (locked_escrow_balance >= 0);
  END IF;
END $$;

-- 3. TRANSACTIONS: AUDIT, REJECTION & IDEMPOTENCY TRACKING
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency 
  ON public.transactions(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_status 
  ON public.transactions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_status_created 
  ON public.transactions(status, created_at DESC);

-- 4. AUDIT LOGS: STAFF ACTOR MODEL SUPPORT
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_created 
  ON public.audit_logs(staff_id, created_at DESC);


-- 5. ATOMIC RPC: APPROVE DEPOSIT
CREATE OR REPLACE FUNCTION public.approve_deposit_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  -- A. Independently verify that staff exists, is active, and possesses Finance or Super Admin role
  SELECT * INTO v_staff 
  FROM public.staff_profiles 
  WHERE id = p_staff_id 
    AND is_active = true 
    AND role IN ('Finance', 'Super Admin');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Staff member does not exist, is inactive, or lacks Finance/Super Admin privileges.'
    );
  END IF;

  -- B. Lock and fetch the transaction
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction record not found.');
  END IF;

  -- C. Handle Idempotency
  IF v_tx.status = 'completed' THEN
    IF p_idempotency_key IS NOT NULL AND v_tx.idempotency_key = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'success', true, 
        'credited_amount', v_tx.amount,
        'message', 'Idempotent request: Deposit has already been approved and credited.'
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Deposit has already been approved and credited.');
  END IF;

  IF v_tx.status NOT IN ('pending', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not in a pending review status (current: ' || v_tx.status || ').');
  END IF;

  IF v_tx.type != 'deposit' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction type mismatch: expected deposit, found ' || v_tx.type || '.');
  END IF;

  -- D. Lock and fetch the customer wallet
  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet record not found.');
  END IF;

  -- E. Atomic Balance Credit
  UPDATE public.wallets
  SET wallet_balance = wallet_balance + v_tx.amount,
      balance = balance + v_tx.amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_wallet.id;

  -- F. Update Transaction Record
  UPDATE public.transactions
  SET status = 'completed',
      approved_by = p_staff_id,
      approved_at = timezone('utc'::text, now()),
      idempotency_key = COALESCE(p_idempotency_key, idempotency_key)
  WHERE id = v_tx.id;

  -- G. Write Authoritative Audit Log with Staff & Customer linkage
  INSERT INTO public.audit_logs (user_id, staff_id, action, details, created_at)
  VALUES (
    v_tx.user_id,
    p_staff_id,
    'DEPOSIT_APPROVED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'reference', v_tx.reference,
      'amount', v_tx.amount,
      'staff_email', v_staff.email,
      'staff_role', v_staff.role,
      'credited_wallet_id', v_wallet.id
    ),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true, 
    'credited_amount', v_tx.amount,
    'message', 'Deposit successfully approved and credited.'
  );
END;
$$;


-- 6. ATOMIC RPC: APPROVE WITHDRAWAL
CREATE OR REPLACE FUNCTION public.approve_withdrawal_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  -- A. Independently verify staff authorization
  SELECT * INTO v_staff 
  FROM public.staff_profiles 
  WHERE id = p_staff_id 
    AND is_active = true 
    AND role IN ('Finance', 'Super Admin');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Staff member does not exist, is inactive, or lacks Finance/Super Admin privileges.'
    );
  END IF;

  -- B. Lock and fetch transaction
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction record not found.');
  END IF;

  -- C. Handle Idempotency
  IF v_tx.status = 'completed' THEN
    IF p_idempotency_key IS NOT NULL AND v_tx.idempotency_key = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'success', true, 
        'debited_amount', v_tx.amount,
        'message', 'Idempotent request: Withdrawal has already been completed.'
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal has already been finalized and completed.');
  END IF;

  IF v_tx.status NOT IN ('pending', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is not in a pending review status (current: ' || v_tx.status || ').');
  END IF;

  IF v_tx.type != 'withdrawal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction type mismatch: expected withdrawal, found ' || v_tx.type || '.');
  END IF;

  -- D. Lock and fetch customer wallet
  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet record not found.');
  END IF;

  -- E. Strict Mathematical Accounting Validation (fail rather than hiding negative balances)
  IF v_wallet.locked_escrow_balance < v_tx.amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Accounting Error: Insufficient locked escrow balance (' || v_wallet.locked_escrow_balance || ') to finalize withdrawal (' || v_tx.amount || ').'
    );
  END IF;

  IF v_wallet.balance < v_tx.amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Accounting Error: Total wallet balance (' || v_wallet.balance || ') is less than withdrawal amount (' || v_tx.amount || ').'
    );
  END IF;

  -- F. Finalize Withdrawal: release escrow and debit total balance
  UPDATE public.wallets
  SET locked_escrow_balance = locked_escrow_balance - v_tx.amount,
      balance = balance - v_tx.amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_wallet.id;

  -- G. Mark transaction completed
  UPDATE public.transactions
  SET status = 'completed',
      approved_by = p_staff_id,
      approved_at = timezone('utc'::text, now()),
      idempotency_key = COALESCE(p_idempotency_key, idempotency_key)
  WHERE id = v_tx.id;

  -- H. Audit Log
  INSERT INTO public.audit_logs (user_id, staff_id, action, details, created_at)
  VALUES (
    v_tx.user_id,
    p_staff_id,
    'WITHDRAWAL_APPROVED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'reference', v_tx.reference,
      'amount', v_tx.amount,
      'staff_email', v_staff.email,
      'staff_role', v_staff.role,
      'debited_wallet_id', v_wallet.id
    ),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true, 
    'debited_amount', v_tx.amount,
    'message', 'Withdrawal successfully approved and disbursed.'
  );
END;
$$;


-- 7. ATOMIC RPC: REJECT WITHDRAWAL
CREATE OR REPLACE FUNCTION public.reject_withdrawal_atomic(
  p_transaction_id UUID,
  p_staff_id UUID,
  p_rejection_reason TEXT DEFAULT 'Withdrawal request rejected by Finance'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_tx RECORD;
  v_wallet RECORD;
BEGIN
  -- A. Independently verify staff authorization
  SELECT * INTO v_staff 
  FROM public.staff_profiles 
  WHERE id = p_staff_id 
    AND is_active = true 
    AND role IN ('Finance', 'Super Admin');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Staff member does not exist, is inactive, or lacks Finance/Super Admin privileges.'
    );
  END IF;

  -- B. Lock and fetch transaction
  SELECT * INTO v_tx 
  FROM public.transactions 
  WHERE id = p_transaction_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction record not found.');
  END IF;

  IF v_tx.status != 'pending' AND v_tx.status != 'under_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not in pending status (current: ' || v_tx.status || ').');
  END IF;

  IF v_tx.type != 'withdrawal' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction type mismatch: expected withdrawal, found ' || v_tx.type || '.');
  END IF;

  -- C. Lock and fetch wallet
  SELECT * INTO v_wallet 
  FROM public.wallets 
  WHERE id = v_tx.wallet_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer wallet record not found.');
  END IF;

  -- D. Validate escrow balance before refund
  IF v_wallet.locked_escrow_balance < v_tx.amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Accounting Error: Insufficient locked escrow balance (' || v_wallet.locked_escrow_balance || ') to refund withdrawal (' || v_tx.amount || ').'
    );
  END IF;

  -- E. Refund: deduct from escrow and return exactly to available liquid balance
  UPDATE public.wallets
  SET locked_escrow_balance = locked_escrow_balance - v_tx.amount,
      wallet_balance = wallet_balance + v_tx.amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_wallet.id;

  -- F. Mark transaction rejected
  UPDATE public.transactions
  SET status = 'rejected',
      rejected_by = p_staff_id,
      rejected_at = timezone('utc'::text, now()),
      rejection_reason = p_rejection_reason
  WHERE id = v_tx.id;

  -- G. Audit Log
  INSERT INTO public.audit_logs (user_id, staff_id, action, details, created_at)
  VALUES (
    v_tx.user_id,
    p_staff_id,
    'WITHDRAWAL_REJECTED',
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'reference', v_tx.reference,
      'amount', v_tx.amount,
      'rejection_reason', p_rejection_reason,
      'staff_email', v_staff.email,
      'refunded_wallet_id', v_wallet.id
    ),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true, 
    'refunded_amount', v_tx.amount,
    'message', 'Withdrawal rejected and escrow funds refunded to available wallet balance.'
  );
END;
$$;


-- 8. RESTRICT RPC EXECUTE PERMISSIONS (SERVICE ROLE ONLY)
REVOKE ALL ON FUNCTION public.approve_deposit_atomic(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit_atomic(UUID, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.approve_withdrawal_atomic(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal_atomic(UUID, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.reject_withdrawal_atomic(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal_atomic(UUID, UUID, TEXT) TO service_role;


-- 9. HARDENED ROW LEVEL SECURITY (RLS) POLICIES

-- Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Deny direct anon wallet update" ON public.wallets;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Service role full access to wallets" ON public.wallets;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wallets" ON public.wallets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

-- Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Deny direct anon transaction update" ON public.transactions;
DROP POLICY IF EXISTS "Service role full access to transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role full access to transactions" ON public.transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

-- Staff Profiles (Fix infinite recursion by removing self-referential subquery)
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view staff list" ON public.staff_profiles;
DROP POLICY IF EXISTS "Service role full access to staff_profiles" ON public.staff_profiles;

CREATE POLICY "Service role full access to staff_profiles" ON public.staff_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');
