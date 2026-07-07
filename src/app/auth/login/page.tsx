'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DB, logSimulation, User } from '@/services/db';
import { ShieldCheck, LogIn, Eye, EyeOff, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function LoginPage() {
  const router = useRouter();
  const { cms, setCurrentUser, setCurrentStaff } = useApp();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attemptsInfo, setAttemptsInfo] = useState('');
  const [showDemoCreds, setShowDemoCreds] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAttemptsInfo('');

    if (!formData.email || !formData.password) {
      setError('Please fill in both email and password.');
      return;
    }

    const lowercaseEmail = formData.email.toLowerCase();

    // Check staff login first
    const staffList = DB.getStaff();
    const staffMatch = staffList.find(s => s.email.toLowerCase() === lowercaseEmail);
    if (staffMatch) {
      if (formData.password === 'password123') {
        if (!staffMatch.is_active) {
          setError('This staff account has been deactivated by administration.');
          return;
        }
        setCurrentStaff(staffMatch);
        DB.addAuditLog(null, 'Staff Login Successful', { email: staffMatch.email, role: staffMatch.role });
        router.push('/staff');
        return;
      }
    }

    // Check user login
    const users = DB.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === lowercaseEmail);

    if (userIndex === -1) {
      setError('Invalid email or password.');
      return;
    }

    const user = users[userIndex];

    // Check lock state
    if (user.is_locked) {
      setError('This account has been locked due to multiple suspicious failed login attempts. Please contact Compliance to unlock it.');
      DB.addAuditLog(user.id, 'Blocked Login Attempt (Locked Account)', { email: user.email });
      return;
    }

    // Simulate password check
    let savedPassword = 'password123';
    const regData = localStorage.getItem(`affy_pending_user_${user.email}`);
    if (regData) {
      try {
        const parsed = JSON.parse(regData);
        savedPassword = parsed.password;
      } catch {}
    }
    const customPassword = localStorage.getItem(`affy_pwd_${user.email}`);
    if (customPassword) {
      savedPassword = customPassword;
    }

    if (formData.password !== savedPassword) {
      const updatedAttempts = user.failed_attempts + 1;
      let newLockState = false;

      if (updatedAttempts >= 3) {
        newLockState = true;
        user.is_locked = true;
        setError('Your account has been locked due to 3 failed login attempts.');
        DB.addAuditLog(user.id, 'Account Locked', { email: user.email, attempts: updatedAttempts });
      } else {
        setError('Invalid email or password.');
        setAttemptsInfo(`Attempt ${updatedAttempts} of 3 before account lock.`);
      }

      user.failed_attempts = updatedAttempts;
      users[userIndex] = user;
      DB.saveUsers(users);

      DB.addAuditLog(user.id, 'Login Failed', { email: user.email, attempts: updatedAttempts, isLocked: newLockState });
      return;
    }

    // Successful password match: Reset failed attempts
    user.failed_attempts = 0;
    users[userIndex] = user;
    DB.saveUsers(users);

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem(`affy_2fa_${user.email}`, JSON.stringify({ otp, expires: Date.now() + 5 * 60000 }));

      logSimulation(
        'WhatsApp',
        '2FA Login Verification Code',
        user.phone || '+1 (555) 123-4567',
        `Your AFFY SAVINGS 2FA login code is ${otp}. Expires in 5 minutes.`
      );
      logSimulation(
        'Email',
        'Secure 2FA OTP',
        user.email,
        `Hi ${user.name},\n\nA login attempt requires authentication. Your 2FA security verification code is: ${otp}.\n\nIf you did not initiate this login, secure your password immediately.`
      );

      DB.addAuditLog(user.id, 'Login 2FA Challenge Triggered', { email: user.email });
      router.push(`/auth/verify?email=${encodeURIComponent(user.email)}&type=2fa`);
      return;
    }

    // Direct Login (No 2FA)
    setCurrentUser(user);
    
    logSimulation(
      'Email',
      'Successful Login Alert',
      user.email,
      `Hi ${user.name},\n\nA successful login was detected on your AFFY SAVINGS wallet.\n\nDevice: Chrome / Windows 11\nTime: ${new Date().toLocaleString()}\nIP: 192.168.1.100`
    );

    DB.addAuditLog(user.id, 'Login Successful', { email: user.email });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-200px] left-[-100px]" />
      <div className="bg-ambient-glow glow-emerald bottom-[-200px] right-[-100px]" />

      {/* Demo Credentials Drawer */}
      {showDemoCreds && (
        <div className="w-full max-w-md bg-amber-500/5 border border-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] p-4 rounded-2xl mb-4 leading-relaxed animate-fade-in z-10">
          <div className="flex items-center gap-1.5 font-bold mb-2 text-xs">
            <AlertTriangle size={14} />
            <span>Demo Testing Credentials</span>
            <span className="ml-auto text-[9px] font-mono opacity-70">Password: password123</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
            <div>Customer: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">customer@affysavings.com</code></div>
            <div>Admin: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">admin@affysavings.com</code></div>
            <div>Compliance: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">compliance@affysavings.com</code></div>
            <div>Finance: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">finance@affysavings.com</code></div>
            <div>Operations: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">operations@affysavings.com</code></div>
            <div>Content: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">content@affysavings.com</code></div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-8 md:p-10 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <Link href="/" className="mb-3">
            <AffyLogo className="h-9" />
          </Link>
          <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Secure Fintech Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display tracking-tight">Welcome back</h2>
            <p className="text-xs text-zinc-500">Enter your credentials to access your savings vault.</p>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-xl leading-relaxed">
              <div>{error}</div>
              {attemptsInfo && <div className="mt-1 font-bold font-mono text-[10px]">{attemptsInfo}</div>}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-sm px-4 py-3.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Password</label>
              <Link href="/auth/reset" className="text-[10px] text-primary hover:underline font-bold">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full text-sm px-4 py-3.5 pr-12 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            style={{ backgroundColor: cms.branding.primaryColor }}
            className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 mt-2"
          >
            Sign In
            <ArrowRight size={16} />
          </button>

          <div className="text-center text-xs text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">
              Create Account
            </Link>
          </div>

          <div className="pt-4 border-t border-border/30 text-center">
            <button
              type="button"
              onClick={() => setShowDemoCreds(!showDemoCreds)}
              className="text-[10px] text-zinc-400 hover:text-primary transition-colors underline cursor-pointer font-semibold"
            >
              {showDemoCreds ? "Hide Demo Credentials" : "Show Demo Credentials"}
            </button>
          </div>
        </form>

        {/* Security Trust Indicators */}
        <div className="mt-8 pt-5 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>End-to-end encrypted with AES-256 & MFA.</span>
        </div>
      </div>
    </div>
  );
}
