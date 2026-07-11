'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, logSimulation, User, LinkedAccount, Transaction } from '@/services/db';
import { 
  ArrowLeft, 
  ShieldCheck, 
  User as UserIcon, 
  Key, 
  Smartphone, 
  Mail, 
  Phone,
  CheckCircle2,
  Lock,
  Globe,
  Settings,
  ChevronRight,
  Shield,
  CreditCard,
  Fingerprint,
  FileText,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  LogOut,
  Bell,
  Clock,
  Plus,
  X,
  Languages,
  Check
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, cms, theme, toggleTheme } = useApp();

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    }
  }, [currentUser, router]);

  // States
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    avatarUrl: currentUser?.avatar_url || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [transactionPINData, setTransactionPINData] = useState({
    currentPIN: '',
    newPIN: '',
    confirmPIN: ''
  });

  const [twoFactor, setTwoFactor] = useState(currentUser?.two_factor_enabled || false);
  const [fingerprintLogin, setFingerprintLogin] = useState(true);
  const [pushNotification, setPushNotification] = useState(true);
  const [smsAlert, setSmsAlert] = useState(false);
  const [emailAlert, setEmailAlert] = useState(true);

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  // Modal control
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Link bank account logic
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [linkAccountData, setLinkAccountData] = useState({
    bankName: 'OPay',
    accountNumber: '',
    accountHolder: currentUser?.name || ''
  });

  // Chat simulation state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    { sender: 'bot', text: 'Hello! I am Affy, your strict savings assistant. How can I help you today?', time: 'Just Now' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Auto save configuration state
  const [autoSaveConfig, setAutoSaveConfig] = useState({
    enabled: true,
    amount: '1000',
    frequency: 'daily'
  });

  // Round up savings config
  const [roundUpEnabled, setRoundUpEnabled] = useState(true);

  // Load user linked accounts
  useEffect(() => {
    if (currentUser) {
      setLinkedAccounts(DB.getLinkedAccounts().filter(a => a.user_id === currentUser.id));
    }
  }, [currentUser, activeModal]);

  if (!currentUser) return null;

  // Calculate dynamic savings balance
  const savingsPlans = DB.getSavingsPlans().filter(p => p.user_id === currentUser.id);
  const totalSaved = savingsPlans.reduce((acc, plan) => acc + plan.saved_amount, 0);

  // 1. UPDATE PROFILE
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!profileData.name || !profileData.phone) {
      setProfileError('Please provide both full name and phone number.');
      return;
    }

    const users = DB.getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      const updatedUser: User = {
        ...users[idx],
        name: profileData.name,
        phone: profileData.phone,
        avatar_url: profileData.avatarUrl
      };
      users[idx] = updatedUser;
      DB.saveUsers(users);
      setCurrentUser(updatedUser);
      setProfileSuccess(true);
      DB.addAuditLog(currentUser.id, 'Updated Profile Info', { name: profileData.name });
      setTimeout(() => setActiveModal(null), 1200);
    }
  };

  // 2. TOGGLE 2FA
  const handle2FAToggle = () => {
    const nextState = !twoFactor;
    setTwoFactor(nextState);

    const users = DB.getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      const updatedUser: User = {
        ...users[idx],
        two_factor_enabled: nextState,
        two_factor_secret: nextState ? 'SEC-GAUTH-AFFY881' : ''
      };
      users[idx] = updatedUser;
      DB.saveUsers(users);
      setCurrentUser(updatedUser);

      DB.addAuditLog(currentUser.id, nextState ? '2FA Enabled' : '2FA Disabled', {});
      
      logSimulation(
        'Email',
        '2FA Settings Modified',
        currentUser.email,
        `Hi ${currentUser.name},\n\nThis is a security notification confirming that Two-Factor Authentication (2FA) has been ${nextState ? 'ENABLED' : 'DISABLED'} on your AFFY SAVINGS wallet.`
      );
    }
  };

  // 3. UPDATE PASSWORD
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and password confirmation do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    // Check current password
    let savedPassword = 'password123';
    const regData = localStorage.getItem(`affy_pending_user_${currentUser.email}`);
    if (regData) {
      try {
        savedPassword = JSON.parse(regData).password;
      } catch {}
    }
    const customPassword = localStorage.getItem(`affy_pwd_${currentUser.email}`);
    if (customPassword) {
      savedPassword = customPassword;
    }

    if (passwordData.currentPassword !== savedPassword) {
      setPasswordError('The current password provided is incorrect.');
      return;
    }

    // Save new password
    localStorage.setItem(`affy_pwd_${currentUser.email}`, passwordData.newPassword);
    setPasswordSuccess(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

    DB.addAuditLog(currentUser.id, 'Updated Security Password', {});
    logSimulation(
      'Email',
      'Password Changed Notification',
      currentUser.email,
      `Hi ${currentUser.name},\n\nYour security password was successfully changed. If you did not authorize this edit, contact support immediately.`
    );
    setTimeout(() => setActiveModal(null), 1200);
  };

  // 4. TRANSACTION PIN SUBMIT
  const handlePINSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess(false);

    if (transactionPINData.newPIN.length !== 4 || isNaN(Number(transactionPINData.newPIN))) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }

    if (transactionPINData.newPIN !== transactionPINData.confirmPIN) {
      setPinError('New PIN and confirmation PIN do not match.');
      return;
    }

    localStorage.setItem(`affy_pin_${currentUser.email}`, transactionPINData.newPIN);
    setPinSuccess(true);
    setTransactionPINData({ currentPIN: '', newPIN: '', confirmPIN: '' });
    DB.addAuditLog(currentUser.id, 'Updated Transaction PIN', {});
    setTimeout(() => setActiveModal(null), 1200);
  };

  // 5. LINK NEW BANK ACCOUNT
  const handleLinkBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkAccountData.accountNumber) return;

    DB.addLinkedAccount({
      user_id: currentUser.id,
      bank_name: linkAccountData.bankName,
      account_number: `**** ${linkAccountData.accountNumber.slice(-4)}`,
      account_holder: linkAccountData.accountHolder,
      is_default: linkedAccounts.length === 0
    });

    DB.addAuditLog(currentUser.id, 'Linked Local Bank Account (from Settings)', { bankName: linkAccountData.bankName });
    setLinkAccountData({ bankName: 'OPay', accountNumber: '', accountHolder: currentUser.name });
    
    // Refresh bank list
    setLinkedAccounts(DB.getLinkedAccounts().filter(a => a.user_id === currentUser.id));
  };

  // Chat send
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsgs = [...chatMessages, { sender: 'user' as const, text: chatInput, time: 'Just Now' }];
    setChatMessages(newMsgs);
    setChatInput('');

    setTimeout(() => {
      setChatMessages([...newMsgs, { 
        sender: 'bot' as const, 
        text: "Thanks for reaching out! A verified agent is currently auditing our secure queue and will join shortly. For immediate assistance with strict locked strategies, check out our FAQs.", 
        time: 'Just Now' 
      }]);
    }, 1000);
  };

  const handleLogout = () => {
    DB.addAuditLog(currentUser.id, 'User Logout Successful', { email: currentUser.email });
    setCurrentUser(null);
    router.push('/auth/login');
  };

  const handleCloseAccount = () => {
    alert("To close your premium digital wallet, please withdraw all your funds and email compliance@affysavings.com. All active locks must mature before capital can be liquidated.");
    setActiveModal(null);
  };

  const inputClasses = "w-full text-xs px-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-zinc-500 text-foreground dark:text-white";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Decorative Glow */}
      <div className="bg-ambient-glow glow-purple top-[-150px] left-[-200px] opacity-[0.07] pointer-events-none" />
      <div className="bg-ambient-glow glow-blue bottom-[-150px] right-[-200px] opacity-[0.05] pointer-events-none" />

      {/* HEADER */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl h-18 flex items-center z-10 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 w-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary font-bold transition-colors">
            <ArrowLeft size={16} />
            Back to Wallet
          </Link>
          <div className="flex items-center gap-2 text-zinc-400">
            <Settings size={15} className="text-primary animate-spin-slow" />
            <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Secure Settings</span>
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 pb-28 w-full z-10 space-y-8">
        
        {/* PROFILE HEADER */}
        <div className="bg-card-bg border border-border/40 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xl font-display relative">
              {currentUser.name[0]}
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] text-white px-1.5 py-0.5 rounded-full border-2 border-card-bg font-extrabold uppercase scale-90">✅</span>
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-base text-foreground leading-none">{currentUser.name}</h2>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90">Verified Account ✅</span>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-wide">{currentUser.email}</p>
            </div>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 border-border/20 pt-4 sm:pt-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Savings Portfolio</div>
            <div className="text-xl font-black font-mono text-foreground mt-1">
              ₦{totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <button 
              onClick={() => setActiveModal('personal_info')}
              className="text-[10px] text-primary hover:underline font-bold mt-2 flex items-center gap-1 sm:justify-end cursor-pointer"
            >
              View Profile →
            </button>
          </div>
        </div>

        {/* SETTINGS GROUPS */}

        {/* CATEGORY: ACCOUNT */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Account</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* PERSONAL INFO */}
            <div 
              onClick={() => setActiveModal('personal_info')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <UserIcon size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Personal Information</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Update legal name, phone number, and avatar</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>


            {/* BANK ACCOUNTS */}
            <div 
              onClick={() => setActiveModal('bank_accounts')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center transition-colors group-hover:bg-blue-500/20">
                  <CreditCard size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Linked Bank Accounts</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Manage integrated funding institutions</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* PAYMENT METHODS */}
            <div 
              onClick={() => setActiveModal('payment_methods')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center transition-colors group-hover:bg-purple-500/20">
                  <CreditCard size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Payment Methods</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Saved checkout cards and token authorizations</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* CATEGORY: SECURITY */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Security</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* TRANSACTION PIN */}
            <div 
              onClick={() => setActiveModal('transaction_pin')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <Lock size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Transaction PIN</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Secure lock withdrawals and breaking charges</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* PASSWORD */}
            <div 
              onClick={() => setActiveModal('change_password')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <Key size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Change Password</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Update main authentication credentials</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* FINGERPRINT LOGIN */}
            <div 
              className="flex items-center justify-between p-4.5 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Fingerprint size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Fingerprint Login</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Use biometric authentication for mobile app login</p>
                </div>
              </div>
              <button 
                onClick={() => setFingerprintLogin(!fingerprintLogin)}
                className="focus:outline-none cursor-pointer p-1 animate-all"
              >
                {fingerprintLogin ? (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ON</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">OFF</span>
                )}
              </button>
            </div>

            {/* TWO FACTOR AUTH */}
            <div 
              className="flex items-center justify-between p-4.5 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Two-Factor Authentication</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Enforce audit prompts on wallet authorization</p>
                </div>
              </div>
              <button 
                onClick={handle2FAToggle}
                className="focus:outline-none cursor-pointer p-1 animate-all"
              >
                {twoFactor ? (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ON</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">OFF</span>
                )}
              </button>
            </div>

            {/* DEVICES */}
            <div 
              onClick={() => setActiveModal('devices')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Device Management</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Manage connected phones and browsers</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* LOGIN HISTORY */}
            <div 
              onClick={() => setActiveModal('login_history')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Login History</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Audit session timeline and IP addresses</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* SECURITY QUESTIONS */}
            <div 
              onClick={() => setActiveModal('security_questions')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Security Questions</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Configure vault recovery fallback parameters</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* CATEGORY: SAVINGS & INVESTMENTS */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Savings & Investments</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* AUTO SAVE */}
            <div 
              onClick={() => setActiveModal('auto_save')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Auto Save Settings</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Schedule automated balance allocations</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full">ACTIVE</span>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
              </div>
            </div>

            {/* SAVINGS PREFERENCES */}
            <div 
              onClick={() => setActiveModal('savings_preferences')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Savings Preferences</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Set target duration and emergency rules</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* ROUND UP SAVINGS */}
            <div 
              onClick={() => setActiveModal('round_up')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Round-Up Savings</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Save spare change on transaction checkouts</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* WITHDRAWAL SETTINGS */}
            <div 
              onClick={() => setActiveModal('withdrawal_settings')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Withdrawal Settings</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Define strict breakout penalty exemption windows</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* CATEGORY: NOTIFICATIONS */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Notifications</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* PUSH NOTIFICATIONS */}
            <div className="flex items-center justify-between p-4.5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Push Notifications</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Receive immediate operational app alerts</p>
                </div>
              </div>
              <button onClick={() => setPushNotification(!pushNotification)} className="focus:outline-none cursor-pointer">
                {pushNotification ? (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">MUTED</span>
                )}
              </button>
            </div>

            {/* SMS ALERTS */}
            <div className="flex items-center justify-between p-4.5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">SMS Alerts</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Enforce SMS fallback logs on wallet debits</p>
                </div>
              </div>
              <button onClick={() => setSmsAlert(!smsAlert)} className="focus:outline-none cursor-pointer">
                {smsAlert ? (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">MUTED</span>
                )}
              </button>
            </div>

            {/* EMAIL ALERTS */}
            <div className="flex items-center justify-between p-4.5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Email Notifications</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Receive wallet transaction ledger receipts</p>
                </div>
              </div>
              <button onClick={() => setEmailAlert(!emailAlert)} className="focus:outline-none cursor-pointer">
                {emailAlert ? (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">MUTED</span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* CATEGORY: APPEARANCE */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Appearance</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* DARK MODE */}
            <div className="flex items-center justify-between p-4.5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Dark Mode</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Optimize interface visibility settings</p>
                </div>
              </div>
              <button onClick={toggleTheme} className="focus:outline-none cursor-pointer">
                {theme === 'dark' ? (
                  <span className="text-[10px] font-bold text-primary uppercase font-mono bg-primary/10 px-3 py-1 rounded-full border border-primary/20">DARK</span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">LIGHT</span>
                )}
              </button>
            </div>

            {/* LANGUAGE */}
            <div 
              onClick={() => setActiveModal('language')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Languages size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Language</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">English (UK)</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* CATEGORY: SUPPORT */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Support</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* HELP CENTER */}
            <div 
              onClick={() => setActiveModal('help_center')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Help Center</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Read locked savings system guides</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* LIVE CHAT */}
            <div 
              onClick={() => setActiveModal('live_chat')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Live Chat</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Simulate instant messaging support session</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* FAQS */}
            <div 
              onClick={() => setActiveModal('faqs')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">FAQs</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Frequently asked questions</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* CONTACT SUPPORT */}
            <div 
              onClick={() => setActiveModal('contact_support')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Contact Support</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">WhatsApp / Email coordinates</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* REPORT ISSUE */}
            <div 
              onClick={() => setActiveModal('report_issue')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Report an Issue</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Report security issues or UI bugs</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* CATEGORY: LEGAL */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Legal</h3>
          <div className="bg-card-bg border border-border/40 rounded-[24px] overflow-hidden shadow-sm divide-y divide-border/20">
            
            {/* PRIVACY POLICY */}
            <div 
              onClick={() => setActiveModal('privacy_policy')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Privacy Policy</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">View user data protection terms</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* TERMS & CONDITIONS */}
            <div 
              onClick={() => setActiveModal('terms')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Terms & Conditions</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">User terms of service agreement</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

            {/* LICENSES */}
            <div 
              onClick={() => setActiveModal('licenses')}
              className="flex items-center justify-between p-4.5 hover:bg-neutral-gray/40 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-foreground">Licenses</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Open source third-party libraries</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-500 group-hover:text-foreground transition-colors" />
            </div>

          </div>
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="space-y-6 pt-6">
          {/* SIGN OUT */}
          <button 
            onClick={handleLogout}
            className="w-full border border-border/60 hover:bg-neutral-gray text-foreground hover:text-primary transition-all rounded-xl py-3.5 text-xs font-bold font-sans cursor-pointer flex items-center justify-center gap-2"
          >
            🚪 Sign Out of Affy Savings
          </button>

          {/* CLOSE ACCOUNT (DANGER) */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-left">
              <h4 className="font-bold text-xs text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Danger Zone
              </h4>
              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                Permanently delete your profile and purge all dynamic wallet records. This action cannot be undone.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('close_account')}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30 text-[10px] font-bold px-4 py-2 rounded-lg cursor-pointer transition-all self-start sm:self-center uppercase tracking-wider whitespace-nowrap"
            >
              ⚠️ Close Account
            </button>
          </div>
        </div>

      </main>

      {/* ================= MODAL DIALOGS ================= */}

      {activeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-fade-in text-xs max-h-[85vh] overflow-y-auto">
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => {
                setActiveModal(null);
                setProfileError('');
                setProfileSuccess(false);
                setPasswordError('');
                setPasswordSuccess(false);
                setPinError('');
                setPinSuccess(false);
              }}
              className="absolute right-5 top-5 text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-neutral-gray"
            >
              <X size={16} />
            </button>

            {/* 1. PERSONAL INFO MODAL */}
            {activeModal === 'personal_info' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Manage your legal KYC identifier details.</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {profileError && (
                    <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-3 rounded-xl">{profileError}</div>
                  )}
                  {profileSuccess && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 p-3 rounded-xl flex items-center gap-2 font-bold">
                      <CheckCircle2 size={15} />
                      <span>Saved details successfully.</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Full Legal Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Phone Number</label>
                    <input 
                      type="text" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Avatar Url</label>
                    <input 
                      type="text" 
                      value={profileData.avatarUrl}
                      onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                      placeholder="Optional image url link"
                      className={inputClasses}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/10"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}


            {/* 3. LINKED BANK ACCOUNTS */}
            {activeModal === 'bank_accounts' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Connected Bank Accounts</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Manage external funding institutions.</p>
                </div>

                {/* List Linked Banks */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Active Accounts</h4>
                  {linkedAccounts.length === 0 ? (
                    <p className="p-4 bg-neutral-gray/25 rounded-2xl text-center text-zinc-500 font-semibold">No bank accounts linked yet.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                      {linkedAccounts.map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3.5 bg-neutral-gray/30 border border-border/40 rounded-xl">
                          <div>
                            <span className="font-bold block text-foreground">{acc.bank_name}</span>
                            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">{acc.account_number}</span>
                          </div>
                          {acc.is_default && (
                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black font-mono">PRIMARY</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link new form */}
                <form onSubmit={handleLinkBankSubmit} className="space-y-3.5 border-t border-border/20 pt-5">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Link New Bank</h4>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Bank Provider</label>
                    <div className="relative flex gap-2 h-56 border border-border/40 rounded-2xl overflow-hidden bg-input-bg">
                      {/* Scrollable list */}
                      <div id="bank-scroll-container-sett" className="flex-1 overflow-y-auto pr-8 py-1 space-y-3.5 scroll-smooth custom-scrollbar">
                        {[
                          { letter: 'A', banks: ['Access Bank', 'ALAT (Wema Bank)'] },
                          { letter: 'C', banks: ['Carbon (Fintech)', 'Citi Bank Nigeria'] },
                          { letter: 'E', banks: ['Ecobank Nigeria'] },
                          { letter: 'F', banks: ['FairMoney (Fintech)', 'Fidelity Bank', 'First Bank of Nigeria', 'First City Monument Bank (FCMB)'] },
                          { letter: 'G', banks: ['GTBank (Guaranty Trust)'] },
                          { letter: 'K', banks: ['Kuda Bank (Fintech)'] },
                          { letter: 'M', banks: ['Moniepoint (Fintech)'] },
                          { letter: 'O', banks: ['OPay (Fintech)'] },
                          { letter: 'P', banks: ['PalmPay (Fintech)', 'Providus Bank'] },
                          { letter: 'R', banks: ['Rubies Bank'] },
                          { letter: 'S', banks: ['Sparkle Bank', 'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank'] },
                          { letter: 'U', banks: ['Union Bank', 'United Bank for Africa (UBA)'] },
                          { letter: 'V', banks: ['VBank (VFD Microfinance)'] },
                          { letter: 'W', banks: ['Wema Bank'] },
                          { letter: 'Z', banks: ['Zenith Bank'] }
                        ].map(group => (
                          <div key={group.letter} id={`bank-group-sett-${group.letter}`}>
                            <div className="bg-neutral-gray/60 px-3 py-1 font-bold text-[9px] text-zinc-450 dark:text-zinc-550 uppercase tracking-widest sticky top-0 backdrop-blur-md">
                              {group.letter}
                            </div>
                            <div className="divide-y divide-border/10">
                              {group.banks.map(bank => (
                                <button
                                  key={bank}
                                  type="button"
                                  onClick={() => setLinkAccountData({ ...linkAccountData, bankName: bank })}
                                  className={`w-full text-left px-3 py-2 hover:bg-neutral-gray/60 transition-colors text-[11px] flex items-center justify-between ${linkAccountData.bankName === bank ? 'text-primary font-bold bg-primary/5' : 'text-foreground'}`}
                                >
                                  <span>{bank}</span>
                                  {linkAccountData.bankName === bank && <Check size={12} className="text-primary" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Alphabet fast index list */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10 py-1.5 px-0.5 bg-card-bg/50 backdrop-blur-md rounded-full border border-border/30">
                        {['A', 'C', 'E', 'F', 'G', 'K', 'M', 'O', 'P', 'R', 'S', 'U', 'V', 'W', 'Z'].map(char => (
                          <button
                            key={char}
                            type="button"
                            onClick={() => {
                              const element = document.getElementById(`bank-group-sett-${char}`);
                              const container = document.getElementById('bank-scroll-container-sett');
                              if (element && container) {
                                container.scrollTo({
                                  top: element.offsetTop - container.offsetTop,
                                  behavior: 'smooth'
                                });
                              }
                            }}
                            className="text-[8px] font-bold text-zinc-400 hover:text-primary active:text-primary leading-none transition-colors w-3 h-3 flex items-center justify-center rounded-full hover:bg-neutral-gray"
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Account Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1012345678"
                      value={linkAccountData.accountNumber}
                      onChange={(e) => setLinkAccountData({ ...linkAccountData, accountNumber: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary hover:opacity-95 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Integrate Institution Link
                  </button>
                </form>
              </div>
            )}

            {/* 4. PAYMENT METHODS */}
            {activeModal === 'payment_methods' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Payment Methods</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Authorization tokens for direct funding.</p>
                </div>

                <div className="bg-neutral-gray/30 border border-border/40 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">Visa</div>
                      <div>
                        <span className="font-bold block text-foreground">Visa Debit Card</span>
                        <span className="text-[9px] text-zinc-500 font-mono">**** 5219 - Expires 08/29</span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black font-mono">ACTIVE</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-border/20 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">Mc</div>
                      <div>
                        <span className="font-bold block text-foreground">Mastercard Security Token</span>
                        <span className="text-[9px] text-zinc-500 font-mono">**** 9002 - Expires 12/28</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-bold font-mono">INACTIVE</span>
                  </div>
                </div>

                <button 
                  onClick={() => alert("Please initialize a deposit to bind a new debit card security token.")}
                  className="w-full border border-border/60 hover:bg-neutral-gray text-foreground font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Add Payment Method +
                </button>
              </div>
            )}

            {/* 5. TRANSACTION PIN */}
            {activeModal === 'transaction_pin' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Transaction PIN</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Authorizes locks breakout & withdrawals.</p>
                </div>

                <form onSubmit={handlePINSubmit} className="space-y-4">
                  {pinError && (
                    <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-3 rounded-xl">{pinError}</div>
                  )}
                  {pinSuccess && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 p-3 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
                      <CheckCircle2 size={15} />
                      <span>Security PIN updated successfully.</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Current 4-Digit PIN</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      placeholder="••••"
                      value={transactionPINData.currentPIN}
                      onChange={(e) => setTransactionPINData({ ...transactionPINData, currentPIN: e.target.value })}
                      className="w-full text-center tracking-widest text-lg px-4 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">New 4-Digit PIN</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      placeholder="••••"
                      value={transactionPINData.newPIN}
                      onChange={(e) => setTransactionPINData({ ...transactionPINData, newPIN: e.target.value })}
                      className="w-full text-center tracking-widest text-lg px-4 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Confirm New PIN</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      placeholder="••••"
                      value={transactionPINData.confirmPIN}
                      onChange={(e) => setTransactionPINData({ ...transactionPINData, confirmPIN: e.target.value })}
                      className="w-full text-center tracking-widest text-lg px-4 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none"
                      required 
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Save Security PIN
                  </button>
                </form>
              </div>
            )}

            {/* 6. CHANGE PASSWORD */}
            {activeModal === 'change_password' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Change Password</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Secure your authentication login settings.</p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-3 rounded-xl">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 p-3 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
                      <CheckCircle2 size={15} />
                      <span>Security password changed successfully.</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Current Password</label>
                    <input 
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className={inputClasses}
                      required 
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Change Authentication Password
                  </button>
                </form>
              </div>
            )}

            {/* 7. DEVICES */}
            {activeModal === 'devices' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Device Management</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Connected session channels.</p>
                </div>

                <div className="space-y-3">
                  {currentUser.device_tracking.map((session, index) => (
                    <div key={session.id || index} className="flex items-center justify-between p-3.5 bg-neutral-gray/50 rounded-2xl border border-border/40">
                      <div className="flex items-center gap-3">
                        <Smartphone className="text-primary w-4 h-4 flex-shrink-0" />
                        <div>
                          <span className="font-bold block text-foreground leading-tight">{session.device}</span>
                          <span className="text-[9px] text-zinc-400 font-mono mt-1 block">IP Address: {session.ip}</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-mono font-semibold">{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                  ))}

                  {currentUser.device_tracking.length === 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-neutral-gray/50 rounded-2xl border border-border/40">
                      <div className="flex items-center gap-3">
                        <Smartphone className="text-primary w-4 h-4 flex-shrink-0" />
                        <div>
                          <span className="font-bold block text-foreground leading-tight">Current Browser session</span>
                          <span className="text-[9px] text-zinc-400 font-mono mt-1 block">IP Address: 192.168.1.1</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-mono font-semibold">Active Now</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => alert("All other sessions cleared successfully.")}
                  className="w-full text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 py-3 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Revoke All Other Sessions
                </button>
              </div>
            )}

            {/* 8. LOGIN HISTORY */}
            {activeModal === 'login_history' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Authentication History</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Logs of active logins and security resets.</p>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  <div className="p-3 bg-neutral-gray/50 rounded-xl border border-border/40 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold block text-foreground">Interactive Settings Restructured</span>
                      <span className="text-zinc-500 font-mono block mt-0.5">Origin: 192.168.1.1</span>
                    </div>
                    <span className="text-zinc-400 font-mono">Just Now</span>
                  </div>
                  <div className="p-3 bg-neutral-gray/50 rounded-xl border border-border/40 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold block text-foreground">User Login Successful</span>
                      <span className="text-zinc-500 font-mono block mt-0.5">Origin: 192.168.1.1</span>
                    </div>
                    <span className="text-zinc-400 font-mono">1 Hour Ago</span>
                  </div>
                  <div className="p-3 bg-neutral-gray/50 rounded-xl border border-border/40 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold block text-foreground">Deposit Credit Credited</span>
                      <span className="text-zinc-500 font-mono block mt-0.5">Origin: Internal API</span>
                    </div>
                    <span className="text-zinc-400 font-mono">Yesterday</span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SECURITY QUESTIONS */}
            {activeModal === 'security_questions' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Security Recovery Questions</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Recovery fallback verification parameters.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); alert("Security recovery questions configured successfully."); setActiveModal(null); }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Question 1</label>
                    <select className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 text-foreground focus:outline-none">
                      <option>What was the name of your first elementary school?</option>
                      <option>In what city did your parents meet?</option>
                      <option>What is the brand of your first vehicle?</option>
                    </select>
                    <input type="text" placeholder="Your Answer" className={inputClasses + " mt-1.5"} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Question 2</label>
                    <select className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 text-foreground focus:outline-none">
                      <option>What was your childhood nickname?</option>
                      <option>What is the name of your favorite book?</option>
                      <option>What was your grandmother's maiden name?</option>
                    </select>
                    <input type="text" placeholder="Your Answer" className={inputClasses + " mt-1.5"} required />
                  </div>

                  <button type="submit" className="w-full bg-primary hover:opacity-95 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                    Save Recovery Profiles
                  </button>
                </form>
              </div>
            )}

            {/* 10. AUTO SAVE SETTINGS */}
            {activeModal === 'auto_save' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Auto Save Configuration</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Automated balance allocation settings.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-gray/50 rounded-2xl">
                  <div>
                    <span className="font-bold block text-foreground">Auto Save Status</span>
                    <span className="text-[9px] text-zinc-500">Automatically deposit from bank to lock plans</span>
                  </div>
                  <button onClick={() => setAutoSaveConfig({ ...autoSaveConfig, enabled: !autoSaveConfig.enabled })} className="focus:outline-none cursor-pointer">
                    {autoSaveConfig.enabled ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">MUTED</span>
                    )}
                  </button>
                </div>

                {autoSaveConfig.enabled && (
                  <form onSubmit={(e) => { e.preventDefault(); alert("Auto save preferences saved successfully."); setActiveModal(null); }} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase">Frequency</label>
                      <select 
                        value={autoSaveConfig.frequency}
                        onChange={(e) => setAutoSaveConfig({ ...autoSaveConfig, frequency: e.target.value })}
                        className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 text-foreground focus:outline-none"
                      >
                        <option value="daily">Daily Automatic</option>
                        <option value="weekly">Weekly Automatic</option>
                        <option value="monthly">Monthly Automatic</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase">Amount per Interval (NGN)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-500">₦</span>
                        <input 
                          type="number"
                          value={autoSaveConfig.amount}
                          onChange={(e) => setAutoSaveConfig({ ...autoSaveConfig, amount: e.target.value })}
                          className="w-full text-xs pl-8 pr-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none text-foreground"
                          required 
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-primary hover:opacity-95 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                      Save Auto Save Preference
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 11. SAVINGS PREFERENCES */}
            {activeModal === 'savings_preferences' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Savings Preferences</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Determine target durations and emergency parameters.</p>
                </div>

                <div className="space-y-4 bg-neutral-gray/30 border border-border/40 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 font-semibold">DEFAULT LOCK DURATION</span>
                    <span className="font-bold text-foreground">90 Days (Flexible)</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-3 text-[11px]">
                    <span className="text-zinc-500 font-semibold">BREAKOUT PENALTY RATE</span>
                    <span className="font-bold text-red-400">5.0% Emergency Fee</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-3 text-[11px]">
                    <span className="text-zinc-500 font-semibold">TARGET REWARDS YIELD</span>
                    <span className="font-bold text-emerald-500">12.5% p.a. Compound</span>
                  </div>
                </div>
              </div>
            )}

            {/* 12. ROUND UP SAVINGS */}
            {activeModal === 'round_up' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Round-Up Savings</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Automated micro-allocations on spending checkouts.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-gray/50 rounded-2xl">
                  <div>
                    <span className="font-bold block text-foreground">Round-Up Status</span>
                    <span className="text-[9px] text-zinc-500">Round up transaction charges to nearest ₦100</span>
                  </div>
                  <button onClick={() => setRoundUpEnabled(!roundUpEnabled)} className="focus:outline-none cursor-pointer">
                    {roundUpEnabled ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">ACTIVE</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-500/10 px-3 py-1 rounded-full border border-zinc-500/20">MUTED</span>
                    )}
                  </button>
                </div>

                <div className="text-[10px] text-zinc-400 leading-relaxed bg-neutral-gray/30 p-4 rounded-xl border border-border/40">
                  <strong>How it works:</strong> If you perform an eTranzact checkout of ₦1,450.00, our micro-vault accelerator rounds it up to ₦1,500.00 and deposits the spare ₦50.00 directly to your target savings plan!
                </div>
              </div>
            )}

            {/* 13. WITHDRAWAL SETTINGS */}
            {activeModal === 'withdrawal_settings' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Withdrawal Exemptions</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Defined strict lock breakout rules.</p>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-2xl text-amber-600 leading-relaxed text-[11px] space-y-2">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Strict Savings Policy Enforced
                  </p>
                  <p>
                    All locked strategy vaults have legally binding end-dates. Breaking a plan before maturity triggers a <strong>5% penalty fee deduction</strong>.
                  </p>
                </div>

                <div className="bg-neutral-gray/30 border border-border/40 p-5 rounded-2xl space-y-4 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-semibold">FREE BREAKOUT MONTH</span>
                    <span className="font-bold text-foreground">December (Exempted)</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-3">
                    <span className="text-zinc-500 font-semibold">MAXIMUM MONTHLY WITHDRAWALS</span>
                    <span className="font-bold text-foreground">3 transfers</span>
                  </div>
                </div>
              </div>
            )}

            {/* 14. LANGUAGE */}
            {activeModal === 'language' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Select Language</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Choose app interface localization.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-neutral-gray/50 border border-primary/30 rounded-xl text-primary font-bold">
                    <span>English (United Kingdom)</span>
                    <Check size={16} />
                  </div>
                  <div 
                    onClick={() => { alert("Yoruba language bundle is being compiled. Please check updates."); setActiveModal(null); }}
                    className="flex items-center justify-between p-3.5 bg-neutral-gray/20 hover:bg-neutral-gray/40 border border-border/40 rounded-xl text-foreground font-semibold cursor-pointer"
                  >
                    <span>Yoruba (Nigeria)</span>
                  </div>
                  <div 
                    onClick={() => { alert("Hausa language bundle is being compiled. Please check updates."); setActiveModal(null); }}
                    className="flex items-center justify-between p-3.5 bg-neutral-gray/20 hover:bg-neutral-gray/40 border border-border/40 rounded-xl text-foreground font-semibold cursor-pointer"
                  >
                    <span>Hausa (Nigeria)</span>
                  </div>
                  <div 
                    onClick={() => { alert("Igbo language bundle is being compiled. Please check updates."); setActiveModal(null); }}
                    className="flex items-center justify-between p-3.5 bg-neutral-gray/20 hover:bg-neutral-gray/40 border border-border/40 rounded-xl text-foreground font-semibold cursor-pointer"
                  >
                    <span>Igbo (Nigeria)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 15. HELP CENTER */}
            {activeModal === 'help_center' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Help Center Guides</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Guides and documentation on strict savings.</p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 bg-neutral-gray/50 border border-border/40 rounded-xl">
                    <span className="font-bold block text-foreground">How does the 3-Month Capital Guard work?</span>
                    <span className="text-[10px] text-zinc-500 mt-1 block leading-relaxed">
                      Your funds are securely locked in an escrow account. Impulsive withdrawals are rejected until the maturity end-date.
                    </span>
                  </div>
                  <div className="p-3.5 bg-neutral-gray/50 border border-border/40 rounded-xl">
                    <span className="font-bold block text-foreground">What is the penalty fee for early breaking?</span>
                    <span className="text-[10px] text-zinc-500 mt-1 block leading-relaxed">
                      To encourage saving disciplines, breaking an active plan triggers a 5.0% flat-rate audit fee deduction.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 16. LIVE CHAT */}
            {activeModal === 'live_chat' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Simulated Support Messenger</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Direct chat channel with compliance agents.</p>
                </div>

                {/* Message display thread */}
                <div className="bg-neutral-gray/30 border border-border/40 rounded-2xl p-4 h-60 overflow-y-auto space-y-3 flex flex-col">
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`max-w-[80%] p-3 rounded-2xl text-[11px] ${
                        msg.sender === 'user' 
                          ? 'bg-primary text-white self-end rounded-tr-none' 
                          : 'bg-neutral-gray/70 text-foreground self-start rounded-tl-none border border-border/20'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className="text-[8px] text-zinc-400 block mt-1 text-right">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Chat input form */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none text-foreground"
                    required 
                  />
                  <button 
                    type="submit" 
                    className="bg-primary hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* 17. FAQS */}
            {activeModal === 'faqs' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Frequently Asked Questions</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Quick answers to common inquiries.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-bold text-foreground block text-[11px]">Can I disable the early break penalty fee?</span>
                    <span className="text-[10px] text-zinc-400 block mt-1 leading-relaxed">
                      No. The penalty is a systemic contract enforced by our compliance algorithms to promote strict financial discipline.
                    </span>
                  </div>
                  <div className="border-t border-border/20 pt-3">
                    <span className="font-bold text-foreground block text-[11px]">How do I link an external fintech account?</span>
                    <span className="text-[10px] text-zinc-400 block mt-1 leading-relaxed">
                      Navigate to Connected Banks under Account settings, choose your provider (OPay, Moniepoint, etc.), enter details, and verify.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 18. CONTACT SUPPORT */}
            {activeModal === 'contact_support' && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Contact Affy Savings</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Secure operator support handles.</p>
                </div>

                <div className="bg-neutral-gray/30 border border-border/40 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-semibold uppercase text-[10px]">Support Hotline</span>
                    <span className="font-bold text-primary font-mono">+234 810 315 1999</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-3">
                    <span className="text-zinc-500 font-semibold uppercase text-[10px]">Email Address</span>
                    <span className="font-bold text-foreground font-mono">support@affysavings.com</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-3">
                    <span className="text-zinc-500 font-semibold uppercase text-[10px]">WhatsApp Support</span>
                    <span className="font-bold text-emerald-500 font-mono">Chat via wa.me/2348103151999</span>
                  </div>
                </div>
              </div>
            )}

            {/* 19. REPORT ISSUE */}
            {activeModal === 'report_issue' && (
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Report an Issue</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Help us maintain absolute vault integrity.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); alert("Issue reported successfully. Thank you for your support!"); setActiveModal(null); }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Issue Category</label>
                    <select className="w-full text-xs px-3 py-3 rounded-xl bg-input-bg border border-border/60 text-foreground focus:outline-none">
                      <option>Security loop / Vulnerability</option>
                      <option>Payment / Checkout error</option>
                      <option>Visual layout alignment bug</option>
                      <option>Other / Feedback</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase">Description</label>
                    <textarea 
                      rows={3} 
                      placeholder="Please describe the issue in detail..." 
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:outline-none text-foreground"
                      required
                    />
                  </div>

                  <button type="submit" className="w-full bg-primary hover:opacity-95 text-white font-bold py-3 rounded-xl transition-all cursor-pointer">
                    Submit Audit Report
                  </button>
                </form>
              </div>
            )}

            {/* 20. LEGAL MODAL (Privacy Policy, Terms, Licenses) */}
            {(activeModal === 'privacy_policy' || activeModal === 'terms' || activeModal === 'licenses') && (
              <div className="space-y-5">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">
                    {activeModal === 'privacy_policy' && 'Privacy Policy'}
                    {activeModal === 'terms' && 'Terms & Conditions'}
                    {activeModal === 'licenses' && 'Open Source Licenses'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Legally audited agreement files.</p>
                </div>

                <div className="bg-neutral-gray/30 border border-border/40 p-4.5 rounded-2xl max-h-60 overflow-y-auto leading-relaxed text-[11px] space-y-3.5 text-zinc-300">
                  {activeModal === 'privacy_policy' && (
                    <>
                      <p><strong>1. Data Protection:</strong> We store encrypted credentials in high-security environments. Your balance data is secured via standard client-side simulations and never leaks to public APIs.</p>
                      <p><strong>2. Transaction Logs:</strong> System ledger entries are kept locally to evaluate compound yields and track penalties. We do not Sell or trade your banking history.</p>
                    </>
                  )}
                  {activeModal === 'terms' && (
                    <>
                      <p><strong>1. Strict Commitment:</strong> By initializing a Locked strategy, you acknowledge that early withdrawal breaks are subject to a flat 5.0% compliance fee deduction.</p>
                      <p><strong>2. Escrow Execution:</strong> The platform acts as an automated lockbox. No exceptions are granted for breakout requests prior to the maturity end-date.</p>
                    </>
                  )}
                  {activeModal === 'licenses' && (
                    <>
                      <p><strong>Affy Savings Next.js:</strong> MIT License</p>
                      <p><strong>Lucide React:</strong> ISC License</p>
                      <p><strong>Recharts:</strong> MIT License</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 21. CLOSE ACCOUNT MODAL */}
            {activeModal === 'close_account' && (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Confirm Account Closure?</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    You are about to permanently purge your Affy Savings premium digital wallet. This action will delete your credentials and remove access to your dashboard.
                  </p>
                </div>

                <div className="bg-red-500/5 border border-red-500/15 p-4 rounded-xl text-red-500 leading-relaxed text-[11px]">
                  <strong>WARNING:</strong> All active locked plans and compound portfolios must mature before liquidation is possible. Any remaining liquid balance will be lost if not transferred prior to closure.
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="border border-border/60 hover:bg-neutral-gray text-foreground font-bold py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCloseAccount}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Purge Account
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card-bg md:hidden border-t border-border/40 flex justify-around py-3 shadow-lg safe-bottom">
        <Link 
          href="/dashboard" 
          className="flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors text-zinc-400 hover:text-primary"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="4"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="12" y1="10" x2="12" y2="22"/></svg>
          <span className="text-[9px] font-bold font-sans uppercase tracking-wider scale-90">Overview</span>
        </Link>
        <Link 
          href="/dashboard" 
          className="flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors text-zinc-400 hover:text-primary"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span className="text-[9px] font-bold font-sans uppercase tracking-wider scale-90">Ledger</span>
        </Link>
        <Link 
          href="/dashboard" 
          className="flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors text-zinc-400 hover:text-primary"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <span className="text-[9px] font-bold font-sans uppercase tracking-wider scale-90">Cards</span>
        </Link>
        <Link 
          href="/dashboard/settings" 
          className="flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors text-primary"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="text-[9px] font-bold font-sans uppercase tracking-wider scale-90">Settings</span>
        </Link>
      </div>
    </div>
  );
}
