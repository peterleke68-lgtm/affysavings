'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { DB, logSimulation, User } from '@/services/db';
import { 
  ArrowLeft, 
  ShieldCheck, 
  User as UserIcon, 
  Key, 
  ToggleLeft, 
  ToggleRight, 
  Smartphone, 
  Mail, 
  Phone,
  CheckCircle2,
  Lock,
  Globe,
  Settings,
  Compass
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

  // Form states
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

  const [twoFactor, setTwoFactor] = useState(currentUser?.two_factor_enabled || false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!currentUser) return null;

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
  };

  const inputClasses = "w-full text-xs px-4 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-zinc-400";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative background glows */}
      <div className="bg-ambient-glow glow-purple top-[-100px] left-[-150px] opacity-10" />

      {/* HEADER SECTION */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl h-18 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary font-bold cursor-pointer transition-colors">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 text-zinc-400">
            <Settings size={16} className="text-primary animate-spin-slow" />
            <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Secure Settings</span>
          </div>
        </div>
      </header>

      {/* SETTINGS CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start z-10">
        
        {/* Left Hand Profile Summary Card */}
        <div className="md:col-span-4 bg-card-bg border border-border/40 rounded-3xl p-6 text-center shadow-sm hover-lift">
          <div className="w-18 h-18 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl mx-auto mb-4 font-display">
            {currentUser.name[0]}
          </div>
          <h3 className="font-bold text-lg font-display text-foreground">{currentUser.name}</h3>
          <p className="text-xs text-zinc-400 font-mono mt-1 tracking-wider">{currentUser.email}</p>
          
          <div className="mt-8 pt-6 border-t border-border/30 space-y-4 text-left text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-primary flex-shrink-0" />
              <span className="truncate font-medium">{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-primary flex-shrink-0" />
              <span className="font-medium">{currentUser.phone || 'No phone added'}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-border/20 pt-4">
              <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="font-bold text-emerald-500 uppercase tracking-wide text-[10px]">Verified Profile</span>
            </div>
          </div>
        </div>

        {/* Right Hand Settings Grid Forms */}
        <div className="md:col-span-8 space-y-8 animate-fade-in">
          
          {/* Section 1: Update Profile Details */}
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm hover-lift">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border/30">
              <UserIcon size={18} className="text-primary" />
              <h4 className="font-bold text-sm font-display text-foreground">Profile Configurations</h4>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5 text-xs">
              
              {profileError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-3 rounded-xl">{profileError}</div>
              )}
              {profileSuccess && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 p-3 rounded-xl flex items-center gap-2 font-bold">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>Profile details saved successfully.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Full Legal Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  style={{ backgroundColor: cms.branding.primaryColor }}
                  className="text-white text-xs font-bold px-6 py-3 rounded-xl hover:opacity-95 cursor-pointer transition-opacity shadow-md shadow-primary/10 font-sans"
                >
                  Save Profile
                </button>
              </div>

            </form>
          </div>

          {/* Section 2: Multi-Factor Authentication (2FA) */}
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm hover-lift">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-primary" />
                <h4 className="font-bold text-sm font-display text-foreground">Two-Factor Authentication (2FA)</h4>
              </div>
              <button 
                onClick={handle2FAToggle}
                className="text-zinc-500 hover:text-foreground cursor-pointer transition-colors p-1"
              >
                {twoFactor ? (
                  <ToggleRight size={32} className="text-emerald-500" />
                ) : (
                  <ToggleLeft size={32} className="text-zinc-400" />
                )}
              </button>
            </div>

            <div className="text-xs text-zinc-500 leading-relaxed space-y-4">
              <p>
                Enable Multi-Factor Security to audit all logins. When active, signing into your AFFY SAVINGS wallet triggers a verification prompt on your simulated notifications channels.
              </p>
              {twoFactor && (
                <div className="bg-neutral-gray/50 p-4 rounded-2xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="block font-bold text-foreground">Active 2FA Secret Key</span>
                    <code className="text-[10px] bg-card-bg border border-border/60 px-2 py-0.5 rounded-lg font-mono tracking-wider text-primary font-black mt-1 inline-block">SEC-GAUTH-AFFY881</code>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-black font-mono self-start sm:self-center">SECURED</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2.5: Appearance Theme (Dark/Light mode) */}
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm hover-lift">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-primary" />
                <h4 className="font-bold text-sm font-display text-foreground">Appearance Preference</h4>
              </div>
              <button 
                onClick={toggleTheme}
                className="text-zinc-500 hover:text-foreground cursor-pointer transition-colors p-1"
              >
                {theme === 'dark' ? (
                  <ToggleRight size={32} className="text-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-zinc-400" />
                )}
              </button>
            </div>

            <div className="text-xs text-zinc-500 leading-relaxed space-y-4">
              <p>
                Toggle between dark mode (optimal for night reading) and light mode (optimal for outdoor environments).
              </p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">Current Mode:</span>
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black font-mono text-[9px] uppercase tracking-wider">
                  {theme} Mode
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Reset Password Security */}
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm hover-lift">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border/30">
              <Key size={18} className="text-primary" />
              <h4 className="font-bold text-sm font-display text-foreground">Change Password</h4>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              
              {passwordError && (
                <div className="bg-red-500/5 border border-red-500/15 text-red-500 p-3 rounded-xl">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 text-emerald-500 p-3 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>Password changed successfully. Check simulated emails.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  style={{ backgroundColor: cms.branding.primaryColor }}
                  className="text-white text-xs font-bold px-6 py-3 rounded-xl hover:opacity-95 cursor-pointer transition-opacity shadow-md shadow-primary/10 font-sans"
                >
                  Change Password
                </button>
              </div>

            </form>
          </div>

          {/* Section 4: Device Tracking Logs */}
          <div className="bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm hover-lift">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border/30">
              <Compass size={18} className="text-primary animate-pulse" />
              <h4 className="font-bold text-sm font-display text-foreground">Session History</h4>
            </div>

            <div className="space-y-3">
              {currentUser.device_tracking.map((session, index) => (
                <div key={session.id || index} className="flex items-center justify-between text-xs p-4 bg-neutral-gray/50 rounded-2xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <Lock className="text-primary w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="font-bold block text-foreground leading-tight">{session.device}</span>
                      <span className="text-[9px] text-zinc-400 font-mono mt-1 block">IP: {session.ip}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono font-semibold">{new Date(session.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>

      {/* MOBILE BOTTOM NAVIGATION REDESIGN */}
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
