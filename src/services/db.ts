// AFFYBANK Local Storage Database Driver (Strict Savings Pivot)
import { supabase } from './supabaseClient';

export interface User {
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
  device_tracking: { device: string; ip: string; date: string; id: string }[];
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  wallet_balance: number;
  currency: string;
}

export interface SavingsPlan {
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

export interface FoodPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  items: string[];
  is_available: boolean;
  image_url?: string;
  created_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'Grains & Flours' | 'Oils & Condiments' | 'Proteins & Meat' | 'Packaged & Household';
  unit: string;
  unit_price: number;
  in_stock: boolean;
}

export interface FoodOrder {
  id: string;
  plan_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  order_type: 'preset_package' | 'custom_basket';
  package_id?: string;
  package_name?: string;
  custom_items?: { item_id: string; name: string; unit_price: number; quantity: number }[];
  total_amount: number;
  change_refunded: number;
  delivery_address: string;
  delivery_phone: string;
  delivery_notes?: string;
  status: 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  tracking_code: string;
  courier_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'savings_deposit' | 'savings_withdrawal' | 'etranzact_checkout' | 'penalty_fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  recipient_email?: string;
  recipient_name?: string;
  reference: string;
  category: string;
  description: string;
  created_at: string;
}

export interface LinkedAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
}

export interface Beneficiary {
  id: string;
  user_id: string;
  bank_name?: string;
  account_number: string;
  name: string;
  email?: string;
  created_at: string;
}

export interface SystemNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'in-app' | 'email' | 'whatsapp';
  channel: 'announcement' | 'security' | 'transaction';
  read_at: string | null;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Operations' | 'Customer Support' | 'Compliance' | 'Finance' | 'Content Manager';
  permissions: string[];
  is_active: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: any;
  ip_address: string;
  device_info: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  recipient: string;
  medium: 'Email' | 'WhatsApp';
  type: string;
  content: string;
  timestamp: string;
}

// Seeding CMS settings with strict savings configuration
export const DEFAULT_CMS = {
  hero: {
    title: "Strict Naira Savings & Goal Accelerator",
    subtitle: "Lock savings to prevent impulsive withdrawals, build compound capital with fixed funds, and track your visual goals under security auditing.",
    primaryCta: "Start Strict Saving",
    secondaryCta: "Operator Console",
  },
  branding: {
    primaryColor: "#a855f7",
    primaryColorDark: "#7B2CBF",
    accentColor: "#150a24",
    accentColorDark: "#0d0617",
    textColor: "#1a0f30",
    textColorDark: "#f2edf7",
  },
  savingsConfig: {
    lockedDurationDays: 90, // 3 months
    fixedBreakPenalty: 5,   // 5% early break penalty fee
  },
  directDeposit: {
    bankName: "Opay",
    accountNumber: "8103151999",
    accountName: "AFFY SAVINGS / Support Vault",
    whatsAppNumber: "2348103151999",
    whatsAppMessage: "Hello Support, I have made a bank transfer of \u20a6{amount} for deposit. Please verify and credit my wallet. Email: {email}, Name: {name}, Reference: {reference}."
  },
  features: [
    { id: "1", title: "3-Month Locked Vaults", desc: "Lock capital strictly for 90 days. Withdrawals are physically disabled to enforce absolute wealth preservation.", icon: "Lock" },
    { id: "2", title: "Fixed Time Deposits", desc: "Earn yielding returns towards a maturity date. Early liquidation incurs a customizable 5% breakout penalty.", icon: "Calendar" },
    { id: "3", title: "Visual Goal Targets", desc: "Track goals dynamically (e.g. buying a car) with target progression meters and automatic status logs.", icon: "Target" },
    { id: "4", title: "Audit & Compliance", desc: "Maintain complete transaction ledgers, lock/unlock logs, and operator customization parameters.", icon: "Shield" }
  ],
  faqs: [
    { question: "What is the penalty for breaking a Fixed Savings plan?", answer: "Fixed time plans broken before maturity incur a strict penalty (default 5%) which is deducted from your principal and refunded to your wallet." },
    { question: "Can I break a Locked Savings plan early?", answer: "Locked accounts are non-negotiable and strictly frozen for 3 months to prevent impulsive wealth depletion." },
    { question: "How does the notification system work?", answer: "Any deposit credit or saving transaction triggers immediate simulated Email & WhatsApp alerts." }
  ],
  terms: "AFFY SAVINGS Strict Savings rules enforce strict penalty parameters. All target progressions, compound locked funds, and deactivations are simulated.",
  footer: {
    copyright: "\u00a9 2026 Affy Savings Inc. All rights reserved.",
    links: [
      { name: "About Us", href: "#" },
      { name: "CMS Admin", href: "/admin" },
      { name: "Staff Portal", href: "/staff" }
    ]
  }
};

const USERS_KEY = "affy_users";
const WALLETS_KEY = "affy_wallets";
const SAVINGS_KEY = "affy_savings";
const TRANSACTIONS_KEY = "affy_transactions";
const ACCOUNTS_KEY = "affy_accounts";
const BENEFICIARIES_KEY = "affy_beneficiaries";
const NOTIFICATIONS_KEY = "affy_notifications";
const STAFF_KEY = "affy_staff";
const CMS_KEY = "affy_cms";
const AUDIT_LOGS_KEY = "affy_audit_logs";
const SIM_NOTIFICATIONS_KEY = "affy_sim_notifications_log";
const CURRENT_USER_KEY = "affy_current_user";
const CURRENT_STAFF_KEY = "affy_current_staff";
const FOOD_PACKAGES_KEY = "affy_food_packages";
const FOOD_ITEMS_KEY = "affy_food_items";
const FOOD_ORDERS_KEY = "affy_food_orders";

export const DEFAULT_FOOD_PACKAGES: FoodPackage[] = [
  {
    id: "pkg-essential-grain",
    name: "Essential Grain & Staples Bundle",
    description: "Ideal for basic household sustenance. Covers essential carbohydrates and cooking staples.",
    price: 50000,
    items: [
      "1x 25kg Long Grain Rice (Foreign Parboiled)",
      "1x 10kg Brown Honey Beans",
      "1x 5L Pure Vegetable Cooking Oil",
      "1x Pack Seasoning Cubes & Table Salt"
    ],
    is_available: true,
    created_at: new Date().toISOString()
  },
  {
    id: "pkg-family-nutrition",
    name: "Family Nutrition & Pantry Hamper",
    description: "Complete balanced food stock for medium-sized families with quality grains and protein staples.",
    price: 100000,
    items: [
      "1x 50kg Premium Long Grain Rice",
      "1x 25kg White Ijebu Garri",
      "1x 10L Pure Vegetable Oil",
      "2x Cartons Indomie Instant Noodles (70g x 40)",
      "1x Carton Gino Tomato Paste (50 sachets)",
      "1x 5kg Refined Granulated Sugar"
    ],
    is_available: true,
    created_at: new Date().toISOString()
  },
  {
    id: "pkg-mega-wholesale",
    name: "Mega Festive Wholesale Reserve Crate",
    description: "Bulk wholesale food reserve for extended periods or festive celebrations. Maximum quantity value.",
    price: 250000,
    items: [
      "2x 50kg Royal Stallion Rice",
      "1x 50kg Maiduguri Brown Beans",
      "1x 50kg Fine White Garri",
      "1x 25L Keg Pure Groundnut Oil",
      "4x Cartons Instant Noodles",
      "2x Crates Canned Mackerel Sardines",
      "1x Crate Golden Penny Semovita (10kg x 2)"
    ],
    is_available: true,
    created_at: new Date().toISOString()
  }
];

export const DEFAULT_FOOD_ITEMS: FoodItem[] = [
  { id: "item-1", name: "Royal Long Grain Rice (50kg Bag)", category: "Grains & Flours", unit: "50kg Bag", unit_price: 80000, in_stock: true },
  { id: "item-2", name: "Royal Long Grain Rice (25kg Bag)", category: "Grains & Flours", unit: "25kg Bag", unit_price: 42000, in_stock: true },
  { id: "item-3", name: "Brown Oloyin Honey Beans (50kg Bag)", category: "Grains & Flours", unit: "50kg Bag", unit_price: 65000, in_stock: true },
  { id: "item-4", name: "Premium Ijebu Garri (25kg Bag)", category: "Grains & Flours", unit: "25kg Bag", unit_price: 24000, in_stock: true },
  { id: "item-5", name: "Golden Penny Semovita (10kg Bag)", category: "Grains & Flours", unit: "10kg Bag", unit_price: 15500, in_stock: true },
  { id: "item-6", name: "Pure King's Vegetable Oil (25L Keg)", category: "Oils & Condiments", unit: "25L Keg", unit_price: 48000, in_stock: true },
  { id: "item-7", name: "Pure King's Vegetable Oil (5L Gallon)", category: "Oils & Condiments", unit: "5L Gallon", unit_price: 11000, in_stock: true },
  { id: "item-8", name: "Gino Pepper & Onion Tomato Paste", category: "Oils & Condiments", unit: "Carton of 50", unit_price: 16500, in_stock: true },
  { id: "item-9", name: "Knorr Chicken Seasoning Cubes", category: "Oils & Condiments", unit: "Pack of 50", unit_price: 3800, in_stock: true },
  { id: "item-10", name: "Indomie Onion Chicken Noodles (70g x 40)", category: "Packaged & Household", unit: "Carton of 40", unit_price: 10500, in_stock: true },
  { id: "item-11", name: "Refined Granulated White Sugar (50kg Bag)", category: "Packaged & Household", unit: "50kg Bag", unit_price: 72000, in_stock: true },
  { id: "item-12", name: "Premium Dried Stockfish & Crayfish Share", category: "Proteins & Meat", unit: "Packaged Bundle", unit_price: 28000, in_stock: true },
  { id: "item-13", name: "Farm Ram / Goat Meat Portion (Vacuum Packed)", category: "Proteins & Meat", unit: "10kg Frozen Box", unit_price: 45000, in_stock: true }
];

const getStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(data);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
    // Trigger background sync to Supabase
    syncToSupabase(key, value);
  }
};

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Detailed Supabase error logger
const logSupabaseError = (context: string, error: any) => {
  if (!error) return;

  const code = error?.code || error?.status;
  const rawMsg = error?.message || error?.details || error?.hint || (typeof error === 'string' ? error : '');
  const message = String(rawMsg).toLowerCase();

  // 1. Missing table / relation errors (schema not yet applied)
  const isTableMissing =
    code === 'PGRST205' ||    // PostgREST: could not find the relation
    code === 'PGRST204' ||    // PostgREST: could not find a relationship
    code === '42P01' ||       // PostgreSQL: undefined_table
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes('not found') ||
    error?.status === 404;    // HTTP 404 from REST proxy

  if (isTableMissing) {
    if (!logSupabaseError._warnedTables) logSupabaseError._warnedTables = new Set();
    if (!logSupabaseError._warnedTables.has(context)) {
      logSupabaseError._warnedTables.add(context);
      console.warn(`[Supabase] Table not found for "${context}". Run supabase/schema.sql in your Supabase SQL Editor to create missing tables.`);
    }
    return;
  }

  // 2. RLS Policy / Unauthenticated Guest Permission errors (Security Working as Designed)
  const isRLSPermissionDenied =
    code === '42501' ||       // PostgreSQL: insufficient_privilege / RLS violation
    code === 'PGRST301' ||    // PostgREST: JWT unauthorized
    error?.status === 401 ||
    error?.status === 403 ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('violates row-level security');

  if (isRLSPermissionDenied) {
    if (!logSupabaseError._warnedRLS) logSupabaseError._warnedRLS = new Set();
    if (!logSupabaseError._warnedRLS.has(context)) {
      logSupabaseError._warnedRLS.add(context);
      console.info(`[Supabase] Guest notice for "${context}": RLS policies active. User login required for remote data sync.`);
    }
    return;
  }

  const errOutput = {
    message: error?.message || error?.details || error?.hint || 'Supabase request returned error status',
    code: error?.code || error?.status || 'UNKNOWN',
    details: error?.details || null,
    hint: error?.hint || null,
  };

  console.error(`[Supabase] Error in ${context}:`, errOutput);
};
// Attach mutable properties for tracking warned contexts
logSupabaseError._warnedTables = new Set<string>() as Set<string>;
logSupabaseError._warnedRLS = new Set<string>() as Set<string>;

export const syncToSupabase = async (key: string, data: any) => {
  if (!supabase) return;

  try {
    // Skip remote database sync for protected tables if user is not authenticated
    if (key !== CMS_KEY) {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData?.session) return;
    }

    if (key === USERS_KEY) {
      const { error } = await supabase.from('users').upsert(data as any);
      if (error) logSupabaseError('sync users', error);
    } else if (key === WALLETS_KEY) {
      const { error } = await supabase.from('wallets').upsert(data as any);
      if (error) logSupabaseError('sync wallets', error);
    } else if (key === SAVINGS_KEY) {
      const { error } = await supabase.from('savings_plans').upsert(data as any);
      if (error) logSupabaseError('sync savings_plans', error);
    } else if (key === TRANSACTIONS_KEY) {
      const { error } = await supabase.from('transactions').upsert(data as any);
      if (error) logSupabaseError('sync transactions', error);
    } else if (key === ACCOUNTS_KEY) {
      const { error } = await supabase.from('linked_accounts').upsert(data as any);
      if (error) logSupabaseError('sync linked_accounts', error);
    } else if (key === BENEFICIARIES_KEY) {
      const { error } = await supabase.from('beneficiaries').upsert(data as any);
      if (error) logSupabaseError('sync beneficiaries', error);
    } else if (key === NOTIFICATIONS_KEY) {
      const { error } = await supabase.from('notifications').upsert(data as any);
      if (error) logSupabaseError('sync notifications', error);
    } else if (key === STAFF_KEY) {
      const { error } = await supabase.from('staff_profiles').upsert(data as any);
      if (error) logSupabaseError('sync staff_profiles', error);
    } else if (key === CMS_KEY) {
      const { error } = await supabase.from('cms_settings').upsert({ key: 'config', value: data } as any);
      if (error) logSupabaseError('sync cms_settings', error);
    } else if (key === AUDIT_LOGS_KEY) {
      const formattedLogs = data.map((log: any) => ({
        id: log.id,
        user_id: log.user_id,
        action: log.action,
        details: log.details,
        ip_address: log.ip_address,
        device_info: log.device_info,
        created_at: log.created_at
      }));
      const { error } = await supabase.from('audit_logs').upsert(formattedLogs as any);
      if (error) logSupabaseError('sync audit_logs', error);
    }
  } catch (e) {
    console.error("[Supabase] Sync exception:", e);
  }
};

export const pullFromSupabase = async () => {
  if (!supabase) return;
  
  try {
    const { data: authData } = await supabase.auth.getSession();
    const isAuthenticated = !!authData?.session;

    // Only pull/push protected data if user is authenticated with Supabase
    if (isAuthenticated) {
      // 1. Sync Users
      const { data: remoteUsers, error: usersErr } = await supabase.from('users').select('*');
      if (!usersErr && remoteUsers && remoteUsers.length > 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify(remoteUsers));
      }

      // 2. Sync Wallets
      const { data: remoteWallets, error: walletsErr } = await supabase.from('wallets').select('*');
      if (!walletsErr && remoteWallets && remoteWallets.length > 0) {
        localStorage.setItem(WALLETS_KEY, JSON.stringify(remoteWallets));
      }

      // 3. Sync Savings
      const { data: remoteSavings, error: savingsErr } = await supabase.from('savings_plans').select('*');
      if (!savingsErr && remoteSavings && remoteSavings.length > 0) {
        localStorage.setItem(SAVINGS_KEY, JSON.stringify(remoteSavings));
      }

      // 4. Sync Transactions
      const { data: remoteTransactions, error: txErr } = await supabase.from('transactions').select('*');
      if (!txErr && remoteTransactions && remoteTransactions.length > 0) {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(remoteTransactions));
      }

      // 5. Sync Accounts
      const { data: remoteAccounts, error: acctErr } = await supabase.from('linked_accounts').select('*');
      if (!acctErr && remoteAccounts && remoteAccounts.length > 0) {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(remoteAccounts));
      }

      // 6. Sync Beneficiaries
      const { data: remoteBeneficiaries, error: benErr } = await supabase.from('beneficiaries').select('*');
      if (!benErr && remoteBeneficiaries && remoteBeneficiaries.length > 0) {
        localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(remoteBeneficiaries));
      }

      // 7. Sync Notifications
      const { data: remoteNotifications, error: notifErr } = await supabase.from('notifications').select('*');
      if (!notifErr && remoteNotifications && remoteNotifications.length > 0) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(remoteNotifications));
      }

      // 8. Sync Staff
      const { data: remoteStaff, error: staffErr } = await supabase.from('staff_profiles').select('*');
      if (!staffErr && remoteStaff && remoteStaff.length > 0) {
        localStorage.setItem(STAFF_KEY, JSON.stringify(remoteStaff));
      }

      // 9. Sync Audits
      const { data: remoteAudit, error: auditErr } = await supabase.from('audit_logs').select('*');
      if (!auditErr && remoteAudit && remoteAudit.length > 0) {
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(remoteAudit));
      }
    }

    // CMS Settings (public config table)
    const { data: remoteCMS, error: cmsErr } = await supabase.from('cms_settings').select('*');
    if (!cmsErr && remoteCMS && (remoteCMS as any[]).length > 0) {
      const configItem = (remoteCMS as any[]).find((item: any) => item.key === 'config');
      if (configItem && configItem.value) {
        localStorage.setItem(CMS_KEY, JSON.stringify(configItem.value));
      }
    }
  } catch (e) {
    console.warn("[Supabase] Remote sync skipped:", e);
  }
};

export const initializeDB = () => {
  if (typeof window === "undefined") return;

  // Trigger a storage reset so that existing local database seeds are cleared and reset to zero.
  if (!localStorage.getItem("affy_v4_uuid_reset")) {
    localStorage.removeItem(WALLETS_KEY);
    localStorage.removeItem(SAVINGS_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem("affy_v4_uuid_reset", "true");
  }

  // Run migrations for existing users/staff to change email domain to @affysavings.com
  const existingUsers = getStorage<User[]>(USERS_KEY, []);
  if (existingUsers.length > 0 && existingUsers.some(u => u.email.endsWith('@affybank.com'))) {
    const updatedUsers = existingUsers.map(u => ({
      ...u,
      email: u.email.replace('@affybank.com', '@affysavings.com')
    }));
    setStorage(USERS_KEY, updatedUsers);
  }

  const existingStaff = getStorage<StaffProfile[]>(STAFF_KEY, []);
  if (existingStaff.length > 0 && existingStaff.some(s => s.email.endsWith('@affybank.com'))) {
    const updatedStaff = existingStaff.map(s => ({
      ...s,
      email: s.email.replace('@affybank.com', '@affysavings.com')
    }));
    setStorage(STAFF_KEY, updatedStaff);
  }

  const users = getStorage<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    const customerId = "d29078f4-6c32-4ca6-a5db-2b5003661234";
    const newUsers: User[] = [
      {
        id: customerId,
        email: "customer@affysavings.com",
        name: "Jane Doe",
        phone: "+1 (555) 123-4567",
        avatar_url: "",
        is_verified: true,
        two_factor_enabled: false,
        two_factor_secret: "SECRET123",
        is_locked: false,
        failed_attempts: 0,
        device_tracking: [
          { id: "1", device: "Chrome / Windows 11", ip: "192.168.1.100", date: new Date().toISOString() }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: "e3c1a357-19aa-4ab5-950c-99d9b626e828",
        email: "admin@affysavings.com",
        name: "Super Admin",
        phone: "+1 (555) 999-0000",
        avatar_url: "",
        is_verified: true,
        two_factor_enabled: false,
        two_factor_secret: "",
        is_locked: false,
        failed_attempts: 0,
        device_tracking: [],
        created_at: new Date().toISOString()
      }
    ];
    setStorage(USERS_KEY, newUsers);

    // Seed Wallet for customer
    const newWallets: Wallet[] = [
      {
        id: "0b6c24be-0720-43db-9d8e-5b1234e56789",
        user_id: customerId,
        balance: 0.00,
        wallet_balance: 0.00, // tracks fluid cash available
        currency: "NGN"
      }
    ];
    setStorage(WALLETS_KEY, newWallets);

    // Seed Strict Savings Plans (Empty at default for zero balance)
    const newSavings: SavingsPlan[] = [];
    setStorage(SAVINGS_KEY, newSavings);

    // Seed initial Transactions (Empty at default for zero balance)
    const newTransactions: Transaction[] = [];
    setStorage(TRANSACTIONS_KEY, newTransactions);

    // Seed Linked Accounts
    const newAccounts: LinkedAccount[] = [
      {
        id: "948fa886-fca9-482a-a92c-55b6efdf4001",
        user_id: customerId,
        bank_name: "Chase Bank",
        account_number: "**** 4829",
        account_holder: "Jane Doe",
        is_default: true,
        status: "verified",
        created_at: new Date().toISOString()
      }
    ];
    setStorage(ACCOUNTS_KEY, newAccounts);
  }

  // Seed Staff
  const staff = getStorage<StaffProfile[]>(STAFF_KEY, []);
  if (staff.length === 0) {
    const defaultStaff: StaffProfile[] = [
      { id: "b361a357-19aa-4ab5-950c-99d9b626e821", email: "admin@affysavings.com", name: "Super Admin", role: "Super Admin", permissions: ["all"], is_active: true },
      { id: "b361a357-19aa-4ab5-950c-99d9b626e822", email: "operations@affysavings.com", name: "Sarah Connor", role: "Operations", permissions: ["manage_users", "approve_accounts"], is_active: true },
      { id: "b361a357-19aa-4ab5-950c-99d9b626e823", email: "support@affysavings.com", name: "John Doe", role: "Customer Support", permissions: ["view_users", "view_transactions"], is_active: true },
      { id: "b361a357-19aa-4ab5-950c-99d9b626e824", email: "compliance@affysavings.com", name: "Robert Miller", role: "Compliance", permissions: ["review_transactions", "view_audit_logs"], is_active: true },
      { id: "b361a357-19aa-4ab5-950c-99d9b626e825", email: "finance@affysavings.com", name: "Alice Smith", role: "Finance", permissions: ["approve_transactions", "view_metrics"], is_active: true }
    ];
    setStorage(STAFF_KEY, defaultStaff);
  }

  // Seed CMS Settings (with migration for directDeposit config if missing)
  const currentCms = getStorage<any>(CMS_KEY, DEFAULT_CMS);
  if (!currentCms.directDeposit) {
    const mergedCms = { ...DEFAULT_CMS, ...currentCms, directDeposit: DEFAULT_CMS.directDeposit };
    setStorage(CMS_KEY, mergedCms);
  } else {
    // Just ensure it is initialized
    setStorage(CMS_KEY, currentCms);
  }

  // Seed system announcements
  const notifications = getStorage<SystemNotification[]>(NOTIFICATIONS_KEY, []);
  if (notifications.length === 0) {
    const defaultNotifications: SystemNotification[] = [
      {
        id: "not-1",
        user_id: null,
        title: "Strict Savings Enforced",
        message: "Your capital accelerator vault is initialized. Build smart goals.",
        type: "in-app",
        channel: "announcement",
        read_at: null,
        created_at: new Date().toISOString()
      }
    ];
    setStorage(NOTIFICATIONS_KEY, defaultNotifications);
  }

  // Seed default food packages
  const existingPackages = getStorage<FoodPackage[]>(FOOD_PACKAGES_KEY, []);
  if (existingPackages.length === 0) {
    setStorage(FOOD_PACKAGES_KEY, DEFAULT_FOOD_PACKAGES);
  }

  // Seed default food items
  const existingItems = getStorage<FoodItem[]>(FOOD_ITEMS_KEY, []);
  if (existingItems.length === 0) {
    setStorage(FOOD_ITEMS_KEY, DEFAULT_FOOD_ITEMS);
  }
};

export const logSimulation = (medium: 'Email' | 'WhatsApp', type: string, recipient: string, content: string) => {
  const logs = getStorage<NotificationLog[]>(SIM_NOTIFICATIONS_KEY, []);
  const newLog: NotificationLog = {
    id: `sim-${Math.random().toString(36).substr(2, 9)}`,
    recipient,
    medium,
    type,
    content,
    timestamp: new Date().toLocaleTimeString()
  };
  logs.unshift(newLog);
  setStorage(SIM_NOTIFICATIONS_KEY, logs.slice(0, 50));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sim_notification_triggered"));
  }
};

export const getSimulationLogs = (): NotificationLog[] => {
  return getStorage<NotificationLog[]>(SIM_NOTIFICATIONS_KEY, []);
};

export const clearSimulationLogs = (): void => {
  setStorage(SIM_NOTIFICATIONS_KEY, []);
};

export const DB = {
  getCurrentUser: (): User | null => getStorage<User | null>(CURRENT_USER_KEY, null),
  setCurrentUser: (user: User | null): void => setStorage(CURRENT_USER_KEY, user),
  getCurrentStaff: (): StaffProfile | null => getStorage<StaffProfile | null>(CURRENT_STAFF_KEY, null),
  setCurrentStaff: (staff: StaffProfile | null): void => setStorage(CURRENT_STAFF_KEY, staff),

  getUsers: (): User[] => getStorage<User[]>(USERS_KEY, []),
  saveUsers: (users: User[]) => setStorage(USERS_KEY, users),

  getCMS: (): typeof DEFAULT_CMS => getStorage<typeof DEFAULT_CMS>(CMS_KEY, DEFAULT_CMS),
  saveCMS: (cms: typeof DEFAULT_CMS) => {
    setStorage(CMS_KEY, cms);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cms_updated"));
    }
  },

  getWallets: (): Wallet[] => getStorage<Wallet[]>(WALLETS_KEY, []),
  getWalletForUser: (userId: string): Wallet => {
    const wallets = getStorage<Wallet[]>(WALLETS_KEY, []);
    let wallet = wallets.find(w => w.user_id === userId);
    if (!wallet) {
      wallet = {
        id: generateUUID(),
        user_id: userId,
        balance: 0.00,
        wallet_balance: 0.00,
        currency: "NGN"
      };
      wallets.push(wallet);
      setStorage(WALLETS_KEY, wallets);
    }

    // Calculate dynamically from transactions
    const transactions = getStorage<Transaction[]>(TRANSACTIONS_KEY, []);
    const userTxs = transactions.filter(t => t.user_id === userId && t.status === 'completed');
    let fluidBalance = 0;
    userTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (['deposit', 'transfer_received', 'savings_withdrawal', 'etranzact_checkout'].includes(t.type)) {
        fluidBalance += amt;
      } else if (['withdrawal', 'transfer_sent', 'savings_deposit', 'penalty_fee'].includes(t.type)) {
        fluidBalance -= amt;
      }
    });

    wallet.wallet_balance = fluidBalance;

    // Calculate total balance = fluidBalance + active/completed savings plans
    const savings = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const activeSavings = savings.filter(s => s.user_id === userId && (s.status === 'active' || s.status === 'completed'));
    const totalSavings = activeSavings.reduce((sum, s) => sum + (Number(s.saved_amount) || 0), 0);
    wallet.balance = fluidBalance + totalSavings;

    // Sync back cache to storage
    const idx = wallets.findIndex(w => w.id === wallet!.id);
    if (idx !== -1) {
      wallets[idx] = wallet;
      setStorage(WALLETS_KEY, wallets);
    }

    return wallet;
  },
  saveWallet: (wallet: Wallet) => {
    const wallets = getStorage<Wallet[]>(WALLETS_KEY, []);
    const idx = wallets.findIndex(w => w.id === wallet.id);
    if (idx !== -1) {
      wallets[idx] = wallet;
    }
    setStorage(WALLETS_KEY, wallets);
  },

  // STRICT SAVINGS PLANS OPERATIONS
  getSavingsPlans: (): SavingsPlan[] => getStorage<SavingsPlan[]>(SAVINGS_KEY, []),
  saveSavingsPlans: (plans: SavingsPlan[]) => setStorage(SAVINGS_KEY, plans),
  
  createSavingsPlan: (userId: string, name: string, type: 'locked' | 'fixed' | 'target' | 'food', targetAmount: number, durationDays: number): SavingsPlan => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const newPlan: SavingsPlan = {
      id: generateUUID(),
      user_id: userId,
      type,
      name,
      saved_amount: 0.00,
      target_amount: targetAmount,
      end_date: new Date(Date.now() + 86400000 * durationDays).toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };
    plans.push(newPlan);
    setStorage(SAVINGS_KEY, plans);
    return newPlan;
  },

  depositToSavingsPlan: (planId: string, amount: number): { success: boolean; error?: string; plan?: SavingsPlan } => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const planIdx = plans.findIndex(p => p.id === planId);
    if (planIdx === -1) return { success: false, error: "Savings plan not found." };
    
    const plan = plans[planIdx];
    const wallets = getStorage<Wallet[]>(WALLETS_KEY, []);
    const wallet = wallets.find(w => w.user_id === plan.user_id);
    
    if (!wallet) return { success: false, error: "Funding wallet not found." };
    if (wallet.wallet_balance < amount) return { success: false, error: "Insufficient wallet balance." };

    // Deduct from wallet and add to savings
    wallet.wallet_balance -= amount;
    plan.saved_amount += amount;

    // Check if target met
    if (plan.type === 'target' && plan.saved_amount >= plan.target_amount) {
      plan.status = 'completed';
    }

    plans[planIdx] = plan;
    setStorage(SAVINGS_KEY, plans);
    setStorage(WALLETS_KEY, wallets);

    // Log transaction
    DB.addTransaction({
      user_id: plan.user_id,
      wallet_id: wallet.id,
      type: 'savings_deposit',
      amount,
      status: 'completed',
      reference: `TX-SAV-${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'transfer',
      description: `Funded ₦${amount.toFixed(2)} to savings: "${plan.name}"`
    });

    const user = DB.getUsers().find(u => u.id === plan.user_id);
    if (user) {
      // Trigger alerts after deposit/crediting
      logSimulation(
        'Email',
        'Savings Credited Alert',
        user.email,
        `Hi ${user.name},\n\nWe confirm a deposit of ₦${amount.toFixed(2)} into your savings plan "${plan.name}".\n\nTotal Saved: ₦${plan.saved_amount.toFixed(2)} / Goal: ₦${plan.target_amount.toFixed(2)}.`
      );
      logSimulation(
        'WhatsApp',
        'Savings Deposit Alert',
        user.phone || '+1 (555) 123-4567',
        `Affy Savings: Funded ₦${amount.toFixed(2)} into "${plan.name}". Saved: ₦${plan.saved_amount.toFixed(2)}.`
      );
    }

    return { success: true, plan };
  },

  breakSavingsPlan: (planId: string): { success: boolean; error?: string; refunded?: number; penalty?: number } => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const planIdx = plans.findIndex(p => p.id === planId);
    if (planIdx === -1) return { success: false, error: "Savings plan not found." };

    const plan = plans[planIdx];
    if (plan.status !== 'active') return { success: false, error: "Plan is already inactive." };

    const cms = DB.getCMS();
    const now = new Date();
    const endDate = new Date(plan.end_date);
    const isMatured = now >= endDate;

    // Check locked savings rules: Cannot break before end_date under any condition
    if (plan.type === 'locked' && !isMatured) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
      return { 
        success: false, 
        error: `Strict Lockout Rules Enforced! You cannot break this account for another ${daysLeft} days.` 
      };
    }

    const wallets = getStorage<Wallet[]>(WALLETS_KEY, []);
    const wallet = wallets.find(w => w.user_id === plan.user_id);
    if (!wallet) return { success: false, error: "Refund wallet not found." };

    let penaltyAmount = 0;
    const principal = plan.saved_amount;

    // Check Fixed & Food plan penalty rules: Deduct penalty fee if broken early
    if ((plan.type === 'fixed' || plan.type === 'food') && !isMatured) {
      const penaltyPct = cms.savingsConfig?.fixedBreakPenalty || 5;
      penaltyAmount = principal * (penaltyPct / 100);
    }

    const refundAmount = principal - penaltyAmount;

    // Transfer back to liquid wallet balance
    wallet.wallet_balance += refundAmount;
    plan.saved_amount = 0;
    plan.status = penaltyAmount > 0 ? 'broken' : 'completed';

    plans[planIdx] = plan;
    setStorage(SAVINGS_KEY, plans);
    setStorage(WALLETS_KEY, wallets);

    // Log transaction
    DB.addTransaction({
      user_id: plan.user_id,
      wallet_id: wallet.id,
      type: 'savings_withdrawal',
      amount: refundAmount,
      status: 'completed',
      reference: `TX-BRK-${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'transfer',
      description: `Liquidated savings "${plan.name}"${penaltyAmount > 0 ? ` (Deducted 5% penalty: ₦${penaltyAmount.toFixed(2)})` : ''}`
    });

    const user = DB.getUsers().find(u => u.id === plan.user_id);
    if (user) {
      // Trigger alerts after cash credit
      logSimulation(
        'Email',
        'Savings Liquidated / Broken Alert',
        user.email,
        `Hi ${user.name},\n\nYour savings plan "${plan.name}" has been liquidated.\n\nPrincipal: ₦${principal.toFixed(2)}\nPenalty Charged: ₦${penaltyAmount.toFixed(2)}\nAmount Credited to Wallet: ₦${refundAmount.toFixed(2)}.`
      );
      logSimulation(
        'WhatsApp',
        'Savings Broken Alert',
        user.phone || '+1 (555) 123-4567',
        `Affy Savings: Liquidated "${plan.name}". Refunded to wallet: ₦${refundAmount.toFixed(2)}.${penaltyAmount > 0 ? ` (Penalty: ₦${penaltyAmount.toFixed(2)})` : ''}`
      );
    }

    return { success: true, refunded: refundAmount, penalty: penaltyAmount };
  },

  // FOOD RESERVE PACKAGES, INVENTORY & ORDERS OPERATIONS
  getFoodPackages: (): FoodPackage[] => getStorage<FoodPackage[]>(FOOD_PACKAGES_KEY, DEFAULT_FOOD_PACKAGES),
  saveFoodPackages: (packages: FoodPackage[]) => setStorage(FOOD_PACKAGES_KEY, packages),

  createFoodPackage: (pkg: Omit<FoodPackage, 'id' | 'created_at'>): FoodPackage => {
    const list = getStorage<FoodPackage[]>(FOOD_PACKAGES_KEY, DEFAULT_FOOD_PACKAGES);
    const newPkg: FoodPackage = {
      ...pkg,
      id: `pkg-${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString()
    };
    list.push(newPkg);
    setStorage(FOOD_PACKAGES_KEY, list);
    return newPkg;
  },

  updateFoodPackage: (id: string, updates: Partial<FoodPackage>): boolean => {
    const list = getStorage<FoodPackage[]>(FOOD_PACKAGES_KEY, DEFAULT_FOOD_PACKAGES);
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    setStorage(FOOD_PACKAGES_KEY, list);
    return true;
  },

  deleteFoodPackage: (id: string): boolean => {
    const list = getStorage<FoodPackage[]>(FOOD_PACKAGES_KEY, DEFAULT_FOOD_PACKAGES);
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length === list.length) return false;
    setStorage(FOOD_PACKAGES_KEY, filtered);
    return true;
  },

  getFoodItems: (): FoodItem[] => getStorage<FoodItem[]>(FOOD_ITEMS_KEY, DEFAULT_FOOD_ITEMS),
  saveFoodItems: (items: FoodItem[]) => setStorage(FOOD_ITEMS_KEY, items),

  createFoodItem: (item: Omit<FoodItem, 'id'>): FoodItem => {
    const list = getStorage<FoodItem[]>(FOOD_ITEMS_KEY, DEFAULT_FOOD_ITEMS);
    const newItem: FoodItem = {
      ...item,
      id: `item-${Math.random().toString(36).substring(2, 9)}`
    };
    list.push(newItem);
    setStorage(FOOD_ITEMS_KEY, list);
    return newItem;
  },

  updateFoodItem: (id: string, updates: Partial<FoodItem>): boolean => {
    const list = getStorage<FoodItem[]>(FOOD_ITEMS_KEY, DEFAULT_FOOD_ITEMS);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    setStorage(FOOD_ITEMS_KEY, list);
    return true;
  },

  deleteFoodItem: (id: string): boolean => {
    const list = getStorage<FoodItem[]>(FOOD_ITEMS_KEY, DEFAULT_FOOD_ITEMS);
    const filtered = list.filter(i => i.id !== id);
    if (filtered.length === list.length) return false;
    setStorage(FOOD_ITEMS_KEY, filtered);
    return true;
  },

  getFoodOrders: (): FoodOrder[] => getStorage<FoodOrder[]>(FOOD_ORDERS_KEY, []),
  saveFoodOrders: (orders: FoodOrder[]) => setStorage(FOOD_ORDERS_KEY, orders),

  updateFoodOrderStatus: (orderId: string, status: FoodOrder['status'], trackingNotes?: string): boolean => {
    const orders = getStorage<FoodOrder[]>(FOOD_ORDERS_KEY, []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;

    orders[idx].status = status;
    orders[idx].updated_at = new Date().toISOString();
    if (trackingNotes) {
      orders[idx].courier_notes = trackingNotes;
    }
    setStorage(FOOD_ORDERS_KEY, orders);

    const order = orders[idx];
    // Trigger in-app notification & alert
    DB.addInAppNotification(
      order.user_id,
      `Food Order ${order.id} Updated`,
      `Your delivery status is now "${status.toUpperCase()}". ${trackingNotes ? `Courier Notes: ${trackingNotes}` : ''}`,
      'transaction'
    );

    logSimulation(
      'Email',
      'Food Order Delivery Status Update',
      order.user_email,
      `Hi ${order.user_name},\n\nYour Food Reserve order (${order.id}) status has updated to: ${status.toUpperCase()}.\n\nTracking Code: ${order.tracking_code}\nDelivery Address: ${order.delivery_address}${trackingNotes ? `\nCourier Updates: ${trackingNotes}` : ''}`
    );

    logSimulation(
      'WhatsApp',
      'Delivery Update',
      order.delivery_phone,
      `Affy Savings: Food Order ${order.id} status is now ${status.toUpperCase()}! Tracking: ${order.tracking_code}.`
    );

    return true;
  },

  redeemFoodReserve: (params: {
    planId: string;
    orderType: 'preset_package' | 'custom_basket';
    packageId?: string;
    customItems?: { itemId: string; quantity: number }[];
    deliveryAddress: string;
    deliveryPhone: string;
    deliveryNotes?: string;
  }): { success: boolean; error?: string; order?: FoodOrder; changeRefunded?: number } => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const planIdx = plans.findIndex(p => p.id === params.planId);
    if (planIdx === -1) return { success: false, error: "Savings plan not found." };
    const plan = plans[planIdx];

    if (plan.type !== 'food') return { success: false, error: "This plan is not a Food Reserve." };
    if (plan.status !== 'active') return { success: false, error: "This plan is no longer active." };

    const users = getStorage<User[]>(USERS_KEY, []);
    const user = users.find(u => u.id === plan.user_id);
    if (!user) return { success: false, error: "User account not found." };

    const wallets = getStorage<Wallet[]>(WALLETS_KEY, []);
    const wallet = wallets.find(w => w.user_id === plan.user_id);
    if (!wallet) return { success: false, error: "User wallet not found." };

    let totalCost = 0;
    let packageName = '';
    const customItemsDetail: { item_id: string; name: string; unit_price: number; quantity: number }[] = [];

    if (params.orderType === 'preset_package') {
      const packages = DB.getFoodPackages();
      const pkg = packages.find(p => p.id === params.packageId);
      if (!pkg) return { success: false, error: "Selected food package not found." };
      if (!pkg.is_available) return { success: false, error: "Selected package is currently out of stock." };
      if (pkg.price > plan.saved_amount) {
        return { success: false, error: `Saved balance (₦${plan.saved_amount.toLocaleString()}) is less than package cost (₦${pkg.price.toLocaleString()}).` };
      }
      totalCost = pkg.price;
      packageName = pkg.name;
    } else {
      const items = DB.getFoodItems();
      if (!params.customItems || params.customItems.length === 0) {
        return { success: false, error: "Custom basket cannot be empty." };
      }
      for (const ci of params.customItems) {
        if (ci.quantity <= 0) continue;
        const itm = items.find(i => i.id === ci.itemId);
        if (!itm) continue;
        const itemTotal = itm.unit_price * ci.quantity;
        totalCost += itemTotal;
        customItemsDetail.push({
          item_id: itm.id,
          name: `${itm.name} (${itm.unit})`,
          unit_price: itm.unit_price,
          quantity: ci.quantity
        });
      }
      if (customItemsDetail.length === 0) {
        return { success: false, error: "No valid items in custom basket." };
      }
      if (totalCost > plan.saved_amount) {
        return { success: false, error: `Basket total (₦${totalCost.toLocaleString()}) exceeds saved balance (₦${plan.saved_amount.toLocaleString()}).` };
      }
    }

    const changeRefunded = Math.max(0, plan.saved_amount - totalCost);
    if (changeRefunded > 0) {
      wallet.wallet_balance += changeRefunded;
      setStorage(WALLETS_KEY, wallets);

      DB.addTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'transfer_received',
        amount: changeRefunded,
        status: 'completed',
        reference: `TX-FREF-${Math.floor(10000 + Math.random() * 90000)}`,
        category: 'savings',
        description: `Surplus balance refund from Food Reserve "${plan.name}" redemption`
      });
    }

    // Mark plan completed
    plan.saved_amount = 0;
    plan.status = 'completed';
    plans[planIdx] = plan;
    setStorage(SAVINGS_KEY, plans);

    // Create Order
    const orders = DB.getFoodOrders();
    const newOrder: FoodOrder = {
      id: `ORD-FD-${Math.floor(100000 + Math.random() * 900000)}`,
      plan_id: plan.id,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      order_type: params.orderType,
      package_id: params.packageId,
      package_name: packageName || undefined,
      custom_items: customItemsDetail.length > 0 ? customItemsDetail : undefined,
      total_amount: totalCost,
      change_refunded: changeRefunded,
      delivery_address: params.deliveryAddress,
      delivery_phone: params.deliveryPhone,
      delivery_notes: params.deliveryNotes || '',
      status: 'pending',
      tracking_code: `AFFY-TRK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    orders.unshift(newOrder);
    DB.saveFoodOrders(orders);

    // Log transaction for food redemption
    DB.addTransaction({
      user_id: user.id,
      wallet_id: wallet.id,
      type: 'savings_withdrawal',
      amount: totalCost,
      status: 'completed',
      reference: `TX-FOOD-${Math.floor(10000 + Math.random() * 90000)}`,
      category: 'transfer',
      description: `Food Reserve Redemption: ${packageName || 'Custom Grocery Basket'} (Tracking: ${newOrder.tracking_code})`
    });

    // In-App Notification
    DB.addInAppNotification(
      user.id,
      'Food Reserve Redeemed!',
      `Your food order ${newOrder.id} has been received for processing. Tracking Code: ${newOrder.tracking_code}.${changeRefunded > 0 ? ` ₦${changeRefunded.toLocaleString()} change refunded to your wallet.` : ''}`,
      'transaction'
    );

    // Simulated alerts
    logSimulation(
      'Email',
      'Food Reserve Redemption Confirmed',
      user.email,
      `Hello ${user.name},\n\nYour Food Reserve redemption order (${newOrder.id}) was successfully booked!\n\nOrder Details: ${packageName || 'Custom Grocery Basket'}\nTotal Cost: ₦${totalCost.toLocaleString()}\nRefunded Change: ₦${changeRefunded.toLocaleString()}\nDelivery To: ${params.deliveryAddress}\nPhone: ${params.deliveryPhone}\nTracking Code: ${newOrder.tracking_code}\n\nOur logistics fulfillment team will reach out once dispatch begins.`
    );
    logSimulation(
      'WhatsApp',
      'Food Order Booked',
      user.phone || params.deliveryPhone,
      `Affy Savings: Food Order ${newOrder.id} confirmed! Value: ₦${totalCost.toLocaleString()}. Tracking: ${newOrder.tracking_code}. Delivery to: ${params.deliveryAddress}.`
    );

    // Audit Log
    DB.addAuditLog(user.id, 'Redeemed Food Reserve Plan', {
      planId: plan.id,
      orderId: newOrder.id,
      orderType: params.orderType,
      totalCost,
      changeRefunded,
      trackingCode: newOrder.tracking_code
    });

    return { success: true, order: newOrder, changeRefunded };
  },

  rolloverFoodReserve: (planId: string, additionalDays: number): { success: boolean; error?: string; plan?: SavingsPlan } => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) return { success: false, error: "Savings plan not found." };
    const plan = plans[idx];

    const currentEnd = new Date(plan.end_date).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    plan.end_date = new Date(baseTime + additionalDays * 86400000).toISOString();
    plan.status = 'active';

    plans[idx] = plan;
    setStorage(SAVINGS_KEY, plans);

    DB.addAuditLog(plan.user_id, 'Rolled Over Food Reserve Duration', {
      planId,
      additionalDays,
      newEndDate: plan.end_date
    });

    DB.addInAppNotification(
      plan.user_id,
      'Food Reserve Rollover Extended',
      `Your Food Reserve "${plan.name}" has been extended by ${additionalDays} days until ${new Date(plan.end_date).toLocaleDateString()}.`,
      'announcement'
    );

    const user = DB.getUsers().find(u => u.id === plan.user_id);
    if (user) {
      logSimulation(
        'Email',
        'Food Reserve Rollover',
        user.email,
        `Hello ${user.name},\n\nYour Food Reserve "${plan.name}" was successfully rolled over for another ${additionalDays} days.\n\nNew Maturity Date: ${new Date(plan.end_date).toLocaleDateString()}\nProtected Balance: ₦${plan.saved_amount.toLocaleString()}.`
      );
    }

    return { success: true, plan };
  },

  getTransactions: (): Transaction[] => getStorage<Transaction[]>(TRANSACTIONS_KEY, []),
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const transactions = getStorage<Transaction[]>(TRANSACTIONS_KEY, []);
    const newTx: Transaction = {
      ...tx,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    transactions.unshift(newTx);
    setStorage(TRANSACTIONS_KEY, transactions);
    return newTx;
  },
  saveTransactions: (transactions: Transaction[]) => setStorage(TRANSACTIONS_KEY, transactions),

  getLinkedAccounts: (): LinkedAccount[] => getStorage<LinkedAccount[]>(ACCOUNTS_KEY, []),
  addLinkedAccount: (acc: Omit<LinkedAccount, 'id' | 'created_at' | 'status'>) => {
    const accounts = getStorage<LinkedAccount[]>(ACCOUNTS_KEY, []);
    const newAcc: LinkedAccount = {
      ...acc,
      id: generateUUID(),
      status: 'verified',
      created_at: new Date().toISOString()
    };
    accounts.push(newAcc);
    setStorage(ACCOUNTS_KEY, accounts);
    return newAcc;
  },
  deleteLinkedAccount: (id: string) => {
    const accounts = getStorage<LinkedAccount[]>(ACCOUNTS_KEY, []);
    const filtered = accounts.filter(a => a.id !== id);
    setStorage(ACCOUNTS_KEY, filtered);
  },
  setDefaultLinkedAccount: (id: string, userId: string) => {
    const accounts = getStorage<LinkedAccount[]>(ACCOUNTS_KEY, []);
    const updated = accounts.map(a => a.user_id === userId ? { ...a, is_default: a.id === id } : a);
    setStorage(ACCOUNTS_KEY, updated);
  },

  getBeneficiaries: (): Beneficiary[] => getStorage<Beneficiary[]>(BENEFICIARIES_KEY, []),
  addBeneficiary: (ben: Omit<Beneficiary, 'id' | 'created_at'>) => {
    const list = getStorage<Beneficiary[]>(BENEFICIARIES_KEY, []);
    if (list.find(b => b.account_number === ben.account_number)) return;
    const newBen: Beneficiary = {
      ...ben,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    list.push(newBen);
    setStorage(BENEFICIARIES_KEY, list);
    return newBen;
  },

  getNotifications: (): SystemNotification[] => getStorage<SystemNotification[]>(NOTIFICATIONS_KEY, []),
  addInAppNotification: (userId: string | null, title: string, message: string, channel: 'announcement' | 'security' | 'transaction') => {
    const notifications = getStorage<SystemNotification[]>(NOTIFICATIONS_KEY, []);
    const newNot: SystemNotification = {
      id: generateUUID(),
      user_id: userId,
      title,
      message,
      type: 'in-app',
      channel,
      read_at: null,
      created_at: new Date().toISOString()
    };
    notifications.unshift(newNot);
    setStorage(NOTIFICATIONS_KEY, notifications);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("new_in_app_notification"));
    }
    return newNot;
  },
  markNotificationAsRead: (id: string) => {
    const list = getStorage<SystemNotification[]>(NOTIFICATIONS_KEY, []);
    const updated = list.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
    setStorage(NOTIFICATIONS_KEY, updated);
  },
  markAllNotificationsRead: (userId: string) => {
    const list = getStorage<SystemNotification[]>(NOTIFICATIONS_KEY, []);
    const updated = list.map(n => n.user_id === userId ? { ...n, read_at: new Date().toISOString() } : n);
    setStorage(NOTIFICATIONS_KEY, updated);
  },

  getAuditLogs: (): AuditLog[] => getStorage<AuditLog[]>(AUDIT_LOGS_KEY, []),
  addAuditLog: (userId: string | null, action: string, details: any) => {
    const logs = getStorage<AuditLog[]>(AUDIT_LOGS_KEY, []);
    const newLog: AuditLog = {
      id: generateUUID(),
      user_id: userId,
      action,
      details,
      ip_address: "192.168.1.100",
      device_info: typeof navigator !== "undefined" ? navigator.userAgent : "Server Environment",
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStorage(AUDIT_LOGS_KEY, logs);
    return newLog;
  },

  getStaff: (): StaffProfile[] => getStorage<StaffProfile[]>(STAFF_KEY, []),
  addStaff: (profile: Omit<StaffProfile, 'id'>) => {
    const list = getStorage<StaffProfile[]>(STAFF_KEY, []);
    const newStaff: StaffProfile = { ...profile, id: generateUUID() };
    list.push(newStaff);
    setStorage(STAFF_KEY, list);
    return newStaff;
  },
  updateStaffStatus: (id: string, active: boolean) => {
    const list = getStorage<StaffProfile[]>(STAFF_KEY, []);
    const updated = list.map(s => s.id === id ? { ...s, is_active: active } : s);
    setStorage(STAFF_KEY, updated);
  }
};
