'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, User, Transaction, AuditLog, SavingsPlan, logSimulation } from '@/services/db';
import { 
  ArrowLeft, 
  Settings, 
  Globe, 
  Users, 
  Sliders, 
  CheckCircle2, 
  Unlock, 
  Lock,
  RefreshCw,
  LogOut,
  AlertTriangle,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  Search,
  Activity,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import AffyLogo from '@/components/AffyLogo';

export default function AdminPortal() {
  const router = useRouter();
  const { cms, refreshCMS, currentStaff, setCurrentStaff } = useApp();

  // Redirect if not staff/admin
  useEffect(() => {
    if (!currentStaff || currentStaff.role !== 'Super Admin') {
      router.push('/auth/login');
    }
  }, [currentStaff, router]);

  const [activeSubTab, setActiveSubTab] = useState<'cms' | 'users' | 'portfolios' | 'audit' | 'transactions'>('cms');
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // CMS Form state
  const [cmsForm, setCmsForm] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Selected customer edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalanceData, setEditBalanceData] = useState({ balance: '', wallet_balance: '' });

  // Users tab search
  const [usersSearch, setUsersSearch] = useState('');

  useEffect(() => {
    if (cms) {
      setCmsForm(JSON.parse(JSON.stringify(cms)));
    }
    refreshLists();
  }, [cms]);

  const refreshLists = () => {
    setUsers(DB.getUsers());
    setTransactions(DB.getTransactions());
    setSavingsPlans(DB.getSavingsPlans());
    setAuditLogs(DB.getAuditLogs());
  };

  if (!currentStaff || !cmsForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary animate-pulse text-sm">
        Authenticating Secure Backoffice Connection...
      </div>
    );
  }

  // 1. UPDATE CMS
  const handleCMSPublish = (e: React.FormEvent) => {
    e.preventDefault();
    DB.saveCMS(cmsForm);
    refreshCMS();
    setSuccessMsg('Branding and dynamic website content published successfully.');
    DB.addAuditLog(currentStaff.id, 'Published CMS Content Changes', { cms: cmsForm });
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // 2. TOGGLE USER LOCK
  const handleToggleLockUser = (userId: string) => {
    const list = DB.getUsers();
    const updated = list.map(u => {
      if (u.id === userId) {
        const nextLockState = !u.is_locked;
        DB.addAuditLog(currentStaff.id, nextLockState ? 'Locked Customer Account' : 'Unlocked Customer Account', { customerId: u.id, customerEmail: u.email });
        return { ...u, is_locked: nextLockState, failed_attempts: nextLockState ? 3 : 0 };
      }
      return u;
    });
    DB.saveUsers(updated);
    setUsers(updated);
  };

  // 3. EDIT USER BALANCES
  const handleOpenEditBalances = (user: User) => {
    setEditingUser(user);
    const wallet = DB.getWalletForUser(user.id);
    setEditBalanceData({
      balance: wallet.balance.toString(),
      wallet_balance: wallet.wallet_balance.toString()
    });
  };

  const handleSaveBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const balanceNum = parseFloat(editBalanceData.balance);
    const walletNum = parseFloat(editBalanceData.wallet_balance);

    if (isNaN(balanceNum) || isNaN(walletNum)) return;

    const wallet = DB.getWalletForUser(editingUser.id);
    wallet.balance = balanceNum;
    wallet.wallet_balance = walletNum;
    DB.saveWallet(wallet);

    DB.addAuditLog(currentStaff.id, 'Modified Customer Balances', { customerId: editingUser.id, balance: balanceNum, wallet_balance: walletNum });
    
    setEditingUser(null);
    refreshLists();
  };

  // 4. OVERRIDE SAVINGS PLAN MATURITY
  const handleForceMaturity = (planId: string) => {
    const list = DB.getSavingsPlans();
    const idx = list.findIndex(p => p.id === planId);
    if (idx !== -1) {
      list[idx].end_date = new Date(Date.now() - 86400000).toISOString(); // 1 day ago (already matured)
      DB.saveSavingsPlans(list);
      DB.addAuditLog(currentStaff.id, 'Operator Forced Savings Plan Maturity', { planId, name: list[idx].name });
      setSuccessMsg(`Forced maturation for plan: "${list[idx].name}". Free withdrawal now available for client.`);
      refreshLists();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleApproveTransfer = (txId: string) => {
    if (!currentStaff) return;
    const allTx = DB.getTransactions();
    const txIdx = allTx.findIndex(t => t.id === txId);
    if (txIdx === -1) return;

    const tx = allTx[txIdx];
    if (tx.status !== 'pending') return;

    // Get user wallet and credit it
    const wallet = DB.getWalletForUser(tx.user_id);
    wallet.wallet_balance += tx.amount;
    DB.saveWallet(wallet);

    // Mark transaction completed
    tx.status = 'completed';
    allTx[txIdx] = tx;
    DB.saveTransactions(allTx);

    // Log Audit
    DB.addAuditLog(currentStaff.id, 'Operator Approved Pending Deposit Transfer', { txId, amount: tx.amount, customerId: tx.user_id });

    // User alert notifications
    const user = DB.getUsers().find(u => u.id === tx.user_id);
    if (user) {
      logSimulation(
        'Email',
        'Direct Transfer Deposit Approved',
        user.email,
        `Hi ${user.name},\n\nYour bank transfer of ₦${tx.amount.toLocaleString()} has been verified and approved.\n\nYour wallet balance has been credited. Reference: ${tx.reference}.`
      );
      logSimulation(
        'WhatsApp',
        'Direct Deposit Approved',
        user.phone || '+234 810 315 1999',
        `AFFY SAVINGS: Direct deposit of ₦${tx.amount.toLocaleString()} is verified & credited! Ref: ${tx.reference}.`
      );
      DB.addInAppNotification(user.id, 'Direct Deposit Verified', `Your transfer of ₦${tx.amount.toLocaleString()} was approved and credited.`, 'transaction');
    }

    setSuccessMsg(`Approved and credited ₦${tx.amount.toLocaleString()} transfer.`);
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRejectTransfer = (txId: string) => {
    if (!currentStaff) return;
    const allTx = DB.getTransactions();
    const txIdx = allTx.findIndex(t => t.id === txId);
    if (txIdx === -1) return;

    const tx = allTx[txIdx];
    if (tx.status !== 'pending') return;

    // Mark transaction failed
    tx.status = 'failed';
    allTx[txIdx] = tx;
    DB.saveTransactions(allTx);

    // Log Audit
    DB.addAuditLog(currentStaff.id, 'Operator Rejected Pending Deposit Transfer', { txId, amount: tx.amount, customerId: tx.user_id });

    // User alert notifications
    const user = DB.getUsers().find(u => u.id === tx.user_id);
    if (user) {
      logSimulation(
        'Email',
        'Direct Transfer Deposit Declined',
        user.email,
        `Hi ${user.name},\n\nYour bank transfer deposit of ₦${tx.amount.toLocaleString()} was declined by administration.\n\nIf you believe this is an error, please reach out to WhatsApp Support.`
      );
      logSimulation(
        'WhatsApp',
        'Direct Deposit Declined',
        user.phone || '+234 810 315 1999',
        `AFFY SAVINGS: Direct transfer deposit of ₦${tx.amount.toLocaleString()} was declined. Please check email details.`
      );
      DB.addInAppNotification(user.id, 'Deposit Transfer Declined', `Your transfer request of ₦${tx.amount.toLocaleString()} was declined.`, 'transaction');
    }

    setSuccessMsg(`Transfer request rejected.`);
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleStaffLogout = () => {
    setCurrentStaff(null);
    router.push('/auth/login');
  };

  const inputClasses = "w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-zinc-400";
  const labelClasses = "block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative glows */}
      <div className="bg-ambient-glow glow-purple top-[-100px] left-[-150px] opacity-10" />

      {/* HEADER SECTION */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl h-18 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary font-bold cursor-pointer transition-colors">
            <ArrowLeft size={16} />
            Back to Site
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-foreground">AFFY SAVINGS SUPER ADMIN PANEL</span>
            </div>
            <button 
              onClick={handleStaffLogout}
              className="text-zinc-500 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer border border-border/30 bg-card-bg/50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* CORE ADMIN NAVIGATION TAB */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/40 mb-8 overflow-x-auto gap-6 text-sm font-semibold select-none">
          <button 
            onClick={() => setActiveSubTab('cms')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeSubTab === 'cms' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            System Branding & Rules
          </button>
          <button 
            onClick={() => {
              setActiveSubTab('transactions');
              refreshLists();
            }}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeSubTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Pending Deposits
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeSubTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Customer Accounts
          </button>
          <button 
            onClick={() => setActiveSubTab('portfolios')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeSubTab === 'portfolios' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Active Savings Plans
          </button>
          <button 
            onClick={() => setActiveSubTab('audit')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeSubTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Compliance Audits
          </button>
        </div>

        {/* Global Success Banner */}
        {successMsg && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 text-xs p-4 rounded-2xl mb-6 flex items-center gap-2.5 font-bold font-sans animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SUBTAB 1: SAVINGS PARAMETERS & BRANDING */}
        {activeSubTab === 'cms' && (
          <form onSubmit={handleCMSPublish} className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs font-sans hover-lift animate-fade-in">
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Rule Parameters & Brand Assets</h3>
                <p className="text-xs text-zinc-400">Configure global strict rules, brand coloring, and home page texts.</p>
              </div>
              <button 
                type="submit" 
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="text-white text-xs font-bold px-6 py-3 rounded-xl hover:opacity-95 cursor-pointer shadow-md shadow-primary/10 transition-opacity font-sans self-start sm:self-center"
              >
                Publish System Configuration
              </button>
            </div>

            {/* Strict Savings Config Sliders */}
            <div className="bg-neutral-gray/50 border border-border/40 p-6 rounded-2xl space-y-5">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 font-display">
                <Sliders size={16} className="text-primary" /> 
                Escrow Rule Policies
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelClasses}>Locked Duration Days</label>
                  <input
                    type="number"
                    value={cmsForm.savingsConfig.lockedDurationDays}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      savingsConfig: { ...cmsForm.savingsConfig, lockedDurationDays: parseInt(e.target.value) }
                    })}
                    className={`${inputClasses} font-mono font-bold text-primary`}
                    required
                  />
                  <span className="block text-[9px] text-zinc-400">Days locked accounts remain absolutely frozen (Demo standard is 90 days).</span>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClasses}>Fixed Savings Early Break Penalty (%)</label>
                  <input
                    type="number"
                    value={cmsForm.savingsConfig.fixedBreakPenalty}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      savingsConfig: { ...cmsForm.savingsConfig, fixedBreakPenalty: parseFloat(e.target.value) }
                    })}
                    className={`${inputClasses} font-mono font-bold text-primary`}
                    required
                  />
                  <span className="block text-[9px] text-zinc-400">Percentage fee deducted for premature withdrawal of fixed target strategies.</span>
                </div>
              </div>
            </div>

            {/* Colors and titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/30">
              <div className="space-y-4">
                <h4 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-[10px]">Branding Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={labelClasses}>Primary hex</label>
                    <input
                      type="text"
                      value={cmsForm.branding.primaryColor}
                      onChange={(e) => setCmsForm({
                        ...cmsForm,
                        branding: { ...cmsForm.branding, primaryColor: e.target.value }
                      })}
                      className={`${inputClasses} font-mono`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClasses}>Primary Hover hex</label>
                    <input
                      type="text"
                      value={cmsForm.branding.primaryColorDark}
                      onChange={(e) => setCmsForm({
                        ...cmsForm,
                        branding: { ...cmsForm.branding, primaryColorDark: e.target.value }
                      })}
                      className={`${inputClasses} font-mono`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-[10px]">Landing Page Copy</h4>
                <div className="space-y-1.5">
                  <label className={labelClasses}>Headline title</label>
                  <input
                    type="text"
                    value={cmsForm.hero.title}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      hero: { ...cmsForm.hero, title: e.target.value }
                    })}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClasses}>Subhead details</label>
                  <textarea
                    rows={3}
                    value={cmsForm.hero.subtitle}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      hero: { ...cmsForm.hero, subtitle: e.target.value }
                    })}
                    className={`${inputClasses} leading-relaxed`}
                  />
                </div>
              </div>
            </div>

            {/* Direct Deposit Configuration */}
            <div className="bg-neutral-gray/50 border border-border/40 p-6 rounded-2xl space-y-5 pt-4 border-t border-border/30">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 font-display">Direct Deposit Routing details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClasses}>Bank Name</label>
                  <input
                    type="text"
                    value={cmsForm.directDeposit?.bankName || ''}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      directDeposit: { ...cmsForm.directDeposit, bankName: e.target.value }
                    })}
                    className={inputClasses}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClasses}>Account Number</label>
                  <input
                    type="text"
                    value={cmsForm.directDeposit?.accountNumber || ''}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      directDeposit: { ...cmsForm.directDeposit, accountNumber: e.target.value }
                    })}
                    className={`${inputClasses} font-mono`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClasses}>Account Name</label>
                  <input
                    type="text"
                    value={cmsForm.directDeposit?.accountName || ''}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      directDeposit: { ...cmsForm.directDeposit, accountName: e.target.value }
                    })}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClasses}>WhatsApp Support Number</label>
                  <input
                    type="text"
                    value={cmsForm.directDeposit?.whatsAppNumber || ''}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      directDeposit: { ...cmsForm.directDeposit, whatsAppNumber: e.target.value }
                    })}
                    className={`${inputClasses} font-mono`}
                    required
                    placeholder="e.g. 2348103151999"
                  />
                  <span className="text-[9px] text-zinc-400 mt-1 block">WhatsApp target (e.g. 2348103151999 for international formats).</span>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClasses}>Pre-filled Message Template</label>
                  <textarea
                    rows={2}
                    value={cmsForm.directDeposit?.whatsAppMessage || ''}
                    onChange={(e) => setCmsForm({
                      ...cmsForm,
                      directDeposit: { ...cmsForm.directDeposit, whatsAppMessage: e.target.value }
                    })}
                    className={`${inputClasses} leading-relaxed`}
                    required
                  />
                  <span className="text-[9px] text-zinc-400 mt-1 block">Variables: <code>{`{amount}`}</code>, <code>{`{email}`}</code>, <code>{`{name}`}</code>, and <code>{`{reference}`}</code>.</span>
                </div>
              </div>
            </div>

          </form>
        )}

        {/* SUBTAB 2.5: PENDING TRANSFERS APPROVAL */}
        {activeSubTab === 'transactions' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs font-sans hover-lift animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Pending Bank Deposits</h3>
                <p className="text-xs text-zinc-400">Verify manual transfers from clients and credit their liquid wallets.</p>
              </div>
              <button 
                onClick={refreshLists} 
                className="bg-neutral-gray/50 hover:bg-primary/10 hover:text-primary px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
              >
                <RefreshCw size={12} /> Reload
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-4">Customer Info</th>
                    <th className="py-3 px-4">Audit Reference</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {transactions.filter(t => t.status === 'pending').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 font-semibold">
                        🎉 No pending bank deposits to verify!
                      </td>
                    </tr>
                  ) : (
                    transactions.filter(t => t.status === 'pending').map(tx => {
                      const user = users.find(u => u.id === tx.user_id);
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold text-foreground">{user?.name || 'Unknown User'}</div>
                            <div className="text-[9px] text-zinc-400 font-mono mt-0.5">{tx.recipient_email || user?.email || 'N/A'}</div>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-primary tracking-wider">{tx.reference}</td>
                          <td className="py-4 px-4 font-mono font-extrabold text-foreground">₦{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-4 px-4 text-zinc-400 font-mono">{new Date(tx.created_at).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">
                              PENDING
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleApproveTransfer(tx.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 font-sans"
                            >
                              Approve & Credit
                            </button>
                            <button
                              onClick={() => handleRejectTransfer(tx.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer font-sans"
                            >
                              Decline
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CUSTOMER ACCOUNTS (CRUD) */}
        {activeSubTab === 'users' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs hover-lift animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Customer Directory</h3>
                <p className="text-xs text-zinc-400">Lock/unlock customer profiles or overwrite wallet cash balances.</p>
              </div>
              
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
                <input 
                  type="text"
                  placeholder="Search directory..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Liquid Wallet Balance</th>
                    <th className="py-3 px-4">Security State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users
                    .filter(u => u.name.toLowerCase().includes(usersSearch.toLowerCase()) || u.email.toLowerCase().includes(usersSearch.toLowerCase()))
                    .map(user => {
                      const w = DB.getWalletForUser(user.id);
                      return (
                        <tr key={user.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-4 px-4 font-bold text-foreground">{user.name}</td>
                          <td className="py-4 px-4 font-mono text-[10px] text-zinc-400">{user.email}</td>
                          <td className="py-4 px-4 font-mono text-zinc-400">{user.phone}</td>
                          <td className="py-4 px-4 font-mono font-extrabold text-primary">₦{w.wallet_balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              user.is_locked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>{user.is_locked ? 'Locked' : 'Active'}</span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button 
                              onClick={() => handleOpenEditBalances(user)}
                              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer font-sans"
                            >
                              Edit Balance
                            </button>
                            <button 
                              onClick={() => handleToggleLockUser(user.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer font-sans ${
                                user.is_locked ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                              }`}
                            >
                              {user.is_locked ? 'Unlock' : 'Lock'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* BALANCE EDIT DIALOG PANEL */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative text-xs animate-fade-in">
                  <button onClick={() => setEditingUser(null)} className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray">
                    <X size={16} />
                  </button>
                  <h4 className="font-bold text-sm font-display text-foreground mb-1">Edit Asset Balances</h4>
                  <p className="text-[10px] text-zinc-400 mb-6 font-mono truncate">{editingUser.email}</p>

                  <form onSubmit={handleSaveBalances} className="space-y-4">
                    <div>
                      <label className={labelClasses}>Available Balance (ACH Source)</label>
                      <input
                        type="number"
                        value={editBalanceData.balance}
                        onChange={(e) => setEditBalanceData({ ...editBalanceData, balance: e.target.value })}
                        className={inputClasses}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Wallet Liquid Balance (NGN)</label>
                      <input
                        type="number"
                        value={editBalanceData.wallet_balance}
                        onChange={(e) => setEditBalanceData({ ...editBalanceData, wallet_balance: e.target.value })}
                        className={inputClasses}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      style={{ backgroundColor: cms.branding.primaryColor }}
                      className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 mt-4 shadow-md shadow-primary/10 transition-all font-sans"
                    >
                      Update Balances
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* SUBTAB 3: SAVINGS PORTFOLIOS LIST */}
        {activeSubTab === 'portfolios' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs hover-lift animate-fade-in">
            <div className="pb-4 border-b border-border/30">
              <h3 className="text-base font-bold font-display text-foreground">Strict Savings Registry</h3>
              <p className="text-xs text-zinc-400">Inspect client locks, fixed strategies, or trigger forced maturities.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-4">Plan Name</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Saved</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Lock Expiration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {savingsPlans.map(plan => {
                    const now = new Date();
                    const end = new Date(plan.end_date);
                    const isMatured = now >= end;

                    return (
                      <tr key={plan.id} className="hover:bg-neutral-gray/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-foreground">{plan.name}</td>
                        <td className="py-4 px-4 font-mono text-[9px] text-zinc-400">{plan.user_id}</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 bg-neutral-gray text-zinc-500 rounded-full font-bold uppercase text-[8px]">{plan.type}</span>
                        </td>
                        <td className="py-4 px-4 font-mono font-extrabold text-primary">₦{plan.saved_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-4 px-4 font-mono text-zinc-450">₦{plan.target_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-4 px-4 font-mono text-[10px] text-zinc-400">
                          {end.toLocaleDateString()} {isMatured ? '(Matured)' : ''}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            plan.status === 'active' 
                              ? 'bg-primary/10 text-primary' 
                              : plan.status === 'broken' 
                                ? 'bg-red-500/10 text-red-500' 
                                : 'bg-blue-500/10 text-blue-500'
                          }`}>{plan.status.toUpperCase()}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {plan.status === 'active' && !isMatured ? (
                            <button
                              onClick={() => handleForceMaturity(plan.id)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer text-[10px]"
                            >
                              Force Mature
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Matured</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4: AUDIT TRAILS */}
        {activeSubTab === 'audit' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs hover-lift animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Audit Timeline</h3>
                <p className="text-xs text-zinc-400">Security tracker for system configs, locks, and wallet overrides.</p>
              </div>
              <button 
                onClick={refreshLists} 
                className="bg-neutral-gray/50 hover:bg-primary/10 hover:text-primary px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
              >
                <RefreshCw size={12} /> Reload Audit
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Event</th>
                    <th className="py-3 px-4">Operator/User ID</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Payload Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {auditLogs.slice(0, 30).map(log => (
                    <tr key={log.id} className="hover:bg-neutral-gray/30 transition-colors">
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[9px]">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-foreground">{log.action}</td>
                      <td className="py-3.5 px-4 font-mono text-[9px] text-zinc-450">{log.user_id || 'GUEST_USER'}</td>
                      <td className="py-3.5 px-4 font-mono text-[9px] text-zinc-400">{log.ip_address}</td>
                      <td className="py-3.5 px-4 font-mono text-[9px] text-zinc-400 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
