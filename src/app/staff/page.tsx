'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, logSimulation, StaffProfile, User, Transaction, AuditLog, SavingsPlan } from '@/services/db';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Users, 
  Activity, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  UserPlus, 
  Unlock, 
  Lock,
  Search,
  LogOut,
  Target,
  Sparkles,
  Award,
  Settings,
  X,
  RefreshCw,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import AffyLogo from '@/components/AffyLogo';

export default function StaffPortal() {
  const router = useRouter();
  const { currentStaff, setCurrentStaff, cms } = useApp();

  useEffect(() => {
    if (!currentStaff) {
      router.push('/auth/login');
    }
  }, [currentStaff, router]);

  // Lists
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [customerList, setCustomerList] = useState<User[]>([]);
  const [savingsList, setSavingsList] = useState<SavingsPlan[]>([]);
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [auditList, setAuditList] = useState<AuditLog[]>([]);

  // Action states
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    role: 'Operations' as StaffProfile['role'],
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    setStaffList(DB.getStaff());
    setCustomerList(DB.getUsers());
    setSavingsList(DB.getSavingsPlans());
    setTransactionList(DB.getTransactions());
    setAuditList(DB.getAuditLogs());
  };

  useEffect(() => {
    if (!currentStaff) return;
    refreshData();
  }, [currentStaff]);

  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary animate-pulse text-sm">
        Authenticating Secure Backoffice Session...
      </div>
    );
  }

  // 1. INVITE STAFF MEMBER
  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteData.name || !inviteData.email) {
      setErrorMsg('Please fill in name and email fields.');
      return;
    }

    if (staffList.some(s => s.email.toLowerCase() === inviteData.email.toLowerCase())) {
      setErrorMsg('A staff member with this email already exists.');
      return;
    }

    let perms: string[] = [];
    switch (inviteData.role) {
      case 'Super Admin': perms = ['all']; break;
      case 'Operations': perms = ['manage_users', 'approve_accounts']; break;
      case 'Customer Support': perms = ['view_users', 'view_transactions']; break;
      case 'Compliance': perms = ['review_transactions', 'view_audit_logs', 'unlock_users']; break;
      case 'Finance': perms = ['approve_transactions', 'view_metrics']; break;
      case 'Content Manager': perms = ['manage_cms']; break;
    }

    const invited = DB.addStaff({
      email: inviteData.email.toLowerCase(),
      name: inviteData.name,
      role: inviteData.role,
      permissions: perms,
      is_active: true
    });

    logSimulation(
      'WhatsApp',
      'Staff Portal Invitation Alert',
      '+1 (555) 999-0000',
      `Welcome to AFFY SAVINGS! You have been invited to join the staff team as a ${inviteData.role}. Setup password link: https://affysavings.com/staff/setup?email=${invited.email}`
    );

    DB.addAuditLog(currentStaff.id, 'Invited New Staff Member', { email: inviteData.email, role: inviteData.role });
    
    setInviteModal(false);
    refreshData();
    setSuccessMsg(`Invitation dispatched to ${inviteData.email} successfully.`);
    setInviteData({ name: '', email: '', role: 'Operations' });
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleToggleStaffStatus = (id: string, active: boolean) => {
    DB.updateStaffStatus(id, active);
    DB.addAuditLog(currentStaff.id, active ? 'Activated Staff Member' : 'Deactivated Staff Member', { staffId: id });
    refreshData();
  };

  // 2. COMPLIANCE: UNLOCK LOCKED CUSTOMER PROFILE
  const handleUnlockCustomer = (customerId: string) => {
    const list = DB.getUsers();
    const idx = list.findIndex(u => u.id === customerId);
    if (idx !== -1) {
      list[idx].is_locked = false;
      list[idx].failed_attempts = 0;
      DB.saveUsers(list);
      DB.addAuditLog(currentStaff.id, 'Unlocked Locked User Profile', { customerId, customerEmail: list[idx].email });
      setCustomerList(list);
      setSuccessMsg(`Unlocked profile for ${list[idx].email} successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // 3. COMPLIANCE: OVERRIDE / RELEASE SAVINGS VAULT FROW LOCKED PERIOD
  const handleUnlockSavingsPlan = (planId: string) => {
    const list = DB.getSavingsPlans();
    const idx = list.findIndex(p => p.id === planId);
    if (idx !== -1) {
      list[idx].end_date = new Date().toISOString();
      DB.saveSavingsPlans(list);
      DB.addAuditLog(currentStaff.id, 'Compliance Override: Released savings plan early', { planId, name: list[idx].name });
      setSuccessMsg(`Released lock duration for savings plan: "${list[idx].name}".`);
      refreshData();
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleStaffLogout = () => {
    setCurrentStaff(null);
    router.push('/auth/login');
  };

  // Finance calculations: Accrued Penalty Fee Totals
  const calculateTotalPenalties = () => {
    return transactionList.reduce((acc, tx) => {
      if (tx.type === 'penalty_fee') {
        return acc + tx.amount;
      }
      return acc;
    }, 0);
  };

  const totalLockedSavings = savingsList.reduce((acc, plan) => plan.type === 'locked' && plan.status === 'active' ? acc + plan.saved_amount : acc, 0);
  const totalFixedSavings = savingsList.reduce((acc, plan) => plan.type === 'fixed' && plan.status === 'active' ? acc + plan.saved_amount : acc, 0);
  const totalTargetSavings = savingsList.reduce((acc, plan) => plan.type === 'target' && plan.status === 'active' ? acc + plan.saved_amount : acc, 0);

  const filteredCustomers = customerList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-zinc-400";
  const labelClasses = "block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative background glows */}
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="text-xs font-mono text-zinc-500">
                WORKSPACE : <strong className="text-foreground">{currentStaff.name} ({currentStaff.role})</strong>
              </div>
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

      {/* CORE STAFF LAYOUT */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 z-10 animate-fade-in">
        
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 text-white p-6 rounded-3xl shadow-lg border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider border border-primary/30">
              {currentStaff.role} ACTIVE SESSION
            </span>
            <h2 className="text-xl font-bold font-display tracking-tight">Staff Operations Center</h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Deactivate profiles, unlock rigid lock durations under compliance protocol, and audit breakdown penalties.
            </p>
          </div>
          
          {(currentStaff.role === 'Super Admin' || currentStaff.role === 'Operations') && (
            <button 
              onClick={() => setInviteModal(true)}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer font-sans self-start md:self-auto"
            >
              <UserPlus size={14} /> Invite Colleague
            </button>
          )}
        </div>

        {/* Success notify */}
        {successMsg && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold font-sans animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. STAFF DIRECTORY */}
            {(currentStaff.role === 'Super Admin' || currentStaff.role === 'Operations') && (
              <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4 text-xs hover-lift">
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <Briefcase size={16} className="text-primary" />
                  <h3 className="font-bold text-sm font-display text-foreground">Operator Directory</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {staffList.map(st => (
                        <tr key={st.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">{st.name}</td>
                          <td className="py-3.5 px-4 font-mono text-zinc-400">{st.email}</td>
                          <td className="py-3.5 px-4 font-bold text-primary">{st.role}</td>
                          <td className="py-3.5 px-4 text-right">
                            {st.id === currentStaff.id ? (
                              <span className="text-[9px] text-zinc-400 font-bold bg-neutral-gray px-2.5 py-0.5 rounded-full uppercase">Current Session</span>
                            ) : (
                              <button
                                onClick={() => handleToggleStaffStatus(st.id, !st.is_active)}
                                className={`text-[9px] px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                                  st.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                }`}
                              >
                                {st.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. COMPLIANCE AUDITING: Release Locked Plans & User Profiles */}
            {(currentStaff.role === 'Super Admin' || currentStaff.role === 'Compliance') && (
              <div className="space-y-8">
                
                {/* Profile lock panel */}
                <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4 text-xs hover-lift">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-primary" />
                      <h3 className="font-bold text-sm font-display text-foreground">Lockout Suspensions</h3>
                    </div>
                    
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                          <th className="py-3 px-4">Failed Attempts</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredCustomers.map(cust => (
                          <tr key={cust.id} className="hover:bg-neutral-gray/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground">{cust.name}</td>
                            <td className="py-3.5 px-4 font-mono text-zinc-400">{cust.email}</td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-500">{cust.failed_attempts}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                cust.is_locked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                              }`}>{cust.is_locked ? 'Suspended' : 'Clear'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {cust.is_locked ? (
                                <button 
                                  onClick={() => handleUnlockCustomer(cust.id)}
                                  className="bg-emerald-655 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                                >
                                  Unlock Profile
                                </button>
                              ) : (
                                <span className="text-zinc-400 text-[10px] font-bold uppercase">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Savings Locks Release Panel */}
                <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4 text-xs hover-lift">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                    <Lock size={16} className="text-primary" />
                    <h3 className="font-bold text-sm font-display text-foreground">Lock Compliance Overrides</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                          <th className="py-3 px-4">Plan Name</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Principal</th>
                          <th className="py-3 px-4">Expiry date</th>
                          <th className="py-3 px-4 text-right">Release Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {savingsList.filter(p => p.status === 'active').map(plan => {
                          const now = new Date();
                          const end = new Date(plan.end_date);
                          const isLockedVal = now < end;

                          return (
                            <tr key={plan.id} className="hover:bg-neutral-gray/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-foreground">{plan.name}</td>
                              <td className="py-3.5 px-4 capitalize">
                                <span className="px-2 py-0.5 bg-neutral-gray rounded text-[8px] font-bold">{plan.type}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-extrabold text-primary">₦{plan.saved_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="py-3.5 px-4 font-mono text-zinc-400">{end.toLocaleDateString()}</td>
                              <td className="py-3.5 px-4 text-right">
                                {isLockedVal ? (
                                  <button
                                    onClick={() => handleUnlockSavingsPlan(plan.id)}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                                  >
                                    Release Lock
                                  </button>
                                ) : (
                                  <span className="text-zinc-400 text-[10px] font-bold uppercase">Matured</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 3. FINANCE METRICS: savings summaries, accrued penalty fees */}
            {(currentStaff.role === 'Super Admin' || currentStaff.role === 'Finance') && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Aggregate totals cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm text-center hover-lift">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Locked Strategy Pool</span>
                    <span className="text-xl font-mono font-black mt-2 block text-red-500">₦{totalLockedSavings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm text-center hover-lift">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Fixed Target Pool</span>
                    <span className="text-xl font-mono font-black mt-2 block text-amber-500">₦{totalFixedSavings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm text-center hover-lift">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Goal Target Pool</span>
                    <span className="text-xl font-mono font-black mt-2 block text-primary">₦{totalTargetSavings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>

                {/* Penalty fee ledger list */}
                <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-xs hover-lift">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-primary animate-pulse" />
                      <h3 className="font-bold text-sm font-display text-foreground">Accrued Penalty Auditing</h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest block">Total Penalties Accrued</span>
                      <strong className="text-lg text-red-500 font-mono font-black">₦{calculateTotalPenalties().toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                          <th className="py-3 px-4">Audit Reference</th>
                          <th className="py-3 px-4">User ID</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-right">Fee Charge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {transactionList.filter(t => t.type === 'penalty_fee').map(tx => (
                          <tr key={tx.id} className="hover:bg-neutral-gray/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-foreground">{tx.reference}</td>
                            <td className="py-3.5 px-4 font-mono text-[9px] text-zinc-450">{tx.user_id}</td>
                            <td className="py-3.5 px-4 text-zinc-555 font-medium">{tx.description}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-extrabold text-red-500">₦{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                        {transactionList.filter(t => t.type === 'penalty_fee').length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-400 font-semibold">No penalties accrued yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 4. CUSTOMER SUPPORT */}
            {currentStaff.role === 'Customer Support' && (
              <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4 text-xs hover-lift animate-fade-in">
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <Users size={16} className="text-primary" />
                  <h3 className="font-bold text-sm font-display text-foreground">Customer Vault Inquiries</h3>
                </div>

                <div className="space-y-4">
                  {customerList.map(cust => {
                    const plans = savingsList.filter(p => p.user_id === cust.id);
                    return (
                      <div key={cust.id} className="p-4 bg-neutral-gray/50 border border-border/40 rounded-2xl space-y-3">
                        <div className="flex justify-between font-bold text-sm">
                          <span className="text-foreground">{cust.name}</span>
                          <span className="text-zinc-450 text-[10px] font-mono">{cust.email}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/20">
                          {plans.map(p => (
                            <div key={p.id} className="p-3 bg-card-bg border border-border/30 rounded-xl">
                              <span className="font-bold block truncate text-foreground">{p.name}</span>
                              <span className="text-primary font-mono font-extrabold block mt-1.5">₦{p.saved_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                          ))}
                          {plans.length === 0 && <span className="text-[10px] text-zinc-400 italic">No savings plans created.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Panel 2: Sidebar Security Logs */}
          <div className="lg:col-span-4 space-y-8">
            {['Super Admin', 'Operations', 'Compliance'].includes(currentStaff.role) && (
              <div className="bg-card-bg border border-border/40 rounded-3xl p-5 shadow-sm space-y-4 text-xs hover-lift animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-border/30">
                  <span className="font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><FileText size={14} /> Security Audit Logs</span>
                  <button onClick={refreshData} className="text-[10px] text-primary hover:underline font-bold transition-all">Sync</button>
                </div>

                <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {auditList.slice(0, 15).map(log => (
                    <div key={log.id} className="p-3 bg-neutral-gray/50 rounded-2xl border border-border/40 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-foreground truncate max-w-[140px]">{log.action}</span>
                        <span className="text-[8px] text-zinc-400 font-mono">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-400">Operator: {log.user_id || 'System guest'}</span>
                    </div>
                  ))}
                  {auditList.length === 0 && <div className="text-center py-6 text-zinc-400">No logs found.</div>}
                </div>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* INVITE STAFF MODAL */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative font-sans text-xs animate-fade-in">
            <button onClick={() => setInviteModal(false)} className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold font-display text-foreground mb-1">Invite Team Colleague</h3>
            <p className="text-xs text-zinc-400 mb-6">Send an operator setup invitation code.</p>

            {errorMsg && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-2.5 rounded-xl mb-4">{errorMsg}</div>
            )}

            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div>
                <label className={labelClasses}>Full Name</label>
                <input
                  type="text"
                  placeholder="Sarah Connor"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>Email Address</label>
                <input
                  type="email"
                  placeholder="sarah@affysavings.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>Assign Role</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as StaffProfile['role'] })}
                  className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Operations">Operations</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Finance">Finance</option>
                  <option value="Content Manager">Content Manager</option>
                </select>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity mt-4 cursor-pointer font-sans shadow-md shadow-primary/10"
              >
                Send Invitation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
