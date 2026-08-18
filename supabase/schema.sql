-- AFFYBANK Supabase Database Schema (Strict Savings Pivot)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Profile & Credentials Table
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  phone text,
  avatar_url text,
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
create table public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  balance numeric(12, 2) default 0.00 not null check (balance >= 0),
  wallet_balance numeric(12, 2) default 0.00 not null check (wallet_balance >= 0),
  currency text default 'USD' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wallets enable row level security;

-- 3. Savings Plans Table
create table public.savings_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('locked', 'fixed', 'target')),
  name text not null,
  saved_amount numeric(12, 2) default 0.00 not null check (saved_amount >= 0),
  target_amount numeric(12, 2) default 0.00 not null check (target_amount >= 0),
  end_date timestamp with time zone not null,
  status text default 'active' not null check (status in ('active', 'matured', 'broken', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.savings_plans enable row level security;

-- 4. Transactions Table (Tracks all deposits, withdrawals, savings transfers)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_sent', 'transfer_received', 'savings_deposit', 'savings_withdrawal', 'etranzact_checkout', 'penalty_fee')),
  amount numeric(12, 2) not null check (amount > 0),
  status text default 'pending' not null check (status in ('pending', 'completed', 'failed')),
  recipient_email text,
  recipient_name text,
  reference text unique not null,
  category text default 'other' not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

-- 5. Linked Bank Accounts Table
create table public.linked_accounts (
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

-- 6. Beneficiaries Table
create table public.beneficiaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  bank_name text,
  account_number text not null,
  name text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.beneficiaries enable row level security;

-- 7. Notifications Table
create table public.notifications (
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

-- 8. Staff Profiles & Roles Table
create table public.staff_profiles (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('Super Admin', 'Operations', 'Customer Support', 'Compliance', 'Finance', 'Content Manager')),
  permissions text[] default '{}'::text[] not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.staff_profiles enable row level security;

-- 9. CMS Dynamic Settings Table
create table public.cms_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cms_settings enable row level security;

-- 10. Audit Logs & Session Tracker Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  action text not null,
  details jsonb not null,
  ip_address text,
  device_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_logs enable row level security;


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

-- Service role bypass (for server-side operations / triggers)
create policy "Service role full access to users" on public.users
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- wallets
create policy "Users can insert own wallet" on public.wallets
  for insert with check (auth.uid() = user_id);

create policy "Users can view own wallet" on public.wallets
  for select using (auth.uid() = user_id);

create policy "Users can update own wallet" on public.wallets
  for update using (auth.uid() = user_id);

create policy "Service role full access to wallets" on public.wallets
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- savings_plans
create policy "Users can manage own savings plans" on public.savings_plans
  for all using (auth.uid() = user_id);

create policy "Service role full access to savings_plans" on public.savings_plans
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- transactions
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Service role full access to transactions" on public.transactions
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- linked_accounts
create policy "Users can manage own linked accounts" on public.linked_accounts
  for all using (auth.uid() = user_id);

create policy "Service role full access to linked_accounts" on public.linked_accounts
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- beneficiaries
create policy "Users can manage own beneficiaries" on public.beneficiaries
  for all using (auth.uid() = user_id);

create policy "Service role full access to beneficiaries" on public.beneficiaries
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- notifications
create policy "Users can view own or system notifications" on public.notifications
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Service role full access to notifications" on public.notifications
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- staff_profiles
create policy "Staff can view staff list" on public.staff_profiles
  for select using (exists (
    select 1 from public.staff_profiles sp where sp.id = auth.uid()
  ));

create policy "Service role full access to staff_profiles" on public.staff_profiles
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- cms_settings
create policy "CMS is publicly readable" on public.cms_settings
  for select using (true);

create policy "Service role full access to cms_settings" on public.cms_settings
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- audit_logs
create policy "Users can insert own audit logs" on public.audit_logs
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can view own audit logs" on public.audit_logs
  for select using (auth.uid() = user_id);

create policy "Service role full access to audit_logs" on public.audit_logs
  for all using (auth.jwt() ->> 'role' = 'service_role');


-- =========================================================================
-- AUTO-CREATE PUBLIC.USERS PROFILE ON SUPABASE AUTH SIGNUP
-- =========================================================================
-- This trigger fires whenever a new user is confirmed in auth.users.
-- It creates the matching application profile row in public.users so that
-- the cache-aside sync in db.ts has a row to pull from Supabase.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    phone,
    avatar_url,
    is_verified,
    two_factor_enabled,
    two_factor_secret,
    is_locked,
    failed_attempts,
    device_tracking,
    created_at
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    true,
    false,
    '',
    false,
    0,
    '[]'::jsonb,
    now()
  )
  on conflict (id) do update set
    email       = excluded.email,
    is_verified = true;

  return new;
end;
$$;

-- Drop existing trigger if it exists (safe for re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
