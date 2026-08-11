'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DB, User } from '@/services/db';
import { ShieldCheck, LogIn, Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';
import { supabase } from '@/services/supabaseClient';

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

  const [loading, setLoading] = useState(false);
  const isStaffEmail = DB.getStaff().some(s => s.email.toLowerCase() === formData.email.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAttemptsInfo('');

    const lowercaseEmail = formData.email.trim().toLowerCase();
    if (!lowercaseEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (isStaffEmail) {
      // Staff password verification
      if (!formData.password) {
        setError('Please enter your password.');
        return;
      }

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
      setError('Invalid email or password.');
      return;
    }

    // Customer OTP verification
    setLoading(true);
    const users = DB.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === lowercaseEmail);

    if (userIndex === -1) {
      setError('No account found with this email. Please sign up first.');
      setLoading(false);
      return;
    }

    const user = users[userIndex];

    // Check lock state
    if (user.is_locked) {
      setError('This account has been locked due to multiple suspicious failed login attempts. Please contact Compliance to unlock it.');
      DB.addAuditLog(user.id, 'Blocked Login Attempt (Locked Account)', { email: user.email });
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError('Authentication service is not initialized.');
      setLoading(false);
      return;
    }

    // Call Supabase Auth to send OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: lowercaseEmail,
      options: {
        shouldCreateUser: false
      }
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }

    DB.addAuditLog(user.id, 'Login OTP Triggered', { email: user.email });
    router.push(`/auth/verify?email=${encodeURIComponent(lowercaseEmail)}&type=login`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-200px] left-[-100px]" />
      <div className="bg-ambient-glow glow-emerald bottom-[-200px] right-[-100px]" />

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

          {/* Password (only shown for staff profiles) */}
          {isStaffEmail && (
            <div className="space-y-1.5 animate-fade-in">
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
          )}

          {/* CTA */}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: cms.branding.primaryColor }}
            className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : isStaffEmail ? 'Login' : 'Send Verification Code'}
            <ArrowRight size={16} />
          </button>

          <div className="text-center text-xs text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">
              Create Account
            </Link>
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
