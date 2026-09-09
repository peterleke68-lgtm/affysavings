import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServerKey =
  process.env.SUPABASE_SERVICE__KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar_url: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string;
  is_locked: boolean;
  failed_attempts: number;
  device_tracking: { id: string; device: string; ip: string; date: string }[];
  created_at: string;
}

export interface DbWallet {
  id: string;
  user_id: string;
  balance: number;
  wallet_balance: number;
  currency: string;
  created_at?: string;
}

function getSupabaseAdminClient() {
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
 * Finds a user by email, or creates a new user in Supabase.
 */
export async function findOrCreateUser(
  email: string,
  extra?: { name?: string; phone?: string; deviceInfo?: any }
): Promise<DbUser> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    try {
      // 1. Try to find existing user
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!findError && existingUser) {
        // If user exists, make sure they are marked verified
        if (!existingUser.is_verified) {
          const { data: updatedUser } = await supabase
            .from('users')
            .update({ is_verified: true, updated_at: new Date().toISOString() })
            .eq('id', existingUser.id)
            .select('*')
            .single();

          if (updatedUser) {
            await ensureUserWallet(updatedUser.id);
            return updatedUser as DbUser;
          }
        }
        await ensureUserWallet(existingUser.id);
        return existingUser as DbUser;
      }

      // 2. Create new user
      const newId = generateUUID();
      const now = new Date().toISOString();
      const newUser: DbUser = {
        id: newId,
        email: normalizedEmail,
        name: extra?.name || normalizedEmail.split('@')[0],
        phone: extra?.phone || '',
        avatar_url: '',
        is_verified: true,
        two_factor_enabled: false,
        two_factor_secret: '',
        is_locked: false,
        failed_attempts: 0,
        device_tracking: extra?.deviceInfo ? [extra.deviceInfo] : [],
        created_at: now,
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          avatar_url: newUser.avatar_url,
          is_verified: newUser.is_verified,
          two_factor_enabled: newUser.two_factor_enabled,
          two_factor_secret: newUser.two_factor_secret,
          is_locked: newUser.is_locked,
          failed_attempts: newUser.failed_attempts,
          device_tracking: newUser.device_tracking,
          created_at: newUser.created_at,
          updated_at: now,
        })
        .select('*')
        .single();

      if (insertError) {
        console.warn('[Supabase Server] Insert user failed (falling back to generated user):', insertError);
      } else if (insertedUser) {
        await ensureUserWallet(insertedUser.id);
        return insertedUser as DbUser;
      }
    } catch (err) {
      console.error('[Supabase Server] Database error during findOrCreateUser:', err);
    }
  }

  // Fallback user object if Supabase is unavailable or errored
  const fallbackUser: DbUser = {
    id: generateUUID(),
    email: normalizedEmail,
    name: extra?.name || normalizedEmail.split('@')[0],
    phone: extra?.phone || '',
    avatar_url: '',
    is_verified: true,
    two_factor_enabled: false,
    two_factor_secret: '',
    is_locked: false,
    failed_attempts: 0,
    device_tracking: extra?.deviceInfo ? [extra.deviceInfo] : [],
    created_at: new Date().toISOString(),
  };

  return fallbackUser;
}

/**
 * Ensures a user has a primary wallet in the Supabase database.
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
 * Retrieves a user by their ID.
 */
export async function getUserById(userId: string): Promise<DbUser | null> {
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
    console.error('[Supabase Server] getUserById exception:', err);
    return null;
  }
}

/**
 * Retrieves a user by their email.
 */
export async function getUserByEmail(email: string): Promise<DbUser | null> {
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
    console.error('[Supabase Server] getUserByEmail exception:', err);
    return null;
  }
}

/**
 * Writes an audit log entry to the Supabase database.
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  details: Record<string, any> = {},
  extra?: { ip_address?: string; device_info?: string }
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    await supabase.from('audit_logs').insert({
      id: generateUUID(),
      user_id: userId,
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
