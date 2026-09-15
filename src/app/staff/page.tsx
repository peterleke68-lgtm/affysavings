'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, logSimulation, StaffProfile, User, Transaction, AuditLog, SavingsPlan, FoodOrder } from '@/services/db';
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
  Briefcase,
  ShoppingBag,
  Truck,
  Key
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
  const [customerList, setCustomerList] = useState<User[]>([]);
  const [savingsList, setSavingsList] = useState<SavingsPlan[]>([]);
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [auditList, setAuditList] = useState<AuditLog[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Action states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selfPasswordModal, setSelfPasswordModal] = useState(false);
  const [selfPasswordData, setSelfPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<{ name: string; email: string; role: StaffProfile['role'] }>({
    name: '',
    email: '',
    role: 'Operations',
  });

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to send invitation.');
        return;
      }
      setSuccessMsg(data.message || 'Staff invitation sent successfully.');
      setInviteModal(false);
      setInviteData({ name: '', email: '', role: 'Operations' });
      refreshData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Network error while inviting colleague.');
    }
  };

  const handleToggleStaffStatus = async (staffId: string, newStatus: boolean) => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/staff/${staffId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to update staff status.');
        return;
      }
      setSuccessMsg('Staff status updated successfully.');
      fetchStaffList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Network error while updating staff status.');
    }
  };

  const handleChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selfPasswordData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to change password.');
        return;
      }
      setSuccessMsg('Your password has been changed successfully.');
      setSelfPasswordModal(false);
      setSelfPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Network error while changing password.');
    }
  };
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Finance Review Queue state (Server-authoritative)
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewActionLoading, setReviewActionLoading] = useState<string | null>(null);

  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (data.success && data.staff) {
        setStaffList(data.staff);
      }
    } catch (e) {
      console.error('Failed to fetch staff list:', e);
    }
  };

  const fetchPendingReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch('/api/finance/transactions?status=pending');
      const data = await res.json();
      if (data.success && data.transactions) {
        setPendingReviews(data.transactions);
      }
    } catch (e) {
      console.error('Failed to fetch pending transactions:', e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const refreshData = () => {
    setCustomerList(DB.getUsers());
    setSavingsList(DB.getSavingsPlans());
    setTransactionList(DB.getTransactions());
    setAuditList(DB.getAuditLogs());
    setFoodOrders(DB.getFoodOrders());
    fetchPendingReviews();
    fetchStaffList();
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

  const handleApproveDeposit = async (txId: string) => {
    setReviewActionLoading(txId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/deposits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Deposit approved and credited successfully.');
        fetchPendingReviews();
        refreshData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to approve deposit.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setReviewActionLoading(null);
    }
  };

  const handleRejectDeposit = async (txId: string) => {
    const reason = window.prompt('Enter reason for rejecting deposit:') || 'Unverified or invalid deposit receipt.';
    setReviewActionLoading(txId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/deposits/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Deposit rejected.');
        fetchPendingReviews();
        refreshData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to reject deposit.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setReviewActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (txId: string) => {
    setReviewActionLoading(txId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Withdrawal approved and dispatched.');
        fetchPendingReviews();
        refreshData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to approve withdrawal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setReviewActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (txId: string) => {
    const reason = window.prompt('Enter reason for rejecting withdrawal:') || 'Unable to verify payout details.';
    setReviewActionLoading(txId);
    setErrorMsg('');
    try {
      const res = await fetch('/api/withdrawals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Withdrawal rejected and escrow funds refunded to wallet.');
        fetchPendingReviews();
        refreshData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to reject withdrawal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setReviewActionLoading(null);
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
  const totalFoodSavings = savingsList.reduce((acc, plan) => plan.type === 'food' && plan.status === 'active' ? acc + plan.saved_amount : acc, 0);

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

                {/* Food Orders Fulfillment Overview */}
                <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4 text-xs hover-lift">
                  <div className="flex items-center justify-between pb-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-emerald-400" />
                      <h3 className="font-bold text-sm font-display text-foreground">Food Reserve Orders & Deliveries</h3>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold font-mono">
                      {foodOrders.length} Booked
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                          <th className="py-3 px-4">Order / Tracking</th>
                          <th className="py-3 px-4">Client</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Value</th>
                          <th className="py-3 px-4">Delivery To</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {foodOrders.slice(0, 15).map(order => (
                          <tr key={order.id} className="hover:bg-neutral-gray/30 transition-colors">
                            <td className="py-3 px-4 font-mono">
                              <span className="font-bold text-foreground block text-[11px]">{order.id}</span>
                              <span className="text-[9px] text-emerald-400">{order.tracking_code}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-foreground block">{order.user_name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{order.delivery_phone}</span>
                            </td>
                            <td className="py-3 px-4 text-[10px] font-semibold text-primary uppercase">
                              {order.order_type === 'preset_package' ? order.package_name : 'Custom Basket'}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              ₦{order.total_amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-[10px] text-zinc-300 max-w-xs truncate" title={order.delivery_address}>
                              {order.delivery_address}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : order.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {foodOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs">
                              No food redemption orders booked yet.
                            </td>
                          </tr>
                        )}
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
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

                  <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm text-center hover-lift">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Food Reserve Pool</span>
                    <span className="text-xl font-mono font-black mt-2 block text-emerald-400">₦{totalFoodSavings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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

                {/* Finance Transaction Review Queue — Pending Deposits & Withdrawals */}
                <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-xs hover-lift">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-500 animate-pulse" />
                      <div>
                        <h3 className="font-bold text-sm font-display text-foreground">Pending Transaction Approvals</h3>
                        <p className="text-[10px] text-zinc-400">Authoritative database review queue for deposits & withdrawals</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchPendingReviews}
                        disabled={loadingReviews}
                        className="px-3 py-1.5 rounded-xl border border-border/50 bg-neutral-gray/50 hover:bg-neutral-gray text-zinc-400 hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={loadingReviews ? 'animate-spin' : ''} />
                        Refresh Queue
                      </button>
                      <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                        {pendingReviews.length} PENDING
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                          <th className="py-3 px-4">Date / Ref</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Details</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {pendingReviews.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-neutral-gray/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-foreground block">{tx.reference}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {new Date(tx.created_at).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  tx.type === 'deposit'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-foreground block">
                                {tx.users?.name || tx.user_id}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {tx.users?.email || ''}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-extrabold text-foreground text-sm">
                              ₦{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-400 text-[11px] max-w-xs truncate">
                              {tx.description || (tx.type === 'deposit' ? 'Direct deposit pending verification' : 'Withdrawal to linked account')}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                onClick={() =>
                                  tx.type === 'deposit'
                                    ? handleApproveDeposit(tx.id)
                                    : handleApproveWithdrawal(tx.id)
                                }
                                disabled={reviewActionLoading === tx.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                              >
                                {reviewActionLoading === tx.id ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  tx.type === 'deposit'
                                    ? handleRejectDeposit(tx.id)
                                    : handleRejectWithdrawal(tx.id)
                                }
                                disabled={reviewActionLoading === tx.id}
                                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pendingReviews.length === 0 && !loadingReviews && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-400 font-semibold">
                              ✓ All clear! No pending deposits or withdrawals in the review queue.
                            </td>
                          </tr>
                        )}
                        {loadingReviews && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-400 font-mono">
                              Loading review queue...
                            </td>
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
