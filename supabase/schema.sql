-- AFFYBANK Supabase Database Schema (Strict Savings Pivot)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Profile & Credentials Table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  phone text,
  avatar_url text,
  password_hash text,
  pin_hash text,
  is_verified boolean default false,
  two_factor_enabled boolean default false,
  two_factor_secret text,
  is_locked boolean default false,
  failed_attempts integer default 0,
  device_tracking jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;

-- 2. Wallets Table (Tracks main cash reserves)
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  balance numeric(12, 2) default 0.00 not null check (balance >= 0),
  wallet_balance numeric(12, 2) default 0.00 not null check (wallet_balance >= 0),
  reserved_balance numeric(12, 2) default 0.00 not null check (reserved_balance >= 0),
  currency text default 'USD' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wallets enable row level security;

-- 3. Savings Plans Table
create table if not exists public.savings_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('locked', 'fixed', 'target', 'food')),
  name text not null,
  saved_amount numeric(12, 2) default 0.00 not null check (saved_amount >= 0),
  target_amount numeric(12, 2) default 0.00 not null check (target_amount >= 0),
  end_date timestamp with time zone not null,
  status text default 'active' not null check (status in ('active', 'matured', 'broken', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.savings_plans enable row level security;

-- 4. Staff Profiles & Roles Table
create table if not exists public.staff_profiles (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('Super Admin', 'Operations', 'Customer Support', 'Compliance', 'Finance', 'Content Manager')),
  permissions text[] default '{}'::text[] not null,
  password_hash text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.staff_profiles enable row level security;

-- 5. Transactions Table (Tracks all deposits, withdrawals, savings transfers)
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_sent', 'transfer_received', 'savings_deposit', 'savings_withdrawal', 'etranzact_checkout', 'penalty_fee')),
  amount numeric(12, 2) not null check (amount > 0),
  status text default 'pending' not null check (status in ('pending', 'under_review', 'completed', 'rejected', 'failed', 'reversed')),
  recipient_email text,
  recipient_name text,
  reference text unique not null,
  category text default 'other' not null,
  description text,
  approved_by uuid references public.staff_profiles(id),
  approved_at timestamp with time zone,
  rejection_reason text,
  idempotency_key text unique,
  payment_method text default 'direct_bank_transfer',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

-- 6. Linked Bank Accounts Table
create table if not exists public.linked_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  is_default boolean default false,
  status text default 'pending' not null check (status in ('pending', 'verified', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.linked_accounts enable row level security;

-- 7. Beneficiaries Table
create table if not exists public.beneficiaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  bank_name text,
  account_number text not null,
  name text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.beneficiaries enable row level security;

-- 8. Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('in-app', 'email', 'whatsapp')),
  channel text not null check (channel in ('announcement', 'security', 'transaction')),
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

-- 9. Staff Invitations Table
create table if not exists public.staff_invitations (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  name text not null,
  role text not null check (role in ('Super Admin', 'Operations', 'Customer Support', 'Compliance', 'Finance', 'Content Manager')),
  permissions text[] default '{}'::text[] not null,
  invited_by uuid references public.staff_profiles(id),
  token_hash text not null,
  expires_at timestamp with time zone not null,
  accepted boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.staff_invitations enable row level security;

-- 10. CMS Dynamic Settings Table
create table if not exists public.cms_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cms_settings enable row level security;

-- 11. Audit Logs & Session Tracker Table
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  action text not null,
  details jsonb not null,
  ip_address text,
  device_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_logs enable row level security;

-- 12. Persistent Serverless OTP Storage Table (auth_otps)
create table if not exists public.auth_otps (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  otp_hash text not null,
  type text not null check (type in ('signup', 'login', 'reset_password', 'change_password', 'change_pin')),
  expires_at timestamp with time zone not null,
  attempts integer default 0 not null check (attempts >= 0),
  used boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_auth_otps_email_used_expires 
  on public.auth_otps (email, used, expires_at desc);

create index if not exists idx_auth_otps_rate_limit 
  on public.auth_otps (email, created_at desc);

alter table public.auth_otps enable row level security;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- users
create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Service role full access to users" on public.users
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- wallets
create policy "Users can view own wallet" on public.wallets
  for select using (auth.uid() = user_id);

create policy "Service role full access to wallets" on public.wallets
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- savings_plans
create policy "Users can manage own savings plans" on public.savings_plans
  for all using (auth.uid() = user_id);

create policy "Service role full access to savings_plans" on public.savings_plans
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- transactions
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert own pending transactions" on public.transactions
  for insert with check (auth.uid() = user_id and status = 'pending');

create policy "Service role full access to transactions" on public.transactions
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- linked_accounts
create policy "Users can manage own linked accounts" on public.linked_accounts
  for all using (auth.uid() = user_id);

create policy "Service role full access to linked_accounts" on public.linked_accounts
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- beneficiaries
create policy "Users can manage own beneficiaries" on public.beneficiaries
  for all using (auth.uid() = user_id);

create policy "Service role full access to beneficiaries" on public.beneficiaries
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- notifications
create policy "Users can view own or system notifications" on public.notifications
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Service role full access to notifications" on public.notifications
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- staff_profiles
create policy "Service role full access to staff_profiles" on public.staff_profiles
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- staff_invitations
create policy "Service role full access to staff_invitations" on public.staff_invitations
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- cms_settings
create policy "CMS is publicly readable" on public.cms_settings
  for select using (true);

create policy "Service role full access to cms_settings" on public.cms_settings
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- audit_logs
create policy "Users can view own audit logs" on public.audit_logs
  for select using (auth.uid() = user_id);

create policy "Service role full access to audit_logs" on public.audit_logs
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');

-- auth_otps
create policy "Service role full access to auth_otps" on public.auth_otps
  for all using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');
