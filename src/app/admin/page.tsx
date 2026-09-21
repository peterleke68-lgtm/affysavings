'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, User, Transaction, AuditLog, SavingsPlan, logSimulation, FoodPackage, FoodItem, FoodOrder } from '@/services/db';
import { supabase } from '@/services/supabaseClient';
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
  Plus,
  X,
  ShoppingBag,
  Utensils,
  Truck,
  PackageCheck,
  Edit,
  Trash2,
  Check,
  Clock,
  Eye,
  Key,
  Shield,
  UserCheck,
  UserX,
  UserPlus,
  ShieldCheck
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

  const [activeSubTab, setActiveSubTab] = useState<'cms' | 'staff' | 'users' | 'portfolios' | 'audit' | 'transactions' | 'food_reserve'>('cms');
  const [viewingAsRole, setViewingAsRole] = useState<'Super Admin' | 'Finance' | 'Customer Support'>('Super Admin');

  // Staff management state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [addStaffModal, setAddStaffModal] = useState(false);
  const [addStaffData, setAddStaffData] = useState({ name: '', email: '', role: 'Finance', password: '' });
  const [roleModal, setRoleModal] = useState<{ open: boolean; staff: any | null; newRole: string }>({ open: false, staff: null, newRole: 'Finance' });
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; staff: any | null; newPassword: string }>({ open: false, staff: null, newPassword: '' });
  const [selfPasswordModal, setSelfPasswordModal] = useState(false);
  const [selfPasswordData, setSelfPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [foodPackages, setFoodPackages] = useState<FoodPackage[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [foodAdminSection, setFoodAdminSection] = useState<'orders' | 'packages' | 'inventory'>('orders');

  // Package modal state
  const [packageModal, setPackageModal] = useState<{ open: boolean; pkg: FoodPackage | null }>({ open: false, pkg: null });
  const [packageFormData, setPackageFormData] = useState({
    name: '',
    description: '',
    price: '',
    itemsStr: '',
    is_available: true
  });

  // Item modal state
  const [itemModal, setItemModal] = useState<{ open: boolean; item: FoodItem | null }>({ open: false, item: null });
  const [itemFormData, setItemFormData] = useState({
    name: '',
    category: 'Grains & Flours' as FoodItem['category'],
    unit: '',
    unit_price: '',
    in_stock: true
  });

  // Order status update state
  const [statusModal, setStatusModal] = useState<{ open: boolean; order: FoodOrder | null }>({ open: false, order: null });
  const [newStatus, setNewStatus] = useState<FoodOrder['status']>('pending');
  const [trackingNote, setTrackingNote] = useState('');
  const [foodOrdersSearch, setFoodOrdersSearch] = useState('');

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

    // 1. Supabase Realtime Subscription
    let channel: any = null;
    try {
      if (supabase) {
        channel = supabase
          .channel('super_admin_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions' },
            () => {
              refreshLists();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'users' },
            () => {
              refreshLists();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'staff_profiles' },
            () => {
              fetchStaffList();
            }
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn('[Admin Portal] Realtime subscription notice:', realtimeErr);
    }

    // 2. Fast background sync
    const interval = setInterval(() => {
      refreshLists();
    }, 4000);

    const handleFocus = () => {
      refreshLists();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cms]);

  const refreshLists = async () => {
    setUsers(DB.getUsers());
    setTransactions(DB.getTransactions());
    setSavingsPlans(DB.getSavingsPlans());
    setAuditLogs(DB.getAuditLogs());
    setFoodPackages(DB.getFoodPackages());
    setFoodItems(DB.getFoodItems());
    setFoodOrders(DB.getFoodOrders());
    fetchStaffList();

    try {
      const uRes = await fetch('/api/admin/users');
      const uData = await uRes.json();
      if (uData.success && uData.users && uData.users.length > 0) {
        setUsers(uData.users);
      }
    } catch (err) {
      console.warn('Failed to fetch live admin users:', err);
    }

    try {
      const tRes = await fetch('/api/finance/transactions');
      const tData = await tRes.json();
      if (tData.success && tData.transactions) {
        setTransactions(tData.transactions);
      }
    } catch (err) {
      console.warn('Failed to fetch live admin transactions:', err);
    }
  };

  const fetchStaffList = async () => {
    setLoadingStaff(true);
    setStaffError('');
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (data.success && data.staff) {
        setStaffList(data.staff);
      } else {
        setStaffError(data.error || 'Failed to load staff list.');
      }
    } catch {
      setStaffError('Unable to connect to server.');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addStaffData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Failed to create staff member.');
        return;
      }
      setSuccessMsg(data.message || 'Staff member created successfully.');
      setAddStaffModal(false);
      setAddStaffData({ name: '', email: '', role: 'Finance', password: '' });
      fetchStaffList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setStaffError('Network error while creating staff.');
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModal.staff) return;
    setStaffError('');
    try {
      const res = await fetch(`/api/staff/${roleModal.staff.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleModal.newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Failed to change staff role.');
        return;
      }
      setSuccessMsg(`Role for ${roleModal.staff.email} changed to ${roleModal.newRole}.`);
      setRoleModal({ open: false, staff: null, newRole: 'Finance' });
      fetchStaffList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setStaffError('Network error while changing role.');
    }
  };

  const handleToggleStatus = async (staff: any) => {
    setStaffError('');
    const newStatus = !staff.is_active;
    try {
      const res = await fetch(`/api/staff/${staff.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Failed to update staff status.');
        return;
      }
      setSuccessMsg(`Staff account ${staff.email} ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchStaffList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setStaffError('Network error while updating status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal.staff) return;
    setStaffError('');
    try {
      const res = await fetch(`/api/staff/${resetPasswordModal.staff.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordModal.newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Failed to reset password.');
        return;
      }
      setSuccessMsg(`Password for ${resetPasswordModal.staff.email} reset successfully.`);
      setResetPasswordModal({ open: false, staff: null, newPassword: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setStaffError('Network error while resetting password.');
    }
  };

  const handleChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    try {
      const res = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selfPasswordData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStaffError(data.error || 'Failed to change password.');
        return;
      }
      setSuccessMsg('Your password has been changed successfully.');
      setSelfPasswordModal(false);
      setSelfPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setStaffError('Network error while changing password.');
    }
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

  const handleApproveDeposit = async (txId: string) => {
    if (!currentStaff) return;
    try {
      const res = await fetch('/api/deposits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Deposit approved and credited.`);
        refreshLists();
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
      setStaffError(data.error || 'Transaction cannot be approved in its current state.');
      setTimeout(() => setStaffError(''), 5000);
    } catch (err: any) {
      setStaffError(err.message || 'Error communicating with server.');
      setTimeout(() => setStaffError(''), 5000);
    }
  };

  const handleRejectDeposit = async (txId: string) => {
    if (!currentStaff) return;
    const reason = window.prompt('Enter reason for declining deposit:') || 'Declined by administration.';
    try {
      const res = await fetch('/api/deposits/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Deposit declined.');
        refreshLists();
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
      setStaffError(data.error || 'Transaction cannot be rejected in its current state.');
      setTimeout(() => setStaffError(''), 5000);
    } catch (err: any) {
      setStaffError(err.message || 'Error communicating with server.');
      setTimeout(() => setStaffError(''), 5000);
    }
  };

  const handleApproveWithdrawal = async (txId: string) => {
    if (!currentStaff) return;
    try {
      const res = await fetch('/api/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Withdrawal approved and settled.');
        refreshLists();
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
      setStaffError(data.error || 'Withdrawal cannot be approved in its current state.');
      setTimeout(() => setStaffError(''), 5000);
    } catch (err: any) {
      setStaffError(err.message || 'Error communicating with server.');
      setTimeout(() => setStaffError(''), 5000);
    }
  };

  const handleRejectWithdrawal = async (txId: string) => {
    if (!currentStaff) return;
    const reason = window.prompt('Enter reason for declining withdrawal:') || 'Declined by administration.';
    try {
      const res = await fetch('/api/withdrawals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Withdrawal declined and escrow refunded.');
        refreshLists();
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
      setStaffError(data.error || 'Withdrawal cannot be declined in its current state.');
      setTimeout(() => setStaffError(''), 5000);
    } catch (err: any) {
      setStaffError(err.message || 'Error communicating with server.');
      setTimeout(() => setStaffError(''), 5000);
    }
  };

  const handleUnlockCustomer = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isLocked: false }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Customer profile unlocked.');
        refreshLists();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setStaffError(data.error || 'Failed to unlock user.');
        setTimeout(() => setStaffError(''), 5000);
      }
    } catch (err: any) {
      setStaffError(err.message || 'Failed to communicate with server.');
      setTimeout(() => setStaffError(''), 5000);
    }
  };

  // FOOD RESERVE MANAGEMENT HANDLERS
  const handleOpenPackageModal = (pkg?: FoodPackage) => {
    if (pkg) {
      setPackageModal({ open: true, pkg });
      setPackageFormData({
        name: pkg.name,
        description: pkg.description,
        price: pkg.price.toString(),
        itemsStr: pkg.items.join('\n'),
        is_available: pkg.is_available
      });
    } else {
      setPackageModal({ open: true, pkg: null });
      setPackageFormData({
        name: '',
        description: '',
        price: '',
        itemsStr: '',
        is_available: true
      });
    }
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(packageFormData.price);
    if (!packageFormData.name.trim() || isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid package name and price.");
      return;
    }

    const items = packageFormData.itemsStr
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (items.length === 0) {
      alert("Please enter at least one item included in this package.");
      return;
    }

    if (packageModal.pkg) {
      DB.updateFoodPackage(packageModal.pkg.id, {
        name: packageFormData.name.trim(),
        description: packageFormData.description.trim(),
        price: priceNum,
        items,
        is_available: packageFormData.is_available
      });
      DB.addAuditLog(currentStaff!.id, 'Updated Food Package', { packageId: packageModal.pkg.id, name: packageFormData.name });
      setSuccessMsg(`Food package "${packageFormData.name}" updated successfully.`);
    } else {
      DB.createFoodPackage({
        name: packageFormData.name.trim(),
        description: packageFormData.description.trim(),
        price: priceNum,
        items,
        is_available: packageFormData.is_available
      });
      DB.addAuditLog(currentStaff!.id, 'Created Food Package', { name: packageFormData.name, price: priceNum });
      setSuccessMsg(`New food package "${packageFormData.name}" created.`);
    }

    setPackageModal({ open: false, pkg: null });
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeletePackage = (id: string) => {
    if (!confirm("Are you sure you want to delete this food package?")) return;
    DB.deleteFoodPackage(id);
    DB.addAuditLog(currentStaff!.id, 'Deleted Food Package', { packageId: id });
    setSuccessMsg("Food package deleted.");
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleTogglePackageAvailability = (pkg: FoodPackage) => {
    DB.updateFoodPackage(pkg.id, { is_available: !pkg.is_available });
    DB.addAuditLog(currentStaff!.id, 'Toggled Food Package Availability', { packageId: pkg.id, is_available: !pkg.is_available });
    refreshLists();
  };

  const handleOpenItemModal = (item?: FoodItem) => {
    if (item) {
      setItemModal({ open: true, item });
      setItemFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        unit_price: item.unit_price.toString(),
        in_stock: item.in_stock
      });
    } else {
      setItemModal({ open: true, item: null });
      setItemFormData({
        name: '',
        category: 'Grains & Flours',
        unit: '',
        unit_price: '',
        in_stock: true
      });
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(itemFormData.unit_price);
    if (!itemFormData.name.trim() || !itemFormData.unit.trim() || isNaN(priceNum) || priceNum <= 0) {
      alert("Please fill in valid name, unit, and unit price.");
      return;
    }

    if (itemModal.item) {
      DB.updateFoodItem(itemModal.item.id, {
        name: itemFormData.name.trim(),
        category: itemFormData.category,
        unit: itemFormData.unit.trim(),
        unit_price: priceNum,
        in_stock: itemFormData.in_stock
      });
      DB.addAuditLog(currentStaff!.id, 'Updated Grocery Inventory Item', { itemId: itemModal.item.id, name: itemFormData.name });
      setSuccessMsg(`Item "${itemFormData.name}" updated.`);
    } else {
      DB.createFoodItem({
        name: itemFormData.name.trim(),
        category: itemFormData.category,
        unit: itemFormData.unit.trim(),
        unit_price: priceNum,
        in_stock: itemFormData.in_stock
      });
      DB.addAuditLog(currentStaff!.id, 'Created Grocery Inventory Item', { name: itemFormData.name, price: priceNum });
      setSuccessMsg(`New item "${itemFormData.name}" added to catalog.`);
    }

    setItemModal({ open: false, item: null });
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm("Are you sure you want to remove this item from catalog?")) return;
    DB.deleteFoodItem(id);
    DB.addAuditLog(currentStaff!.id, 'Deleted Grocery Inventory Item', { itemId: id });
    setSuccessMsg("Grocery item deleted.");
    refreshLists();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleItemStock = (item: FoodItem) => {
    DB.updateFoodItem(item.id, { in_stock: !item.in_stock });
    DB.addAuditLog(currentStaff!.id, 'Toggled Grocery Item Stock Status', { itemId: item.id, in_stock: !item.in_stock });
    refreshLists();
  };

  const handleOpenStatusModal = (order: FoodOrder) => {
    setStatusModal({ open: true, order });
    setNewStatus(order.status);
    setTrackingNote(order.courier_notes || '');
  };

  const handleSaveOrderStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal.order) return;

    DB.updateFoodOrderStatus(statusModal.order.id, newStatus, trackingNote.trim());
    DB.addAuditLog(currentStaff!.id, 'Updated Food Order Status', {
      orderId: statusModal.order.id,
      status: newStatus,
      trackingNote: trackingNote.trim()
    });

    setSuccessMsg(`Order ${statusModal.order.id} status updated to ${newStatus.toUpperCase()}. Client notified.`);
    setStatusModal({ open: false, order: null });
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
            <div className="flex items-center gap-1.5 bg-card-bg/50 border border-border/30 rounded-xl px-3 py-1.5">
              <Eye size={12} className="text-zinc-400" />
              <span className="text-[10px] text-zinc-400 font-bold">Viewing as:</span>
              <select
                value={viewingAsRole}
                onChange={(e) => setViewingAsRole(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold text-primary border-none focus:outline-none cursor-pointer font-mono"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Finance">Finance</option>
                <option value="Customer Support">Customer Support</option>
              </select>
            </div>
            <button 
              onClick={() => {
                setStaffError('');
                setSelfPasswordModal(true);
              }}
              title="Change My Password"
              className="text-zinc-400 hover:text-foreground p-2.5 rounded-xl hover:bg-neutral-gray transition-colors cursor-pointer border border-border/30 bg-card-bg/50 flex items-center gap-1.5 text-xs font-bold"
            >
              <Key size={14} />
              <span className="hidden sm:inline">Change Password</span>
            </button>
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
        
        {/* VIEWING AS ROLE WORKSPACE BANNER */}
        {viewingAsRole !== 'Super Admin' && (
          <div className={`p-4 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border animate-fade-in ${
            viewingAsRole === 'Finance' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}>
            <div className="flex items-center gap-2">
              <Eye size={16} className="shrink-0" />
              <span>
                <strong>Viewing Workspace as: {viewingAsRole}</strong> — You are viewing the live {viewingAsRole} workspace. Your Super Admin administrative permissions remain active in the backend.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewingAsRole('Super Admin')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer self-start sm:self-auto ${
                viewingAsRole === 'Finance' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              Reset to Super Admin View
            </button>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 text-xs p-4 rounded-2xl mb-6 flex items-center gap-2.5 font-bold font-sans animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: FINANCE WORKSPACE VIEW */}
        {viewingAsRole === 'Finance' && (
          <div className="space-y-8 animate-fade-in">
            {/* Finance Metrics Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm hover-lift space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Deposits</span>
                <strong className="text-lg font-mono font-black block text-foreground">
                  ₦{transactions.filter(t => t.type === 'deposit').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {transactions.filter(t => t.type === 'deposit').length} total requests
                </span>
              </div>
              <div className="bg-card-bg border border-amber-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-amber-500/5">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Pending Deposits</span>
                <strong className="text-lg font-mono font-black block text-amber-400">
                  ₦{transactions.filter(t => t.type === 'deposit' && t.status === 'pending').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-amber-500/80 block">
                  {transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length} awaiting review
                </span>
              </div>
              <div className="bg-card-bg border border-emerald-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-emerald-500/5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Approved Deposits</span>
                <strong className="text-lg font-mono font-black block text-emerald-400">
                  ₦{transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-emerald-500/80 block">
                  {transactions.filter(t => t.type === 'deposit' && t.status === 'completed').length} credited
                </span>
              </div>
              <div className="bg-card-bg border border-red-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-red-500/5">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Declined Deposits</span>
                <strong className="text-lg font-mono font-black block text-red-400">
                  ₦{transactions.filter(t => t.type === 'deposit' && t.status === 'rejected').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-red-500/80 block">
                  {transactions.filter(t => t.type === 'deposit' && t.status === 'rejected').length} rejected
                </span>
              </div>
              <div className="bg-card-bg border border-border/40 p-5 rounded-3xl shadow-sm hover-lift space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Withdrawals</span>
                <strong className="text-lg font-mono font-black block text-foreground">
                  ₦{transactions.filter(t => t.type === 'withdrawal').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {transactions.filter(t => t.type === 'withdrawal').length} total requests
                </span>
              </div>
              <div className="bg-card-bg border border-amber-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-amber-500/5">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Pending Withdrawals</span>
                <strong className="text-lg font-mono font-black block text-amber-400">
                  ₦{transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-amber-500/80 block">
                  {transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length} awaiting review
                </span>
              </div>
              <div className="bg-card-bg border border-emerald-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-emerald-500/5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Approved Withdrawals</span>
                <strong className="text-lg font-mono font-black block text-emerald-400">
                  ₦{transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-emerald-500/80 block">
                  {transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').length} settled
                </span>
              </div>
              <div className="bg-card-bg border border-red-500/30 p-5 rounded-3xl shadow-sm hover-lift space-y-1 bg-red-500/5">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Declined Withdrawals</span>
                <strong className="text-lg font-mono font-black block text-red-400">
                  ₦{transactions.filter(t => t.type === 'withdrawal' && t.status === 'rejected').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </strong>
                <span className="text-[10px] font-mono text-red-500/80 block">
                  {transactions.filter(t => t.type === 'withdrawal' && t.status === 'rejected').length} refunded
                </span>
              </div>
            </div>

            {/* Pending Finance Approvals Queue */}
            <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-xs hover-lift">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-sm font-display text-foreground">Pending Finance Approvals Queue</h3>
                    <p className="text-[10px] text-zinc-400">Database source of truth for pending deposits and withdrawals</p>
                  </div>
                </div>
                <button
                  onClick={refreshLists}
                  className="px-3 py-1.5 rounded-xl border border-border/50 bg-neutral-gray/50 hover:bg-neutral-gray text-zinc-400 hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw size={12} /> Refresh Queue
                </button>
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
                    {transactions.filter(t => t.status === 'pending').map((tx: any) => {
                      const user = users.find(u => u.id === tx.user_id);
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-foreground block">{tx.reference}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {new Date(tx.created_at).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              tx.type === 'deposit'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-foreground block">
                              {tx.user?.name || tx.users?.name || user?.name || 'Customer'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              {tx.user?.email || tx.users?.email || user?.email || ''}
                            </span>
                            {(tx.user?.phone || tx.users?.phone || user?.phone) && (
                              <span className="text-[9px] text-zinc-500 font-mono block">
                                {tx.user?.phone || tx.users?.phone || user?.phone}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-extrabold text-foreground text-sm">
                            ₦{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 text-[11px] max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => tx.type === 'withdrawal' ? handleApproveWithdrawal(tx.id) : handleApproveDeposit(tx.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => tx.type === 'withdrawal' ? handleRejectWithdrawal(tx.id) : handleRejectDeposit(tx.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              Decline
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.filter(t => t.status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400 font-semibold">
                          ✓ All clear! No pending deposits or withdrawals in the review queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Full Transaction History Ledger */}
            <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-xs hover-lift">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <div>
                    <h3 className="font-bold text-sm font-display text-foreground">Transaction History Ledger</h3>
                    <p className="text-[10px] text-zinc-400">Database source of truth for all financial transactions</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Total: {transactions.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                      <th className="py-3 px-4">Ref / Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {transactions.map((tx: any) => {
                      const user = users.find(u => u.id === tx.user_id);
                      return (
                        <tr key={tx.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-foreground block">{tx.reference}</span>
                            <span className="text-[9px] text-zinc-500">{new Date(tx.created_at).toLocaleString()}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[10px] uppercase">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                              tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' :
                              tx.type === 'withdrawal' ? 'bg-blue-500/10 text-blue-400' :
                              tx.type === 'penalty_fee' ? 'bg-red-500/10 text-red-400' :
                              'bg-purple-500/10 text-purple-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-foreground block">{tx.user?.name || tx.users?.name || user?.name || 'Customer'}</span>
                            <span className="text-[9px] text-zinc-500 font-mono">{tx.user?.email || tx.users?.email || user?.email || ''}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            ₦{Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 text-[10px] max-w-xs truncate">
                            {tx.description}
                            {tx.rejection_reason && (
                              <span className="block text-[9px] text-red-400 italic">Reason: {tx.rejection_reason}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase font-mono ${
                              tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              tx.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {tx.status === 'completed' ? 'Approved' : tx.status === 'rejected' ? 'Declined' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400">No transactions recorded in database yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMER SUPPORT WORKSPACE VIEW */}
        {viewingAsRole === 'Customer Support' && (
          <div className="space-y-8 animate-fade-in">
            {/* Customer Support Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-card-bg border border-border/40 p-6 rounded-3xl shadow-sm text-center hover-lift space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Customers</span>
                <strong className="text-2xl font-mono font-black text-foreground block">{users.length}</strong>
                <span className="text-[10px] text-zinc-500">Registered platform users</span>
              </div>

              <div className="bg-card-bg border border-emerald-500/30 p-6 rounded-3xl shadow-sm text-center hover-lift space-y-1 bg-emerald-500/5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Active Customers</span>
                <strong className="text-2xl font-mono font-black text-emerald-400 block">{users.filter(u => !u.is_locked).length}</strong>
                <span className="text-[10px] text-emerald-500/80">Operational accounts</span>
              </div>

              <div className="bg-card-bg border border-primary/30 p-6 rounded-3xl shadow-sm text-center hover-lift space-y-1 bg-primary/5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Verified Customers</span>
                <strong className="text-2xl font-mono font-black text-primary block">{users.filter(u => u.is_verified).length}</strong>
                <span className="text-[10px] text-primary/80">2FA / OTP verified</span>
              </div>
            </div>

            {/* Customer Directory Table */}
            <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-4 text-xs hover-lift">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <div>
                    <h3 className="font-bold text-sm font-display text-foreground">Registered Customer Directory</h3>
                    <p className="text-[10px] text-zinc-400">Confidential customer lookup & support management (Passwords/PINs secured)</p>
                  </div>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-input-bg border border-border/60 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Contact / WhatsApp</th>
                      <th className="py-3 px-4">Wallet Balance</th>
                      <th className="py-3 px-4">Savings Plans</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {users
                      .filter(c => 
                        c.name?.toLowerCase().includes(usersSearch.toLowerCase()) || 
                        c.email?.toLowerCase().includes(usersSearch.toLowerCase()) ||
                        (c.phone && c.phone.includes(usersSearch))
                      )
                      .map((cust: any) => (
                        <tr key={cust.id} className="hover:bg-neutral-gray/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <strong className="text-foreground block">{cust.name}</strong>
                            <span className="text-[10px] text-zinc-400 font-mono">{cust.email}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-300">
                            {cust.phone || 'Not provided'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            ₦{Number(cust.wallet?.wallet_balance ?? (DB.getWalletForUser(cust.id)?.wallet_balance || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-primary font-bold">
                            {cust.savings_plans?.length ?? savingsPlans.filter(p => p.user_id === cust.id).length} active
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400">
                            {new Date(cust.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${cust.is_locked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {cust.is_locked ? 'Locked' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {cust.is_locked ? (
                              <button
                                onClick={() => handleUnlockCustomer(cust.id)}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Unlock Profile
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400">No registered customers found in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUPER ADMIN TABS (DEFAULT VIEW) */}
        {viewingAsRole === 'Super Admin' && (
          <>
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
                  setActiveSubTab('staff');
                  fetchStaffList();
                }}
                className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display flex items-center gap-1.5 ${activeSubTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
              >
                <Shield size={14} />
                <span>Staff Management</span>
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                  {staffList.length}
                </span>
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
              <button 
                onClick={() => {
                  setActiveSubTab('food_reserve');
                  refreshLists();
                }}
                className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display flex items-center gap-1.5 ${activeSubTab === 'food_reserve' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
              >
                <ShoppingBag size={14} />
                <span>Food Reserve & Orders</span>
                {foodOrders.filter(o => o.status === 'pending').length > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                    {foodOrders.filter(o => o.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
          </>
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
                  <span className="block text-[9px] text-zinc-400">Days locked accounts remain absolutely frozen.</span>
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

        {/* SUBTAB: STAFF MANAGEMENT */}
        {activeSubTab === 'staff' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-xs font-sans hover-lift animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-primary" />
                  Staff Officers & RBAC Directory
                </h3>
                <p className="text-xs text-zinc-400">Manage backoffice accounts, roles, access permissions, and credential security.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setStaffError('');
                  setAddStaffModal(true);
                }}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-primary/20 cursor-pointer self-start sm:self-center"
              >
                <UserPlus size={15} />
                Register Staff Account
              </button>
            </div>

            {staffError && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold">
                <AlertTriangle size={16} />
                <span>{staffError}</span>
              </div>
            )}

            {loadingStaff ? (
              <div className="py-12 text-center text-zinc-400 font-mono text-xs">
                Loading backoffice staff directory...
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No staff accounts found. Click "Register Staff Account" above to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                      <th className="py-3 px-4">Staff Officer</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Permissions Scope</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {staffList.map((st) => (
                      <tr key={st.id} className="hover:bg-neutral-gray/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground">{st.name}</div>
                          <div className="text-[11px] font-mono text-zinc-400">{st.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            st.role === 'Super Admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : st.role === 'Finance'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : st.role === 'Operations'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : st.role === 'Compliance'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-border'
                          }`}>
                            {st.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {Array.isArray(st.permissions) && st.permissions.map((perm: string, pIdx: number) => (
                              <span key={pIdx} className="text-[9px] font-mono bg-neutral-gray text-zinc-400 px-1.5 py-0.5 rounded">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {st.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <UserCheck size={12} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded-full">
                              <UserX size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-zinc-400 font-mono text-[10px]">
                          {st.created_at ? new Date(st.created_at).toLocaleDateString() : 'System Seed'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setStaffError('');
                                setRoleModal({ open: true, staff: st, newRole: st.role });
                              }}
                              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border hover:bg-neutral-gray text-zinc-300 hover:text-foreground transition-colors cursor-pointer"
                            >
                              Change Role
                            </button>
                            <button
                              onClick={() => {
                                setStaffError('');
                                setResetPasswordModal({ open: true, staff: st, newPassword: '' });
                              }}
                              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border hover:bg-neutral-gray text-zinc-300 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Key size={11} /> Reset Pwd
                            </button>
                            <button
                              onClick={() => handleToggleStatus(st)}
                              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                st.is_active
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {st.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                              onClick={() => tx.type === 'withdrawal' ? handleApproveWithdrawal(tx.id) : handleApproveDeposit(tx.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 font-sans"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => tx.type === 'withdrawal' ? handleRejectWithdrawal(tx.id) : handleRejectDeposit(tx.id)}
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

        {/* 6. FOOD RESERVE & ORDERS TAB */}
        {activeSubTab === 'food_reserve' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 bg-card-bg border border-border/40 rounded-3xl shadow-sm">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Active Food Reserves</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {savingsPlans.filter(p => p.type === 'food' && p.status === 'active').length}
                </span>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  ₦{savingsPlans.filter(p => p.type === 'food' && p.status === 'active').reduce((sum, p) => sum + p.saved_amount, 0).toLocaleString()} volume
                </p>
              </div>

              <div className="p-5 bg-card-bg border border-border/40 rounded-3xl shadow-sm">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Total Orders Booked</span>
                <span className="text-xl font-bold font-mono text-foreground">{foodOrders.length}</span>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  ₦{foodOrders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()} redeemed
                </p>
              </div>

              <div className="p-5 bg-card-bg border border-border/40 rounded-3xl shadow-sm">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Pending Deliveries</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {foodOrders.filter(o => o.status === 'pending' || o.status === 'processing').length}
                </span>
                <p className="text-[10px] text-zinc-400 mt-1">Requires dispatch fulfillment</p>
              </div>

              <div className="p-5 bg-card-bg border border-border/40 rounded-3xl shadow-sm">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Completed Deliveries</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {foodOrders.filter(o => o.status === 'delivered').length}
                </span>
                <p className="text-[10px] text-zinc-400 mt-1">Fulfilled successfully</p>
              </div>
            </div>

            {/* Sub-Section Navigation */}
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFoodAdminSection('orders')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${foodAdminSection === 'orders' ? 'bg-primary text-white shadow-sm' : 'bg-neutral-gray/30 text-zinc-400 hover:text-foreground'}`}
                >
                  <Truck size={13} />
                  <span>Orders & Deliveries ({foodOrders.length})</span>
                </button>
                <button
                  onClick={() => setFoodAdminSection('packages')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${foodAdminSection === 'packages' ? 'bg-primary text-white shadow-sm' : 'bg-neutral-gray/30 text-zinc-400 hover:text-foreground'}`}
                >
                  <ShoppingBag size={13} />
                  <span>Preset Packages ({foodPackages.length})</span>
                </button>
                <button
                  onClick={() => setFoodAdminSection('inventory')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${foodAdminSection === 'inventory' ? 'bg-primary text-white shadow-sm' : 'bg-neutral-gray/30 text-zinc-400 hover:text-foreground'}`}
                >
                  <Utensils size={13} />
                  <span>Grocery Inventory ({foodItems.length})</span>
                </button>
              </div>

              {foodAdminSection === 'packages' && (
                <button
                  onClick={() => handleOpenPackageModal()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Add Food Package</span>
                </button>
              )}

              {foodAdminSection === 'inventory' && (
                <button
                  onClick={() => handleOpenItemModal()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Add Grocery Item</span>
                </button>
              )}
            </div>

            {/* SECTION 1: ORDERS & DELIVERIES */}
            {foodAdminSection === 'orders' && (
              <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Food Redemptions & Dispatch Queue</h3>
                    <p className="text-[10px] text-zinc-400">Manage order fulfillment, delivery tracking codes, and status notices</p>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search orders, customers, phone..."
                      value={foodOrdersSearch}
                      onChange={(e) => setFoodOrdersSearch(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none w-64"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/30 text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                        <th className="py-3 px-3">Order / Date</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Order Type & Items</th>
                        <th className="py-3 px-3">Value</th>
                        <th className="py-3 px-3">Delivery Address</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {foodOrders
                        .filter(o => {
                          if (!foodOrdersSearch) return true;
                          const q = foodOrdersSearch.toLowerCase();
                          return o.id.toLowerCase().includes(q) ||
                            o.user_name.toLowerCase().includes(q) ||
                            o.user_email.toLowerCase().includes(q) ||
                            o.delivery_phone.includes(q) ||
                            o.tracking_code.toLowerCase().includes(q);
                        })
                        .map(order => (
                          <tr key={order.id} className="hover:bg-neutral-gray/20 transition-colors">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-foreground block font-mono text-[11px]">{order.id}</span>
                              <span className="text-[9px] text-zinc-400 font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                              <span className="text-[9px] text-emerald-400 font-mono block">Trk: {order.tracking_code}</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-foreground block">{order.user_name}</span>
                              <span className="text-[10px] text-zinc-400">{order.user_email}</span>
                              <span className="text-[9px] text-zinc-500 block font-mono">{order.delivery_phone}</span>
                            </td>
                            <td className="py-3.5 px-3 max-w-xs">
                              <span className="text-[10px] font-bold uppercase text-primary block">
                                {order.order_type === 'preset_package' ? order.package_name : 'Custom Basket'}
                              </span>
                              {order.custom_items && (
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                  {order.custom_items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <span className="font-bold text-foreground">₦{order.total_amount.toLocaleString()}</span>
                              {order.change_refunded > 0 && (
                                <span className="text-[9px] text-emerald-400 block">+₦{order.change_refunded.toLocaleString()} change</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-[10px] text-zinc-300 max-w-xs truncate" title={order.delivery_address}>
                              {order.delivery_address}
                              {order.delivery_notes && <span className="text-[9px] text-zinc-500 block italic">Notes: {order.delivery_notes}</span>}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : order.status === 'dispatched' ? 'bg-purple-500/10 text-purple-400' : order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' : order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {order.status}
                              </span>
                              {order.courier_notes && (
                                <p className="text-[9px] text-zinc-400 mt-1 max-w-[120px] truncate" title={order.courier_notes}>
                                  {order.courier_notes}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <button
                                onClick={() => handleOpenStatusModal(order)}
                                className="bg-neutral-gray/60 hover:bg-neutral-gray text-foreground font-bold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                              >
                                Update Status
                              </button>
                            </td>
                          </tr>
                        ))}

                      {foodOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs font-semibold">
                            No food redemption orders yet. Matured Food Reserve plans will appear here once redeemed.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 2: PRESET PACKAGES */}
            {foodAdminSection === 'packages' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {foodPackages.map(pkg => (
                  <div key={pkg.id} className="p-5 bg-card-bg border border-border/40 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${pkg.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {pkg.is_available ? 'Available' : 'Out of Stock'}
                        </span>
                        <span className="font-extrabold text-foreground font-mono text-sm">₦{pkg.price.toLocaleString()}</span>
                      </div>

                      <h4 className="font-bold text-sm text-foreground mb-1">{pkg.name}</h4>
                      <p className="text-[11px] text-zinc-400 mb-4">{pkg.description}</p>

                      <div className="space-y-1.5 border-t border-border/20 pt-3 mb-4">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Items Included:</span>
                        {pkg.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                            <Check size={10} className="text-emerald-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/20 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => handleTogglePackageAvailability(pkg)}
                        className="text-[10px] font-bold text-zinc-400 hover:text-foreground cursor-pointer"
                      >
                        {pkg.is_available ? 'Mark Out of Stock' : 'Mark Available'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenPackageModal(pkg)}
                          className="p-1.5 text-zinc-400 hover:text-foreground rounded-lg hover:bg-neutral-gray cursor-pointer"
                          title="Edit Package"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 cursor-pointer"
                          title="Delete Package"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SECTION 3: GROCERY INVENTORY */}
            {foodAdminSection === 'inventory' && (
              <div className="bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Custom Basket Grocery Catalog</h3>
                    <p className="text-[10px] text-zinc-400">Inventory items available for customers to build custom food baskets</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/30 text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                        <th className="py-3 px-3">Item Name</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Packaging / Unit</th>
                        <th className="py-3 px-3">Unit Price</th>
                        <th className="py-3 px-3">Stock Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {foodItems.map(item => (
                        <tr key={item.id} className="hover:bg-neutral-gray/20 transition-colors">
                          <td className="py-3 px-3 font-bold text-foreground">{item.name}</td>
                          <td className="py-3 px-3 text-[10px] text-zinc-400">{item.category}</td>
                          <td className="py-3 px-3 text-[10px] font-mono text-zinc-300">{item.unit}</td>
                          <td className="py-3 px-3 font-bold font-mono text-foreground">₦{item.unit_price.toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleToggleItemStock(item)}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono cursor-pointer ${item.in_stock ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                            >
                              {item.in_stock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenItemModal(item)}
                                className="p-1.5 text-zinc-400 hover:text-foreground rounded-lg hover:bg-neutral-gray cursor-pointer"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PACKAGE MODAL */}
        {packageModal.open && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setPackageModal({ open: false, pkg: null })}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1">
                {packageModal.pkg ? 'Edit Food Package' : 'Create Preset Food Package'}
              </h3>
              <p className="text-xs text-zinc-400 mb-5">Configure curated food bundle available for client redemption.</p>

              <form onSubmit={handleSavePackage} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Package Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Family Protein & Grain Hamper"
                    value={packageFormData.name}
                    onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Brief overview of bundle contents..."
                    value={packageFormData.description}
                    onChange={(e) => setPackageFormData({ ...packageFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    placeholder="e.g. 75000"
                    value={packageFormData.price}
                    onChange={(e) => setPackageFormData({ ...packageFormData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Items Included (1 item per line)</label>
                  <textarea
                    rows={4}
                    placeholder={"1x 50kg Royal Rice\n1x 25L Vegetable Oil\n2x Cartons Noodles"}
                    value={packageFormData.itemsStr}
                    onChange={(e) => setPackageFormData({ ...packageFormData, itemsStr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none font-mono text-[11px]"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pkg_avail"
                    checked={packageFormData.is_available}
                    onChange={(e) => setPackageFormData({ ...packageFormData, is_available: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <label htmlFor="pkg_avail" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                    Available for client redemption
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Save Food Package
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ITEM MODAL */}
        {itemModal.open && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setItemModal({ open: false, item: null })}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1">
                {itemModal.item ? 'Edit Grocery Item' : 'Add Grocery Item'}
              </h3>
              <p className="text-xs text-zinc-400 mb-5">Configure individual item in custom basket catalog.</p>

              <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Long Grain Rice"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value as any })}
                      className="w-full px-3 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    >
                      <option value="Grains & Flours">Grains & Flours</option>
                      <option value="Oils & Condiments">Oils & Condiments</option>
                      <option value="Proteins & Meat">Proteins & Meat</option>
                      <option value="Packaged & Household">Packaged & Household</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Unit / Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 50kg Bag"
                      value={itemFormData.unit}
                      onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Unit Price (NGN)</label>
                  <input
                    type="number"
                    placeholder="e.g. 80000"
                    value={itemFormData.unit_price}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="item_stock"
                    checked={itemFormData.in_stock}
                    onChange={(e) => setItemFormData({ ...itemFormData, in_stock: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <label htmlFor="item_stock" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                    In Stock (available for custom baskets)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Save Catalog Item
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ORDER STATUS MODAL */}
        {statusModal.open && statusModal.order && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setStatusModal({ open: false, order: null })}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1">
                Update Order Delivery Status
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Order <span className="font-mono text-primary font-bold">{statusModal.order.id}</span> · {statusModal.order.user_name}
              </p>

              <form onSubmit={handleSaveOrderStatus} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fulfillment Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="pending">Pending (Awaiting fulfillment)</option>
                    <option value="processing">Processing (Preparing package)</option>
                    <option value="dispatched">Dispatched (With Courier)</option>
                    <option value="delivered">Delivered (Completed)</option>
                    <option value="cancelled">Cancelled (Declined/Terminated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Courier / Dispatch Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Dispatched via GIG Logistics. Driver contact: +234 802 000 0000"
                    value={trackingNote}
                    onChange={(e) => setTrackingNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none text-xs"
                  />
                </div>

                <div className="p-3 bg-neutral-gray/30 rounded-xl text-[10px] text-zinc-400 space-y-1">
                  <div><strong>Address:</strong> {statusModal.order.delivery_address}</div>
                  <div><strong>Recipient Phone:</strong> {statusModal.order.delivery_phone}</div>
                  <div><strong>Tracking Code:</strong> {statusModal.order.tracking_code}</div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Save Status & Notify Customer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 1: REGISTER / INVITE STAFF MEMBER */}
        {addStaffModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setAddStaffModal(false)}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1 flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                Register Staff Officer
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Provision a verified backoffice staff account with strict role-based access.
              </p>

              {staffError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl mb-4">
                  {staffError}
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={addStaffData.name}
                    onChange={(e) => setAddStaffData({ ...addStaffData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Work Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@affysavings.com"
                    value={addStaffData.email}
                    onChange={(e) => setAddStaffData({ ...addStaffData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Assigned Backoffice Role</label>
                  <select
                    value={addStaffData.role}
                    onChange={(e) => setAddStaffData({ ...addStaffData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="Super Admin">Super Admin (Full System Control)</option>
                    <option value="Operations">Operations (User Management & Approvals)</option>
                    <option value="Customer Support">Customer Support (User & Transaction Inquiry)</option>
                    <option value="Compliance">Compliance (KYC, Audits & Account Unlocks)</option>
                    <option value="Finance">Finance (Transaction Approvals & Metrics)</option>
                    <option value="Content Manager">Content Manager (CMS & Landing Page)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Initial Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    placeholder="Create secure staff password"
                    value={addStaffData.password}
                    onChange={(e) => setAddStaffData({ ...addStaffData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                <div className="p-3 bg-neutral-gray/40 rounded-xl text-[10px] text-zinc-400 space-y-1">
                  <div><strong>Role Permissions:</strong> Derived automatically by server based on role.</div>
                  <div><strong>Authentication:</strong> Encrypted using production scrypt hash engine.</div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Create & Activate Staff Officer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CHANGE ROLE MODAL */}
        {roleModal.open && roleModal.staff && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setRoleModal({ open: false, staff: null, newRole: 'Finance' })}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1">
                Change Staff Role
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Modify role and auto-derive permissions for <span className="font-mono text-primary font-bold">{roleModal.staff.email}</span>
              </p>

              {staffError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl mb-4">
                  {staffError}
                </div>
              )}

              <form onSubmit={handleChangeRole} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">New Role</label>
                  <select
                    value={roleModal.newRole}
                    onChange={(e) => setRoleModal({ ...roleModal, newRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="Super Admin">Super Admin (Full System Control)</option>
                    <option value="Operations">Operations (User Management & Approvals)</option>
                    <option value="Customer Support">Customer Support (User & Transaction Inquiry)</option>
                    <option value="Compliance">Compliance (KYC, Audits & Account Unlocks)</option>
                    <option value="Finance">Finance (Transaction Approvals & Metrics)</option>
                    <option value="Content Manager">Content Manager (CMS & Landing Page)</option>
                  </select>
                </div>

                <div className="p-3 bg-neutral-gray/40 rounded-xl text-[10px] text-zinc-400 space-y-1">
                  <div><strong>Current Role:</strong> {roleModal.staff.role}</div>
                  <div><strong>Target Role:</strong> {roleModal.newRole}</div>
                  <div><strong>Audit:</strong> Role changes are permanently recorded in system audit logs.</div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Save New Role
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: RESET STAFF PASSWORD MODAL */}
        {resetPasswordModal.open && resetPasswordModal.staff && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setResetPasswordModal({ open: false, staff: null, newPassword: '' })}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1 flex items-center gap-2">
                <Key size={18} className="text-primary" />
                Reset Staff Password
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Assign a new password for <span className="font-mono text-primary font-bold">{resetPasswordModal.staff.email}</span>.
              </p>

              {staffError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl mb-4">
                  {staffError}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">New Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={resetPasswordModal.newPassword}
                    onChange={(e) => setResetPasswordModal({ ...resetPasswordModal, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                <div className="p-3 bg-neutral-gray/40 rounded-xl text-[10px] text-zinc-400 space-y-1">
                  <div><strong>Security:</strong> The plaintext password will never be logged or displayed.</div>
                  <div><strong>Storage:</strong> Stored securely as an scrypt hash.</div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Confirm Password Reset
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: SELF-SERVICE PASSWORD CHANGE MODAL */}
        {selfPasswordModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card-bg border border-border/50 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
              <button
                onClick={() => setSelfPasswordModal(false)}
                className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold font-display text-foreground mb-1 flex items-center gap-2">
                <Key size={18} className="text-primary" />
                Change My Password
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Update your backoffice credentials.
              </p>

              {staffError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl mb-4">
                  {staffError}
                </div>
              )}

              <form onSubmit={handleChangeSelfPassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={selfPasswordData.currentPassword}
                    onChange={(e) => setSelfPasswordData({ ...selfPasswordData, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">New Password (Min 8 Characters)</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={selfPasswordData.newPassword}
                    onChange={(e) => setSelfPasswordData({ ...selfPasswordData, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={selfPasswordData.confirmPassword}
                    onChange={(e) => setSelfPasswordData({ ...selfPasswordData, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold cursor-pointer transition-opacity mt-4"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
