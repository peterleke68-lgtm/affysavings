'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, logSimulation, Transaction, LinkedAccount, SystemNotification, SavingsPlan } from '@/services/db';
import AffyLogo from '@/components/AffyLogo';
import { 
  Wallet, 
  Send, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Plus, 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  TrendingUp, 
  CreditCard, 
  ShieldCheck, 
  Download, 
  X, 
  Trash2,
  FileSpreadsheet,
  Lock,
  Target,
  Calendar,
  Sparkles,
  ArrowLeft,
  Copy,
  Smartphone,
  Landmark,
  Clock,
  MessageCircle,
  RefreshCw,
  Award,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, cms } = useApp();

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    }
  }, [currentUser, router]);

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'cards'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Notification States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Add Savings Modal State
  const [addSavingsModal, setAddSavingsModal] = useState(false);
  const [newSavingsData, setNewSavingsData] = useState({
    name: '',
    type: 'locked' as 'locked' | 'fixed' | 'target',
    targetAmount: '',
    durationDays: '90' // default to 90 days for locked
  });

  // Top Up Modal State
  const [topUpModal, setTopUpModal] = useState<{ open: boolean; planId: string }>({ open: false, planId: '' });
  const [topUpAmount, setTopUpAmount] = useState('');
  
  // Break Savings Warning Modal State
  const [breakPlanModal, setBreakPlanModal] = useState<{ open: boolean; planId: string }>({ open: false, planId: '' });

  // Dialog / Action States
  const [transferError, setTransferError] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Link Account Dialog State
  const [linkAccountModal, setLinkAccountModal] = useState(false);
  const [linkAccountData, setLinkAccountData] = useState({
    bankName: 'Chase Bank',
    accountNumber: '',
    accountHolder: currentUser?.name || ''
  });
  
  // Deposit Dialog State
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSource, setDepositSource] = useState('');

  // Withdrawal Dialog State
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSource, setWithdrawSource] = useState('');

  // eTranzact checkout state
  const [tranzactView, setTranzactView] = useState<'amount' | 'select' | 'card' | 'otp' | 'bank' | 'pocket' | 'success'>('amount');
  const [tranzactAmount, setTranzactAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', pin: '' });
  const [pocketMoniPhone, setPocketMoniPhone] = useState('');
  const [pocketMoniPin, setPocketMoniPin] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [virtualAccountNum, setVirtualAccountNum] = useState('');

  const closeDepositModal = () => {
    setDepositModal(false);
    setTranzactView('amount');
    setTranzactAmount('');
    setCardDetails({ number: '', expiry: '', cvv: '', pin: '' });
    setPocketMoniPhone('');
    setPocketMoniPin('');
    setGeneratedOTP('');
    setEnteredOTP('');
    setOtpError('');
    setIsProcessing(false);
    setVirtualAccountNum('');
  };

  const closeWithdrawModal = () => {
    setWithdrawModal(false);
    setWithdrawAmount('');
    if (linkedAccounts.length > 0) {
      setWithdrawSource(linkedAccounts.find(a => a.is_default)?.id || linkedAccounts[0].id);
    }
  };

  // Client Side safety check
  const [isMounted, setIsMounted] = useState(false);

  // Load user specific data
  useEffect(() => {
    if (!currentUser) return;
    setIsMounted(true);
    refreshData();

    const handleNotificationUpdate = () => {
      refreshNotifications();
    };
    window.addEventListener('new_in_app_notification', handleNotificationUpdate);
    return () => window.removeEventListener('new_in_app_notification', handleNotificationUpdate);
  }, [currentUser]);

  const refreshData = () => {
    if (!currentUser) return;
    setWallet(DB.getWalletForUser(currentUser.id));
    
    const txs = DB.getTransactions().filter(t => t.user_id === currentUser.id);
    setTransactions(txs);

    const plans = DB.getSavingsPlans().filter(p => p.user_id === currentUser.id);
    setSavingsPlans(plans);

    const accs = DB.getLinkedAccounts().filter(a => a.user_id === currentUser.id);
    setLinkedAccounts(accs);
    if (accs.length > 0) {
      const defaultAcc = accs.find(a => a.is_default) || accs[0];
      if (!depositSource) setDepositSource(defaultAcc.id);
      if (!withdrawSource) setWithdrawSource(defaultAcc.id);
    }

    refreshNotifications();
  };

  const refreshNotifications = () => {
    if (!currentUser) return;
    const nots = DB.getNotifications().filter(n => n.user_id === currentUser.id || n.user_id === null);
    setNotifications(nots);
    setUnreadNotificationsCount(nots.filter(n => !n.read_at).length);
  };

  const handleLogout = () => {
    if (currentUser) {
      DB.addAuditLog(currentUser.id, 'User Logout Successful', { email: currentUser.email });
    }
    setCurrentUser(null);
    router.push('/auth/login');
  };

  const handleNotificationRead = (id: string) => {
    DB.markNotificationAsRead(id);
    refreshNotifications();
  };

  const handleMarkAllNotificationsRead = () => {
    if (!currentUser) return;
    DB.markAllNotificationsRead(currentUser.id);
    refreshNotifications();
  };

  // 1. LINK BANK ACCOUNT
  const handleLinkAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!linkAccountData.accountNumber) return;

    DB.addLinkedAccount({
      user_id: currentUser.id,
      bank_name: linkAccountData.bankName,
      account_number: `**** ${linkAccountData.accountNumber.slice(-4)}`,
      account_holder: linkAccountData.accountHolder,
      is_default: linkedAccounts.length === 0
    });

    DB.addAuditLog(currentUser.id, 'Linked Local Bank Account', { bankName: linkAccountData.bankName });
    
    logSimulation(
      'Email',
      'Bank Integration Successful',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYou have successfully integrated your ${linkAccountData.bankName} account (${linkAccountData.accountNumber.slice(-4)}) for fluid saving deposits.`
    );

    setLinkAccountData({ bankName: 'Chase Bank', accountNumber: '', accountHolder: currentUser.name });
    setLinkAccountModal(false);
    refreshData();
  };

  // 2. DEPOSIT FUNDS (Add to liquid wallet balance)
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !wallet || !depositAmount) return;

    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const sourceAccount = linkedAccounts.find(a => a.id === depositSource);
    if (!sourceAccount) return;

    wallet.wallet_balance += amountNum;
    DB.saveWallet(wallet);

    DB.addTransaction({
      user_id: currentUser.id,
      wallet_id: wallet.id,
      type: 'deposit',
      amount: amountNum,
      status: 'completed',
      reference: `TX-DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'income',
      description: `ACH Deposit from ${sourceAccount.bank_name}`
    });

    logSimulation(
      'Email',
      'Fluid Balance Deposited',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYou have deposited ₦${amountNum.toFixed(2)} into your AFFY SAVINGS wallet balance from ${sourceAccount.bank_name}.\n\nFluid Balance: ₦${wallet.wallet_balance.toFixed(2)}.`
    );
    logSimulation(
      'WhatsApp',
      'Deposit Credit Success',
      currentUser.phone || '+234 810 315 1999',
      `AFFY SAVINGS: Deposited ₦${amountNum.toFixed(2)} from ${sourceAccount.bank_name}. Liquid Balance: ₦${wallet.wallet_balance.toFixed(2)}.`
    );

    DB.addAuditLog(currentUser.id, 'Deposit Completed (ACH)', { amount: amountNum, bankName: sourceAccount.bank_name });
    DB.addInAppNotification(currentUser.id, 'Fluid Deposit Credited', `+₦${amountNum.toFixed(2)} credited from ${sourceAccount.bank_name}.`, 'transaction');

    setDepositAmount('');
    setDepositModal(false);
    refreshData();
  };

  // eTranzact payment handlers
  const handleTranzactAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(tranzactAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setTranzactView('bank');
  };

  const handleTranzactCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.pin) {
      alert("Please fill in all card fields.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(code);
      logSimulation(
        'WhatsApp',
        'eTranzact 2FA Secure PIN',
        currentUser.phone || '+234 810 315 1999',
        `eTranzact SwitchIT: Use secure 6-digit code ${code} to authorize payment of ₦${parseFloat(tranzactAmount).toLocaleString()} to Affy Savings Platform. Ref: ETZ-${Math.floor(100000 + Math.random() * 900000)}`
      );
      setIsProcessing(false);
      setTranzactView('otp');
    }, 1200);
  };

  const handleTranzactPocketMoniSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocketMoniPhone || !pocketMoniPin) {
      alert("Please fill in your PocketMoni phone and PIN.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(code);
      logSimulation(
        'WhatsApp',
        'PocketMoni OTP Verification',
        pocketMoniPhone,
        `PocketMoni: Enter code ${code} to approve ₦${parseFloat(tranzactAmount).toLocaleString()} transfer to Affy Savings.`
      );
      setIsProcessing(false);
      setTranzactView('otp');
    }, 1200);
  };

  const handleTranzactOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !wallet) return;
    setOtpError('');
    if (enteredOTP !== generatedOTP) {
      setOtpError("Incorrect OTP security code. Please check your simulated alerts log.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const finalAmount = parseFloat(tranzactAmount);
      wallet.wallet_balance += finalAmount;
      DB.saveWallet(wallet);

      DB.addTransaction({
        user_id: currentUser.id,
        wallet_id: wallet.id,
        type: 'etranzact_checkout',
        amount: finalAmount,
        status: 'completed',
        reference: `ETZ-TX-${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: 'income',
        description: `eTranzact Gateway Credit (${cardDetails.number ? 'Card' : 'PocketMoni'})`
      });

      logSimulation(
        'Email',
        'eTranzact Gateway Deposit Confirm',
        currentUser.email,
        `Hi ${currentUser.name},\n\nWe confirm a dynamic deposit of ₦${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} into your Affy Savings wallet via eTranzact WebConnect.\n\nAvailable Balance: ₦${wallet.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
      );

      DB.addAuditLog(currentUser.id, 'eTranzact Checkout Deposit Completed', { amount: finalAmount });
      DB.addInAppNotification(currentUser.id, 'eTranzact Wallet Credited', `+₦${finalAmount.toLocaleString()} via eTranzact checkout gateway.`, 'transaction');

      setIsProcessing(false);
      setTranzactView('success');
      refreshData();
    }, 1000);
  };

  const handleInitiateBankTransfer = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const randomAcc = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      setVirtualAccountNum(randomAcc);
      setIsProcessing(false);
      setTranzactView('bank');
    }, 800);
  };

  const handleConfirmBankTransfer = () => {
    if (!currentUser || !wallet || !tranzactAmount) return;
    setIsProcessing(true);
    setTimeout(() => {
      const finalAmount = parseFloat(tranzactAmount);
      const ref = `DEP-TRF-${Math.floor(100000 + Math.random() * 900000)}`;

      // Save transaction as pending verification
      DB.addTransaction({
        user_id: currentUser.id,
        wallet_id: wallet.id,
        type: 'etranzact_checkout',
        amount: finalAmount,
        status: 'pending',
        reference: ref,
        category: 'income',
        description: `Direct Bank Transfer (Pending Verification)`
      });

      DB.addAuditLog(currentUser.id, 'Direct Bank Transfer Deposit Initiated', { amount: finalAmount, reference: ref });
      
      const directConfig = cms.directDeposit || {
        bankName: "Opay",
        accountNumber: "8103151999",
        accountName: "AFFY SAVINGS / Support Vault",
        whatsAppNumber: "2348103151999",
        whatsAppMessage: "Hello Support, I have made a bank transfer of ₦{amount} for deposit. Please verify and credit my wallet. Email: {email}, Name: {name}, Reference: {reference}."
      };

      let msg = directConfig.whatsAppMessage || "";
      msg = msg.replace("{amount}", finalAmount.toLocaleString());
      msg = msg.replace("{email}", currentUser.email);
      msg = msg.replace("{name}", currentUser.name);
      msg = msg.replace("{reference}", ref);

      const waUrl = `https://wa.me/${directConfig.whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
      
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank');
      }

      setIsProcessing(false);
      setTranzactView('success');
      refreshData();
    }, 1000);
  };

  // 3. WITHDRAW FUNDS (Transfer out of liquid wallet balance)
  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !wallet || !withdrawAmount) return;

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (wallet.wallet_balance < amountNum) {
      alert("Insufficient fluid wallet balance.");
      return;
    }

    const sourceAccount = linkedAccounts.find(a => a.id === withdrawSource);
    if (!sourceAccount) return;

    wallet.wallet_balance -= amountNum;
    DB.saveWallet(wallet);

    DB.addTransaction({
      user_id: currentUser.id,
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: amountNum,
      status: 'completed',
      reference: `TX-WTH-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'other',
      description: `ACH Withdrawal to ${sourceAccount.bank_name}`
    });

    logSimulation(
      'Email',
      'Fluid Balance Withdrawal Alert',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYou have requested a withdrawal of ₦${amountNum.toFixed(2)} from your wallet to your linked ${sourceAccount.bank_name}.\n\nFluid Balance remaining: ₦${wallet.wallet_balance.toFixed(2)}.`
    );
    logSimulation(
      'WhatsApp',
      'Withdrawal Debit success',
      currentUser.phone || '+234 810 315 1999',
      `AFFY SAVINGS: Withdrew ₦${amountNum.toFixed(2)} to ${sourceAccount.bank_name}. Remaining balance: ₦${wallet.wallet_balance.toFixed(2)}.`
    );

    DB.addAuditLog(currentUser.id, 'Withdrawal Completed', { amount: amountNum, bankName: sourceAccount.bank_name });
    
    setWithdrawAmount('');
    setWithdrawModal(false);
    refreshData();
  };

  // 4. CREATE SAVINGS PLAN
  const handleCreateSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const targetNum = parseFloat(newSavingsData.targetAmount);
    const durationNum = parseInt(newSavingsData.durationDays);

    if (!newSavingsData.name || isNaN(targetNum) || targetNum <= 0 || isNaN(durationNum) || durationNum <= 0) {
      alert("Please fill in valid name, target, and duration.");
      return;
    }

    const plan = DB.createSavingsPlan(
      currentUser.id,
      newSavingsData.name,
      newSavingsData.type,
      targetNum,
      durationNum
    );

    DB.addAuditLog(currentUser.id, 'Created Savings Plan', { name: plan.name, type: plan.type, target: targetNum });
    DB.addInAppNotification(currentUser.id, 'Savings Vault Initialized', `Vault "${plan.name}" created. Matures on ${new Date(plan.end_date).toLocaleDateString()}.`, 'announcement');

    setNewSavingsData({ name: '', type: 'locked', targetAmount: '', durationDays: '90' });
    setAddSavingsModal(false);
    refreshData();
  };

  // 5. TOP UP SAVINGS (Transfer from liquid wallet to savings goal)
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !wallet || !topUpAmount) return;

    const amountVal = parseFloat(topUpAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const res = DB.depositToSavingsPlan(topUpModal.planId, amountVal);
    if (!res.success) {
      alert(res.error || "Deposit failed.");
      return;
    }

    const plan = res.plan!;
    DB.addTransaction({
      user_id: currentUser.id,
      wallet_id: wallet.id,
      type: 'savings_deposit',
      amount: amountVal,
      status: 'completed',
      reference: `TX-SV-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'savings',
      description: `Funded Savings: "${plan.name}"`
    });

    logSimulation(
      'Email',
      'Savings Vault Funded',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYou have transferred ₦${amountVal.toFixed(2)} from your liquid balance to savings vault "${plan.name}".\n\nVault Balance: ₦${plan.saved_amount.toFixed(2)}.`
    );

    DB.addAuditLog(currentUser.id, 'Deposited into Savings Plan', { planId: plan.id, amount: amountVal });
    DB.addInAppNotification(currentUser.id, 'Vault Balance Updated', `₦${amountVal.toFixed(2)} transferred to ${plan.name} vault.`, 'transaction');

    setTopUpAmount('');
    setTopUpModal({ open: false, planId: '' });
    refreshData();
  };

  // 6. BREAK SAVINGS PLAN
  const handleBreakPlan = (planId: string) => {
    if (!currentUser || !wallet) return;

    const plans = DB.getSavingsPlans();
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) return;

    const plan = plans[idx];
    const now = new Date();
    const end = new Date(plan.end_date);
    const isMatured = now >= end;

    let payoutAmount = plan.saved_amount;
    let penaltyFee = 0;

    if (!isMatured) {
      // Apply 5.0% early breakout fee penalty
      const penaltyPct = cms.savingsConfig?.earlyWithdrawalPenalty || 5.0;
      penaltyFee = plan.saved_amount * (penaltyPct / 100);
      payoutAmount = plan.saved_amount - penaltyFee;
    }

    // Credit payout to liquid wallet
    wallet.wallet_balance += payoutAmount;
    DB.saveWallet(wallet);

    // Delete savings plan or set status to closed
    plan.status = 'closed';
    plans[idx] = plan;
    DB.saveSavingsPlans(plans);

    // Save transaction
    DB.addTransaction({
      user_id: currentUser.id,
      wallet_id: wallet.id,
      type: 'savings_withdrawal',
      amount: payoutAmount,
      status: 'completed',
      reference: `TX-BRK-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'income',
      description: `Break Savings Plan: "${plan.name}" ${!isMatured ? '(Premature)' : ''}`
    });

    if (penaltyFee > 0) {
      // Log penalty transaction
      DB.addTransaction({
        user_id: currentUser.id,
        wallet_id: wallet.id,
        type: 'penalty_fee',
        amount: penaltyFee,
        status: 'completed',
        reference: `TX-FEE-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'other',
        description: `Early Breakout Penalty Fee (${cms.savingsConfig?.earlyWithdrawalPenalty || 5.0}%): "${plan.name}"`
      });
    }

    logSimulation(
      'Email',
      'Savings Vault Terminated',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYour savings vault "${plan.name}" has been terminated.\n\nPayout Credited: ₦${payoutAmount.toFixed(2)}${penaltyFee > 0 ? `\nPenalty Fee Deducted: ₦${penaltyFee.toFixed(2)}` : ''}.\n\nLiquid Wallet Balance: ₦${wallet.wallet_balance.toFixed(2)}.`
    );
    logSimulation(
      'WhatsApp',
      'Savings Break Alert',
      currentUser.phone || '+234 810 315 1999',
      `AFFY SAVINGS: Terminated "${plan.name}". Wallet credited: ₦${payoutAmount.toFixed(2)}.${penaltyFee > 0 ? ` Penalty: ₦${penaltyFee.toFixed(2)}` : ''}`
    );

    DB.addAuditLog(currentUser.id, 'Terminated Savings Goal', { planId, name: plan.name, isMatured, penaltyFee });
    DB.addInAppNotification(currentUser.id, 'Savings Vault Closed', `Vault "${plan.name}" has been broken. Wallet credited.`, 'transaction');

    setBreakPlanModal({ open: false, planId: '' });
    refreshData();
  };

  // Default bank linked account change
  const handleDefaultAccountChange = (id: string) => {
    if (!currentUser) return;
    const accs = DB.getLinkedAccounts();
    const updated = accs.map(acc => {
      if (acc.user_id === currentUser.id) {
        return { ...acc, is_default: acc.id === id };
      }
      return acc;
    });
    DB.saveLinkedAccounts(updated);
    refreshData();
  };

  const handleDeleteAccount = (id: string) => {
    if (!currentUser) return;
    const accs = DB.getLinkedAccounts();
    const filtered = accs.filter(acc => acc.id !== id);
    DB.saveLinkedAccounts(filtered);
    DB.addAuditLog(currentUser.id, 'Deleted Linked Bank Account', { accountId: id });
    refreshData();
  };

  // Export transaction ledger to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = "ID,Reference,Description,Amount,Type,Category,Status,Date\n";
    const rows = transactions.map(t => 
      `"${t.id}","${t.reference}","${t.description}",${t.amount},"${t.type}","${t.category}","${t.status}","${t.created_at}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `affy_savings_ledger_${currentUser?.email}.csv`);
    a.click();
  };

  // Helper icons
  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'locked': return <Lock size={15} className="text-red-400" />;
      case 'fixed': return <Calendar size={15} className="text-amber-500" />;
      default: return <Target size={15} className="text-primary" />;
    }
  };

  // Chart data builder
  const getChartData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, idx) => {
      const dayTxs = transactions.filter(t => {
        const d = new Date(t.created_at).getDay();
        const adjusted = d === 0 ? 6 : d - 1; // map Sun(0) to index 6, Mon(1) to 0
        return adjusted === idx && t.status === 'completed';
      });

      const dep = dayTxs
        .filter(t => t.type === 'deposit' || t.type === 'savings_withdrawal' || t.type === 'transfer_received' || t.type === 'etranzact_checkout')
        .reduce((sum, t) => sum + t.amount, 0);

      const wth = dayTxs
        .filter(t => t.type === 'withdrawal' || t.type === 'savings_deposit' || t.type === 'transfer_sent' || t.type === 'penalty_fee')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        day,
        Deposited: Math.round(dep / 1000), // in thousands
        Withdrawn: Math.round(wth / 1000)
      };
    });
  };

  if (!isMounted || !currentUser || !wallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary animate-pulse text-sm">
        Authenticating Secure Vault Connection...
      </div>
    );
  }

  const totalSaved = savingsPlans.filter(p => p.status === 'active').reduce((sum, p) => sum + p.saved_amount, 0);

  // Filter transactions
  const filteredTxs = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' 
      ? true 
      : filterType === 'income'
        ? (t.type === 'deposit' || t.type === 'savings_withdrawal' || t.type === 'transfer_received' || t.type === 'etranzact_checkout')
        : (t.type === 'withdrawal' || t.type === 'savings_deposit' || t.type === 'transfer_sent' || t.type === 'penalty_fee');
    const matchCategory = filterCategory === 'all' ? true : t.category === filterCategory;
    return matchSearch && matchType && matchCategory;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative background glows */}
      <div className="bg-ambient-glow glow-purple top-[-100px] left-[-150px] opacity-10" />
      <div className="bg-ambient-glow glow-emerald bottom-[-150px] right-[-150px] opacity-10" />

      {/* STICKY HEADER REDESIGN */}
      <header className="border-b border-border/40 sticky top-0 z-40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/">
            <AffyLogo className="h-6" />
          </Link>

          <div className="flex items-center gap-4">
            
            {/* Notification bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2.5 rounded-xl hover:bg-neutral-gray transition-colors relative cursor-pointer flex items-center justify-center border border-border/30 bg-card-bg/50"
              >
                <Bell size={16} className="text-zinc-500 hover:text-foreground" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-card-bg border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden font-sans animate-fade-in">
                  <div className="px-4 py-3 bg-neutral-gray flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">In-App Alerts</span>
                    {unreadNotificationsCount > 0 && (
                      <button 
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-zinc-500 font-semibold">No notifications yet.</div>
                    ) : (
                      notifications.map(not => (
                        <div 
                          key={not.id} 
                          onClick={() => handleNotificationRead(not.id)}
                          className={`p-4 text-xs flex flex-col gap-1 cursor-pointer hover:bg-neutral-gray/50 transition-colors ${!not.read_at ? 'bg-primary/5 font-bold' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground font-semibold">{not.title}</span>
                            <span className="text-[9px] text-zinc-400 font-mono">{new Date(not.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal mt-0.5">{not.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link href="/dashboard/settings" className="p-2.5 rounded-xl hover:bg-neutral-gray transition-colors cursor-pointer text-zinc-500 hover:text-foreground border border-border/30 bg-card-bg/50">
              <Settings size={16} />
            </Link>

            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border/40">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                {currentUser.name[0]}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">{currentUser.name}</div>
                <div className="text-[9px] text-zinc-400 font-mono mt-1 tracking-wider">{currentUser.email}</div>
              </div>
            </div>

            <button onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-zinc-500 transition-colors cursor-pointer border border-border/30 bg-card-bg/50 flex items-center justify-center">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full z-10">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/40 mb-8 overflow-x-auto gap-6 text-sm font-semibold select-none">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Ledger History
          </button>
          <button 
            onClick={() => setActiveTab('cards')}
            className={`pb-3.5 border-b-2 px-1 transition-colors cursor-pointer font-display ${activeTab === 'cards' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-foreground'}`}
          >
            Connected Banks
          </button>
        </div>

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Cards (Balances & Quick Actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Asset balances */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Available Balance */}
                <div className="bg-card-bg border border-border/40 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] hover-lift">
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] text-foreground pointer-events-none">
                    <Wallet size={160} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Available Liquid Wallet</div>
                    <div className="text-3xl font-black font-mono mt-4 text-foreground">
                      ₦{wallet.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 font-semibold mt-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Instantly clear to fund lock plans
                  </div>
                </div>

                {/* Total Strict Savings */}
                <div className="bg-gradient-to-br from-primary to-[#7B2CBF] text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] hover-lift">
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                    <TrendingUp size={160} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Strict Savings Portfolio</div>
                    <div className="text-3xl font-black font-mono mt-4">
                      ₦{totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-[10px] opacity-80 font-semibold mt-4">
                    🔒 Locked vault strategy active
                  </div>
                </div>

              </div>

              {/* Quick Actions panel */}
              <div className="lg:col-span-4 bg-card-bg border border-border/40 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover-lift">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Capital Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setTranzactView('amount');
                        setDepositModal(true);
                      }}
                      className="p-4 bg-neutral-gray/50 hover:bg-primary/10 hover:text-primary rounded-2xl flex flex-col items-center gap-2 transition-colors cursor-pointer text-xs font-bold"
                    >
                      <ArrowDownLeft size={16} />
                      <span>Deposit Cash</span>
                    </button>
                    <button 
                      onClick={() => {
                        const defaultAcc = linkedAccounts.find(a => a.is_default) || linkedAccounts[0];
                        setWithdrawSource(defaultAcc?.id || '');
                        setWithdrawAmount('');
                        setWithdrawModal(true);
                      }}
                      className="p-4 bg-neutral-gray/50 hover:bg-primary/10 hover:text-primary rounded-2xl flex flex-col items-center gap-2 transition-colors cursor-pointer text-xs font-bold"
                    >
                      <ArrowUpRight size={16} />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-zinc-400">
                  <span>Linked Banks: <strong>{linkedAccounts.length}</strong></span>
                  <button 
                    onClick={() => setLinkAccountModal(true)} 
                    className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Link new
                  </button>
                </div>
              </div>

            </div>

            {/* Savings Goals Grid section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Escrow Lock Strategy</h3>
                  <p className="text-xs text-zinc-400">Track and allocate capital to customized strict vaults.</p>
                </div>
                <button 
                  onClick={() => setAddSavingsModal(true)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/15 transition-all cursor-pointer font-sans"
                >
                  <Plus size={14} /> Create Lock Strategy
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {savingsPlans.filter(p => p.status === 'active').map(plan => {
                  const pct = Math.min(100, Math.round((plan.saved_amount / plan.target_amount) * 100));
                  const now = new Date();
                  const end = new Date(plan.end_date);
                  const isLockedVal = plan.type === 'locked' && now < end;
                  const isFixedVal = plan.type === 'fixed' && now < end;

                  return (
                    <div key={plan.id} className="bg-card-bg border border-border/40 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[220px] hover-lift">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {getPlanIcon(plan.type)}
                            <span>{plan.type} vault</span>
                          </span>
                          {isLockedVal && (
                            <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">LOCKED</span>
                          )}
                          {isFixedVal && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold font-mono">FIXED</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm mt-4 text-foreground leading-tight font-display">{plan.name}</h4>
                        
                        {/* Progress */}
                        <div className="mt-5 space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Saved: ₦{plan.saved_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            <span>Target: ₦{plan.target_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="w-full bg-neutral-gray h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full transition-all duration-500 ${plan.type === 'locked' ? 'bg-red-400' : plan.type === 'fixed' ? 'bg-amber-400' : 'bg-primary'}`} />
                          </div>
                          <div className="text-right text-[9px] text-zinc-400 font-bold font-mono">{pct}% Completed</div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-2 gap-3 text-xs">
                        <button
                          onClick={() => setTopUpModal({ open: true, planId: plan.id })}
                          className="bg-primary text-white py-2 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer text-center text-[10px]"
                        >
                          Top Up
                        </button>
                        {isLockedVal ? (
                          <div className="flex items-center justify-center gap-1.5 bg-red-500/5 text-red-500 rounded-xl text-[10px] font-bold border border-red-500/10">
                            <Lock size={10} />
                            <span>{Math.ceil((end.getTime() - now.getTime()) / 86400000)}d Left</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (isFixedVal) {
                                setBreakPlanModal({ open: true, planId: plan.id });
                              } else {
                                handleBreakPlan(plan.id);
                              }
                            }}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/15 py-2 rounded-xl font-bold cursor-pointer text-center text-[10px] transition-colors"
                          >
                            Break Plan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {savingsPlans.filter(p => p.status === 'active').length === 0 && (
                  <div className="col-span-3 text-center py-16 bg-neutral-gray/10 border border-dashed border-border/40 rounded-3xl text-xs text-zinc-400 font-semibold leading-relaxed">
                    No active savings strategy found.<br />Click Initialize to secure your target goals.
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Section & Recent Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Analytics bar chart */}
              <div className="lg:col-span-8 bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm hover-lift">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Savings Analytics</h3>
                    <p className="text-[10px] text-zinc-400">Weekly breakdown of funding credit and breakout debit (in thousands ₦)</p>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">Live Tracker</span>
                </div>

                <div className="h-64 w-full">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9CA3AF" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} stroke="transparent" />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }} />
                        <Bar dataKey="Deposited" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Withdrawn" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-400 animate-pulse">Initializing analytics context...</div>
                  )}
                </div>
              </div>

              {/* Mini Recent Transactions */}
              <div className="lg:col-span-4 bg-card-bg border border-border/40 rounded-3xl p-6 shadow-sm hover-lift">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/30">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ledger Activity</span>
                  <button onClick={() => setActiveTab('history')} className="text-[10px] text-primary font-bold hover:underline">
                    View All
                  </button>
                </div>

                <div className="space-y-4">
                  {transactions.slice(0, 4).length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 font-semibold">No transaction ledger recorded.</div>
                  ) : (
                    transactions.slice(0, 4).map(tx => (
                      <div 
                        key={tx.id} 
                        onClick={() => setActiveReceipt(tx)}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-neutral-gray transition-colors cursor-pointer border border-transparent hover:border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            tx.type === 'deposit' || tx.type === 'savings_withdrawal' || tx.type === 'transfer_received' || tx.type === 'etranzact_checkout'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'savings_withdrawal' || tx.type === 'transfer_received' || tx.type === 'etranzact_checkout' ? (
                              <ArrowDownLeft size={14} />
                            ) : (
                              <ArrowUpRight size={14} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold truncate max-w-[125px] text-foreground">{tx.description}</div>
                            <div className="text-[8px] text-zinc-400 font-mono mt-0.5">{tx.reference}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold font-mono ${
                            tx.type === 'deposit' || tx.type === 'savings_withdrawal' || tx.type === 'transfer_received' || tx.type === 'etranzact_checkout' ? 'text-emerald-500' : 'text-foreground'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'savings_withdrawal' || tx.type === 'transfer_received' || tx.type === 'etranzact_checkout' ? '+' : '-'}₦{tx.amount.toFixed(2)}
                          </div>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded font-extrabold uppercase font-mono ${
                            tx.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Savings Transaction Ledger */}
        {activeTab === 'history' && (
          <div className="bg-card-bg border border-border/40 rounded-3xl shadow-sm p-6 space-y-6 animate-fade-in">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Ledger Logs</h3>
                <p className="text-xs text-zinc-400">Review all funding deposits, interest additions, and lock penalty states.</p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer shadow-md shadow-primary/15 font-sans"
              >
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-4 border-b border-border/30">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><Search size={14} /></span>
                <input
                  type="text"
                  placeholder="Search ref or label..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                >
                  <option value="all">Type: All</option>
                  <option value="income">Credit (+)</option>
                  <option value="outcome">Debit (-)</option>
                </select>
              </div>

              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                >
                  <option value="all">Category: All</option>
                  <option value="income">Credits</option>
                  <option value="savings">Savings Top-ups</option>
                  <option value="other">Withdrawals & fees</option>
                </select>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-zinc-400 font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-4">Audit Label / Ref</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Date Stamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 font-semibold">No records match query filters.</td>
                    </tr>
                  ) : (
                    filteredTxs.map(tx => (
                      <tr 
                        key={tx.id} 
                        onClick={() => setActiveReceipt(tx)}
                        className="hover:bg-neutral-gray/30 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground">{tx.description}</div>
                          <div className="text-[8px] text-zinc-400 font-mono mt-0.5 tracking-wider">{tx.reference}</div>
                        </td>
                        <td className="py-4 px-4 font-mono font-extrabold text-foreground">₦{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                            tx.type === 'deposit' || tx.type === 'savings_withdrawal' || tx.type === 'transfer_received' || tx.type === 'etranzact_checkout'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-zinc-400 uppercase text-[9px] tracking-wider">{tx.category}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                            tx.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-zinc-400 font-mono">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 3: Connected Banks */}
        {activeTab === 'cards' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Funding Methods</h3>
                <p className="text-xs text-zinc-400">Integrate local bank cards or institutional vaults to securely automate deposits.</p>
              </div>
              <button 
                onClick={() => setLinkAccountModal(true)}
                className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer shadow-md shadow-primary/15 font-sans"
              >
                <Plus size={14} /> Integrate Bank
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {linkedAccounts.map(acc => (
                <div key={acc.id} className="bg-card-bg border border-border/40 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[170px] hover-lift">
                  <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] text-foreground pointer-events-none">
                    <Landmark size={120} />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary tracking-wide uppercase flex items-center gap-1.5">
                        <Landmark size={14} />
                        {acc.bank_name}
                      </span>
                      {acc.is_default && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">PRIMARY</span>
                      )}
                    </div>
                    <div className="text-xl font-bold font-mono mt-4 text-foreground">{acc.account_number}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold">Holder: {acc.account_holder}</div>
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/30 text-xs">
                    {!acc.is_default ? (
                      <button 
                        onClick={() => handleDefaultAccountChange(acc.id)}
                        className="text-primary hover:underline font-bold"
                      >
                        Set Primary
                      </button>
                    ) : (
                      <span className="text-zinc-400 font-semibold">Active Vault Link</span>
                    )}

                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="text-red-500 hover:text-red-600 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {linkedAccounts.length === 0 && (
                <div className="col-span-3 text-center py-16 bg-neutral-gray/10 border border-dashed border-border/40 rounded-3xl text-xs text-zinc-400 leading-relaxed font-semibold">
                  No linked bank account verified.<br />Link an institution to enable deposits and withdrawals.
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* ======================= SYSTEM MODALS ======================== */}
      {/* ============================================================== */}

      {/* 1. INITIALIZE SAVINGS GOAL MODAL */}
      {addSavingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setAddSavingsModal(false)}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-display tracking-tight text-foreground mb-1">Create Savings Strategy</h3>
            <p className="text-xs text-zinc-400 mb-6">Select a strict strategy matching your savings target.</p>

            <form onSubmit={handleCreateSavingsSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Strategy Vault Name</label>
                <input
                  type="text"
                  placeholder="e.g., Year 2026 Laptop Fund"
                  value={newSavingsData.name}
                  onChange={(e) => setNewSavingsData({ ...newSavingsData, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Lock Type</label>
                  <select
                    value={newSavingsData.type}
                    onChange={(e) => setNewSavingsData({ ...newSavingsData, type: e.target.value as any })}
                    className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  >
                    <option value="locked">Locked Strategy</option>
                    <option value="fixed">Fixed Target</option>
                    <option value="target">Goal Target</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Duration Days</label>
                  <select
                    value={newSavingsData.durationDays}
                    onChange={(e) => setNewSavingsData({ ...newSavingsData, durationDays: e.target.value })}
                    className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    disabled={newSavingsData.type === 'target'}
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days (Strict Lock)</option>
                    <option value="180">180 Days (Escrow Guard)</option>
                    <option value="365">365 Days (Wealth Shield)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Target Capital (NGN)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newSavingsData.targetAmount}
                    onChange={(e) => setNewSavingsData({ ...newSavingsData, targetAmount: e.target.value })}
                    className="w-full text-xs pl-8 pr-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                    min="1000"
                  />
                </div>
              </div>

              {/* Rules description */}
              <div className="p-3.5 bg-neutral-gray/50 rounded-xl border border-border/40 text-[10px] text-zinc-500 leading-relaxed">
                {newSavingsData.type === 'locked' && "🔒 Locked strategy forbids breaking the vault under any browser configuration before maturity."}
                {newSavingsData.type === 'fixed' && `⚠️ Fixed time target allows breaking before maturity, but triggers a strict ${cms.savingsConfig?.earlyWithdrawalPenalty || 5.0}% penalty payout deduction.`}
                {newSavingsData.type === 'target' && "🎯 Goal target encourages flexible saves to reach your wealth objective."}
              </div>

              <button
                type="submit"
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity mt-4 cursor-pointer font-sans shadow-md shadow-primary/10"
              >
                Initialize Savings Vault
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. TOP UP MODAL */}
      {topUpModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setTopUpModal({ open: false, planId: '' })}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold font-display text-foreground mb-1">Fund Savings Plan</h3>
            <p className="text-xs text-zinc-400 mb-6">Allocate liquid wallet balance to this savings vault.</p>

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Amount to Allocate (NGN)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                    required
                    max={wallet.wallet_balance}
                  />
                </div>
                <p className="text-[9px] text-zinc-400 mt-1.5">Liquid Wallet Available: ₦{wallet.wallet_balance.toLocaleString()}</p>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity mt-4 cursor-pointer font-sans shadow-md shadow-primary/10"
              >
                Approve Transfer to Savings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. BREAK PLAN CONFIRMATION DIALOG */}
      {breakPlanModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingDown size={24} />
            </div>

            <h3 className="text-sm font-bold font-display text-foreground mb-2">Confirm Premature Breakout</h3>
            <p className="text-xs text-zinc-500 leading-relaxed mb-6 px-4">
              This fixed plan has not matured yet. Breaking it early will trigger an automatic penalty deduction of <strong className="text-red-500">{cms.savingsConfig?.earlyWithdrawalPenalty || 5.0}%</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold font-sans">
              <button 
                onClick={() => setBreakPlanModal({ open: false, planId: '' })}
                className="py-3 border border-border/60 hover:bg-neutral-gray rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleBreakPlan(breakPlanModal.planId)}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
              >
                Deduct & Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DEPOSIT MODAL REDESIGN (eTranzact Gateway / manual details) */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl overflow-hidden shadow-2xl relative font-sans text-xs flex flex-col animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-border/30 bg-neutral-gray/30 flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <span className="font-extrabold text-sm tracking-tight text-primary font-display">AFFY SAVINGS</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Direct Deposit</span>
              </div>
              <button 
                onClick={closeDepositModal}
                className="text-zinc-400 hover:text-foreground cursor-pointer transition-colors p-1.5 rounded-full hover:bg-neutral-gray"
              >
                <X size={15} />
              </button>
            </div>

            {/* Merchant / Payment Info Summary */}
            {tranzactView !== 'amount' && tranzactView !== 'success' && (
              <div className="px-5 py-3.5 bg-neutral-gray/20 border-b border-border/30 flex justify-between items-center">
                <div>
                  <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Merchant</div>
                  <div className="font-bold text-foreground">Affy Savings Platform</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Amount Due</div>
                  <div className="font-bold text-lg font-mono text-primary">
                    ₦{parseFloat(tranzactAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body Container */}
            <div className="p-6 relative min-h-[300px] flex flex-col justify-between">
              
              {/* Spinner/Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-card-bg/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <div className="text-xs font-semibold text-zinc-500 animate-pulse">Processing secure gateway request...</div>
                </div>
              )}

              {/* View: Amount Entry */}
              {tranzactView === 'amount' && (
                <form onSubmit={handleTranzactAmountSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-foreground font-display">Enter Deposit Amount</h4>
                      <p className="text-[11px] text-zinc-500">How much would you like to credit to your Naira savings balance?</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Amount (NGN)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₦</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={tranzactAmount}
                          onChange={(e) => setTranzactAmount(e.target.value)}
                          className="w-full text-sm font-bold font-mono pl-8 pr-4 py-3.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none transition-colors"
                          required
                          min="100"
                        />
                      </div>
                    </div>

                    {/* Quick Amount Suggestion Chips */}
                    <div className="grid grid-cols-4 gap-2">
                      {[5000, 10000, 25000, 50000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTranzactAmount(amt.toString())}
                          className="py-2.5 bg-neutral-gray/50 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                        >
                          +₦{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/10 flex items-center justify-center gap-2 mt-4 font-sans"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* View: Direct Bank Transfer Details */}
              {tranzactView === 'bank' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-foreground font-display">Direct Bank Transfer</h4>
                      <p className="text-[10px] text-zinc-500">Transfer the exact amount to the bank details below:</p>
                    </div>

                    {/* Bank Details Box */}
                    <div className="bg-neutral-gray/30 border border-border/40 p-5 rounded-2xl space-y-3.5 font-sans">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-500 font-semibold">BANK NAME</span>
                        <span className="font-bold text-foreground">{cms.directDeposit?.bankName || "Opay"}</span>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-border/20 pt-2.5">
                        <span className="text-zinc-500 font-semibold text-[11px]">ACCOUNT NUMBER</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-xs text-primary">{cms.directDeposit?.accountNumber || "8103151999"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cms.directDeposit?.accountNumber || "8103151999");
                              alert("Account number copied!");
                            }}
                            className="p-1 text-zinc-400 hover:text-primary hover:bg-neutral-gray rounded cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                        <span className="text-zinc-500 font-semibold">ACCOUNT NAME</span>
                        <span className="font-bold text-foreground truncate max-w-[180px]">{cms.directDeposit?.accountName || "AFFY SAVINGS / Support Vault"}</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                        <span className="text-zinc-500 font-semibold">AMOUNT TO TRANSFER</span>
                        <span className="font-bold font-mono text-foreground">₦{parseFloat(tranzactAmount || '0').toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-center text-[9px] text-zinc-400 bg-primary/5 p-3 rounded-xl border border-primary/10">
                      ℹ️ Transfer manually. Once complete, click the button below to alert support on WhatsApp.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleConfirmBankTransfer}
                      className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md font-sans"
                    >
                      I&apos;ve made payment
                    </button>
                    <button
                      onClick={() => setTranzactView('amount')}
                      className="w-full py-2.5 text-zinc-500 hover:text-foreground font-bold"
                    >
                      Cancel Transfer
                    </button>
                  </div>
                </div>
              )}

              {/* View: Success Pending Receipt */}
              {tranzactView === 'success' && (
                <div className="text-center space-y-6 flex-1 flex flex-col justify-between py-4 animate-fade-in">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Clock size={28} className="stroke-[3] animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground font-display">Deposit Submitted</h4>
                      <p className="text-[11px] text-zinc-500">Your deposit request is pending support verification.</p>
                    </div>

                    {/* Receipt Details */}
                    <div className="bg-neutral-gray/25 border border-border/60 rounded-2xl p-5 text-[11px] space-y-2.5 text-left font-sans">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Amount Transferred:</span>
                        <span className="font-bold font-mono text-amber-600">₦{parseFloat(tranzactAmount || '0').toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Payment Channel:</span>
                        <span className="font-bold text-foreground capitalize">Direct Bank Transfer</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-semibold">Status:</span>
                        <span className="font-bold text-amber-600 font-mono text-[10px]">PENDING VERIFICATION</span>
                      </div>
                    </div>

                    <div className="text-center text-[10px] text-zinc-400 bg-primary/5 p-3.5 rounded-xl border border-primary/10 leading-relaxed">
                      💬 We have redirected you to our WhatsApp Helpdesk. If the page did not open, click the button below to submit your payment receipt.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const directConfig = cms.directDeposit || {
                          bankName: "Opay",
                          accountNumber: "8103151999",
                          accountName: "AFFY SAVINGS / Support Vault",
                          whatsAppNumber: "2348103151999",
                          whatsAppMessage: "Hello Support, I have made a bank transfer of ₦{amount} for deposit. Please verify and credit my wallet. Email: {email}, Name: {name}, Reference: {reference}."
                        };
                        const ref = transactions.find(t => t.status === 'pending')?.reference || `DEP-TRF-${Math.floor(100000 + Math.random() * 900000)}`;
                        let msg = directConfig.whatsAppMessage || "";
                        msg = msg.replace("{amount}", parseFloat(tranzactAmount).toLocaleString());
                        msg = msg.replace("{email}", currentUser?.email || "");
                        msg = msg.replace("{name}", currentUser?.name || "");
                        msg = msg.replace("{reference}", ref);
                        const waUrl = `https://wa.me/${directConfig.whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md font-sans flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} />
                      <span>Chat on WhatsApp Support</span>
                    </button>
                    <button
                      onClick={closeDepositModal}
                      className="w-full py-2.5 text-zinc-500 hover:text-foreground font-bold hover:bg-neutral-gray/50 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 5. ACH WITHDRAWAL MODAL */}
      {withdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-fade-in text-xs">
            <button 
              onClick={closeWithdrawModal}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold font-display text-foreground mb-1">Withdraw Funds</h3>
            <p className="text-xs text-zinc-400 mb-6">Request a transfer from your liquid wallet.</p>

            {linkedAccounts.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 font-semibold space-y-4">
                <p>Link a bank account first to allow withdrawals.</p>
                <button 
                  onClick={() => {
                    setWithdrawModal(false);
                    setLinkAccountModal(true);
                  }}
                  className="text-xs bg-primary text-white px-5 py-2.5 rounded-xl hover:opacity-90 font-bold shadow-md shadow-primary/10"
                >
                  Link Bank Account
                </button>
              </div>
            ) : (
              <form onSubmit={handleWithdrawalSubmit} className="space-y-4 font-sans">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Destination Bank</label>
                  <select
                    value={withdrawSource}
                    onChange={(e) => setWithdrawSource(e.target.value)}
                    className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  >
                    {linkedAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Amount to Withdraw (NGN)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400">₦</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full text-xs pl-8 pr-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                      required
                      max={wallet.wallet_balance}
                    />
                  </div>
                  <p className="text-[9px] text-zinc-400 mt-1.5 font-bold">Liquid Balance: ₦{wallet.wallet_balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: cms.branding.primaryColor }}
                  className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity mt-4 cursor-pointer font-sans shadow-md shadow-primary/10"
                >
                  Approve Withdrawal
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. LINK BANK ACCOUNT MODAL */}
      {linkAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-fade-in text-xs">
            <button 
              onClick={() => setLinkAccountModal(false)}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold font-display text-foreground mb-1">Link Institution</h3>
            <p className="text-xs text-zinc-400 mb-6">Integrate your banking provider details.</p>

            <form onSubmit={handleLinkAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Choose Bank Provider</label>
                <select
                  value={linkAccountData.bankName}
                  onChange={(e) => setLinkAccountData({ ...linkAccountData, bankName: e.target.value })}
                  className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                >
                  <option value="Access Bank">Access Bank</option>
                  <option value="GTBank">GTBank</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="United Bank for Africa">UBA</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1012345678"
                  value={linkAccountData.accountNumber}
                  onChange={(e) => setLinkAccountData({ ...linkAccountData, accountNumber: e.target.value })}
                  className="w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Holder Name</label>
                <input
                  type="text"
                  value={linkAccountData.accountHolder}
                  onChange={(e) => setLinkAccountData({ ...linkAccountData, accountHolder: e.target.value })}
                  className="w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-opacity mt-4 cursor-pointer font-sans shadow-md shadow-primary/10"
              >
                Integrate Institution Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. TRANSACTION RECEIPT DETAILED MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-fade-in text-xs">
            <button 
              onClick={() => setActiveReceipt(null)}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-sm font-bold font-display text-foreground">Transaction Receipt</h3>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono tracking-wider">{activeReceipt.reference}</p>
            </div>

            <div className="bg-neutral-gray/30 border border-border/40 rounded-2xl p-5 space-y-3.5 font-sans">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-semibold">DESCRIPTION</span>
                <span className="font-bold text-foreground text-right max-w-[160px] truncate">{activeReceipt.description}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                <span className="text-zinc-500 font-semibold">AMOUNT</span>
                <span className="font-extrabold text-foreground font-mono text-xs">₦{activeReceipt.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                <span className="text-zinc-500 font-semibold">TRANSACTION TYPE</span>
                <span className="font-bold text-primary uppercase">{activeReceipt.type}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                <span className="text-zinc-500 font-semibold">CATEGORY</span>
                <span className="font-bold text-zinc-400 uppercase">{activeReceipt.category}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                <span className="text-zinc-500 font-semibold">STATUS</span>
                <span className="font-bold text-emerald-500 uppercase">{activeReceipt.status}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2.5 text-[11px]">
                <span className="text-zinc-500 font-semibold">DATE TIMESTAMP</span>
                <span className="font-bold text-zinc-400 font-mono text-[10px]">{new Date(activeReceipt.created_at).toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={() => setActiveReceipt(null)}
              className="w-full bg-primary text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 transition-opacity mt-6 cursor-pointer font-sans shadow-md shadow-primary/10"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
