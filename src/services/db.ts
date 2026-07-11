// AFFYBANK Local Storage Database Driver (Strict Savings Pivot)

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
  type: 'locked' | 'fixed' | 'target';
  name: string;
  saved_amount: number;
  target_amount: number;
  end_date: string;
  status: 'active' | 'matured' | 'broken' | 'completed';
  created_at: string;
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
    whatsAppMessage: "Hello Support, I have made a bank transfer of ₦{amount} for deposit. Please verify and credit my wallet. Email: {email}, Name: {name}, Reference: {reference}."
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
    copyright: "© 2026 Affy Savings Inc. All rights reserved.",
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

const getStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const initializeDB = () => {
  if (typeof window === "undefined") return;

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

  // Seed Users
  const users = getStorage<User[]>(USERS_KEY, []);
  if (users.length === 0) {
    const customerId = "cust-1234-5678";
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
        id: "admin-uuid-1",
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
        id: "wall-1234",
        user_id: customerId,
        balance: 14520500.00,
        wallet_balance: 5230120.00, // tracks fluid cash available
        currency: "NGN"
      }
    ];
    setStorage(WALLETS_KEY, newWallets);

    // Seed Strict Savings Plans
    const newSavings: SavingsPlan[] = [
      {
        id: "sav-locked",
        user_id: customerId,
        type: "locked",
        name: "3-Month Capital Guard",
        saved_amount: 3500000.00,
        target_amount: 5000000.00,
        end_date: new Date(Date.now() + 86400000 * 90).toISOString(), // 90 days from now
        status: "active",
        created_at: new Date().toISOString()
      },
      {
        id: "sav-fixed",
        user_id: customerId,
        type: "fixed",
        name: "Emergency Backup Plan",
        saved_amount: 1200000.00,
        target_amount: 2000000.00,
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
        status: "active",
        created_at: new Date().toISOString()
      },
      {
        id: "sav-target",
        user_id: customerId,
        type: "target",
        name: "New Laptop Fund",
        saved_amount: 300000.00,
        target_amount: 1000000.00,
        end_date: new Date(Date.now() + 86400000 * 60).toISOString(), // 60 days
        status: "active",
        created_at: new Date().toISOString()
      }
    ];
    setStorage(SAVINGS_KEY, newSavings);

    // Seed initial Transactions
    const newTransactions: Transaction[] = [
      {
        id: "tx-1",
        user_id: customerId,
        wallet_id: "wall-1234",
        type: "deposit",
        amount: 10000000.00,
        status: "completed",
        reference: "TX-DEP-9921",
        category: "income",
        description: "Initial payroll deposit",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: "tx-2",
        user_id: customerId,
        wallet_id: "wall-1234",
        type: "savings_deposit",
        amount: 3500000.00,
        status: "completed",
        reference: "TX-SAV-8802",
        category: "transfer",
        description: "Deposit to 3-Month Capital Guard",
        created_at: new Date(Date.now() - 86400000 * 4).toISOString()
      }
    ];
    setStorage(TRANSACTIONS_KEY, newTransactions);

    // Seed Linked Accounts
    const newAccounts: LinkedAccount[] = [
      {
        id: "lnk-1",
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
      { id: "st-1", email: "admin@affysavings.com", name: "Super Admin", role: "Super Admin", permissions: ["all"], is_active: true },
      { id: "st-2", email: "operations@affysavings.com", name: "Sarah Connor", role: "Operations", permissions: ["manage_users", "approve_accounts"], is_active: true },
      { id: "st-3", email: "support@affysavings.com", name: "John Doe", role: "Customer Support", permissions: ["view_users", "view_transactions"], is_active: true },
      { id: "st-4", email: "compliance@affysavings.com", name: "Robert Miller", role: "Compliance", permissions: ["review_transactions", "view_audit_logs"], is_active: true },
      { id: "st-5", email: "finance@affysavings.com", name: "Alice Smith", role: "Finance", permissions: ["approve_transactions", "view_metrics"], is_active: true }
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
        id: `wall-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        balance: 1000000.00,
        wallet_balance: 500000.00,
        currency: "NGN"
      };
      wallets.push(wallet);
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
  
  createSavingsPlan: (userId: string, name: string, type: 'locked' | 'fixed' | 'target', targetAmount: number, durationDays: number): SavingsPlan => {
    const plans = getStorage<SavingsPlan[]>(SAVINGS_KEY, []);
    const newPlan: SavingsPlan = {
      id: `sav-${Math.random().toString(36).substr(2, 9)}`,
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

    // Check Fixed plan penalty rules: Deduct penalty fee if broken early
    if (plan.type === 'fixed' && !isMatured) {
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

  getTransactions: (): Transaction[] => getStorage<Transaction[]>(TRANSACTIONS_KEY, []),
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const transactions = getStorage<Transaction[]>(TRANSACTIONS_KEY, []);
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
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
      id: `lnk-${Math.random().toString(36).substr(2, 9)}`,
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
      id: `ben-${Math.random().toString(36).substr(2, 9)}`,
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
      id: `not-${Math.random().toString(36).substr(2, 9)}`,
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
      id: `audit-${Math.random().toString(36).substr(2, 9)}`,
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
    const newStaff: StaffProfile = { ...profile, id: `st-${Math.random().toString(36).substr(2, 9)}` };
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
