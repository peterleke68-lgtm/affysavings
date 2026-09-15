import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE__KEY ||
  '';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar_url: string;
  password_hash?: string | null;
  pin_hash?: string | null;
  is_verified: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string;
  is_locked: boolean;
  failed_attempts: number;
  device_tracking: { id: string; device: string; ip: string; date: string }[];
  created_at: string;
  updated_at?: string;
}

export interface DbStaffProfile {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Operations' | 'Customer Support' | 'Compliance' | 'Finance' | 'Content Manager';
  permissions: string[];
  password_hash?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbWallet {
  id: string;
  user_id: string;
  balance: number;
  wallet_balance: number;
  reserved_balance: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'savings_deposit' | 'savings_withdrawal' | 'etranzact_checkout' | 'penalty_fee';
  amount: number;
  status: 'pending' | 'under_review' | 'completed' | 'rejected' | 'failed' | 'reversed';
  recipient_email?: string;
  recipient_name?: string;
  reference: string;
  category: string;
  description: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  idempotency_key?: string | null;
  payment_method?: string;
  metadata?: any;
  created_at: string;
}

export interface DbSavingsPlan {
  id: string;
  user_id: string;
  type: 'locked' | 'fixed' | 'target' | 'food';
  name: string;
  saved_amount: number;
  target_amount: number;
  end_date: string;
  status: 'active' | 'matured' | 'broken' | 'completed';
  created_at: string;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServerKey) {
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServerKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[Supabase Server] Failed to initialize Supabase client:', err);
    return null;
  }
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Retrieves a user by their email with credentials (server-only).
 */
export async function getUserByEmailWithCredentials(email: string): Promise<DbUser | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) return null;
    return user as DbUser;
  } catch (err) {
    console.error('[Supabase Server] getUserByEmailWithCredentials exception:', err);
    return null;
  }
}

/**
 * Retrieves a user by ID with credentials (server-only).
 */
export async function getUserByIdWithCredentials(userId: string): Promise<DbUser | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) return null;
    return user as DbUser;
  } catch (err) {
    console.error('[Supabase Server] getUserByIdWithCredentials exception:', err);
    return null;
  }
}

/**
 * Retrieves a sanitized user by their ID.
 */
export async function getUserById(userId: string): Promise<Omit<DbUser, 'password_hash' | 'pin_hash' | 'two_factor_secret'> | null> {
  const user = await getUserByIdWithCredentials(userId);
  if (!user) return null;
  const { password_hash, pin_hash, two_factor_secret, ...safeUser } = user;
  return safeUser;
}

/**
 * Retrieves a sanitized user by their email.
 */
export async function getUserByEmail(email: string): Promise<Omit<DbUser, 'password_hash' | 'pin_hash' | 'two_factor_secret'> | null> {
  const user = await getUserByEmailWithCredentials(email);
  if (!user) return null;
  const { password_hash, pin_hash, two_factor_secret, ...safeUser } = user;
  return safeUser;
}

/**
 * Creates or updates a verified user with password and PIN hashes upon registration.
 */
export async function createVerifiedUser(data: {
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  pinHash: string;
  deviceInfo?: any;
}): Promise<DbUser> {
  const normalizedEmail = data.email.toLowerCase().trim();
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      // 1. Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        // Update user credentials & mark verified
        const { data: updated, error: updateErr } = await supabase
          .from('users')
          .update({
            name: data.name || existing.name,
            phone: data.phone || existing.phone,
            password_hash: data.passwordHash,
            pin_hash: data.pinHash,
            is_verified: true,
            is_locked: false,
            failed_attempts: 0,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (!updateErr && updated) {
          await ensureUserWallet(updated.id);
          return updated as DbUser;
        }
      }

      // 2. Insert fresh user row
      const newId = generateUUID();
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert({
          id: newId,
          email: normalizedEmail,
          name: data.name,
          phone: data.phone,
          avatar_url: '',
          password_hash: data.passwordHash,
          pin_hash: data.pinHash,
          is_verified: true,
          two_factor_enabled: false,
          two_factor_secret: '',
          is_locked: false,
          failed_attempts: 0,
          device_tracking: data.deviceInfo ? [data.deviceInfo] : [],
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (!insertErr && inserted) {
        await ensureUserWallet(inserted.id);
        return inserted as DbUser;
      }
    } catch (err) {
      console.error('[Supabase Server] Database error during createVerifiedUser:', err);
    }
  }

  // In-memory fallback
  const fallback: DbUser = {
    id: generateUUID(),
    email: normalizedEmail,
    name: data.name,
    phone: data.phone,
    avatar_url: '',
    password_hash: data.passwordHash,
    pin_hash: data.pinHash,
    is_verified: true,
    two_factor_enabled: false,
    two_factor_secret: '',
    is_locked: false,
    failed_attempts: 0,
    device_tracking: data.deviceInfo ? [data.deviceInfo] : [],
    created_at: now,
  };
  return fallback;
}

/**
 * Ensures a user has a primary wallet in Supabase.
 */
export async function ensureUserWallet(userId: string): Promise<DbWallet | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingWallet) {
      return existingWallet as DbWallet;
    }

    const now = new Date().toISOString();
    const newWallet = {
      id: generateUUID(),
      user_id: userId,
      balance: 0.0,
      wallet_balance: 0.0,
      reserved_balance: 0.0,
      currency: 'NGN',
      created_at: now,
      updated_at: now,
    };

    const { data: insertedWallet, error } = await supabase
      .from('wallets')
      .insert(newWallet)
      .select('*')
      .single();

    if (error) {
      console.warn('[Supabase Server] ensureUserWallet insert error:', error);
      return null;
    }

    return insertedWallet as DbWallet;
  } catch (err) {
    console.error('[Supabase Server] ensureUserWallet exception:', err);
    return null;
  }
}

/**
 * Retrieves staff profile by email with credentials.
 */
export async function getStaffByEmailWithCredentials(email: string): Promise<DbStaffProfile | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .ilike('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !staff) return null;
    return staff as DbStaffProfile;
  } catch (err) {
    console.error('[Supabase Server] getStaffByEmailWithCredentials exception:', err);
    return null;
  }
}

/**
 * Updates a user's password hash.
 */
export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('[Supabase Server] updateUserPassword error:', err);
    return false;
  }
}

/**
 * Updates a user's transaction PIN hash.
 */
export async function updateUserPin(userId: string, newPinHash: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('users')
      .update({
        pin_hash: newPinHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('[Supabase Server] updateUserPin error:', err);
    return false;
  }
}

/**
 * Updates user account lock status and failed attempts.
 */
export async function updateUserLockStatus(
  userId: string,
  isLocked: boolean,
  failedAttempts: number = 0
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('users')
      .update({
        is_locked: isLocked,
        failed_attempts: failedAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('[Supabase Server] updateUserLockStatus error:', err);
    return false;
  }
}

/**
 * Retrieves a staff profile by ID with credentials.
 */
export async function getStaffByIdWithCredentials(staffId: string): Promise<DbStaffProfile | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', staffId)
      .maybeSingle();

    if (error || !staff) return null;
    return staff as DbStaffProfile;
  } catch (err) {
    console.error('[Supabase Server] getStaffByIdWithCredentials exception:', err);
    return null;
  }
}

/**
 * Retrieves all staff profiles.
 */
export async function getAllStaffProfiles(): Promise<Omit<DbStaffProfile, 'password_hash'>[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const { data: staffList, error } = await supabase
      .from('staff_profiles')
      .select('id, email, name, role, permissions, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error || !staffList) return [];
    return staffList as Omit<DbStaffProfile, 'password_hash'>[];
  } catch (err) {
    console.error('[Supabase Server] getAllStaffProfiles exception:', err);
    return [];
  }
}

/**
 * Counts total active Super Admins in staff_profiles.
 */
export async function countActiveSuperAdmins(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  try {
    const { count, error } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'Super Admin')
      .eq('is_active', true);

    if (error) {
      console.error('[Supabase Server] countActiveSuperAdmins error:', error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('[Supabase Server] countActiveSuperAdmins exception:', err);
    return 0;
  }
}

/**
 * Updates a staff member's password hash.
 */
export async function updateStaffPassword(staffId: string, newPasswordHash: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('staff_profiles')
      .update({
        password_hash: newPasswordHash,
      })
      .eq('id', staffId);

    if (error) {
      console.error('[Supabase Server] updateStaffPassword error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Server] updateStaffPassword exception:', err);
    return false;
  }
}

/**
 * Updates a staff member's role and permissions.
 */
export async function updateStaffRoleAndPermissions(
  staffId: string,
  role: DbStaffProfile['role'],
  permissions: string[]
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('staff_profiles')
      .update({
        role,
        permissions,
      })
      .eq('id', staffId);

    if (error) {
      console.error('[Supabase Server] updateStaffRoleAndPermissions error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Server] updateStaffRoleAndPermissions exception:', err);
    return false;
  }
}

/**
 * Updates a staff member's active status.
 */
export async function updateStaffStatus(staffId: string, isActive: boolean): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('staff_profiles')
      .update({
        is_active: isActive,
      })
      .eq('id', staffId);

    if (error) {
      console.error('[Supabase Server] updateStaffStatus error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Server] updateStaffStatus exception:', err);
    return false;
  }
}

/**
 * Writes an audit log entry to the Supabase database.
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  details: Record<string, any> = {},
  extra?: { ip_address?: string; device_info?: string; staff_id?: string; user_id?: string }
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const finalStaffId = extra?.staff_id || null;
    const finalUserId = extra?.user_id !== undefined ? extra.user_id : (finalStaffId ? null : userId);

    await supabase.from('audit_logs').insert({
      id: generateUUID(),
      user_id: finalUserId,
      staff_id: finalStaffId || (userId && !extra?.user_id ? userId : null),
      action,
      details,
      ip_address: extra?.ip_address || '',
      device_info: extra?.device_info || '',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Server] createAuditLog error:', err);
  }
}
