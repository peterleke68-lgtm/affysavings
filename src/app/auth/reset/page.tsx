'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Key, Mail, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function ResetPage() {
  const router = useRouter();
  const { cms } = useApp();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = enter email, 2 = enter otp + new password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // STEP 1: REQUEST PASSWORD RESET OTP
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_otp',
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Failed to request recovery code.');
        return;
      }

      setStep(2);
    } catch (err) {
      console.error('[Forgot Password] Error:', err);
      setError('Unable to reach the server. Please check your connection.');
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP AND UPDATE PASSWORD
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all recovery fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. Please check your recovery code.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (err) {
      console.error('[Forgot Password] Error:', err);
      setError('Unable to reach the server. Please check your connection.');
      setLoading(false);
    }
  };

  const inputClasses = "w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400";
  const labelClasses = "block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple bottom-[-150px] right-[-50px]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Header Link */}
        <Link 
          href="/auth/login"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary mb-6 font-bold transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Login
        </Link>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="mb-2">
            <AffyLogo className="h-8" />
          </div>
          <h2 className="text-lg font-bold font-display tracking-tight">Reset Password</h2>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-[280px] leading-relaxed">
            {step === 1 
              ? "Enter your registered email to receive a secure recovery code."
              : `Enter the code sent to ${email} and set your new password.`
            }
          </p>
        </div>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold font-display">Password Updated</h2>
            <p className="text-xs text-zinc-500 mt-1">Redirecting to login...</p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleSendReset} className="space-y-4">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Mail size={12} className="text-primary" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Request Security Code</span>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl leading-relaxed text-center">
                {error}
              </div>
            )}

            <div>
              <label className={labelClasses}>Registered Email Address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: cms.branding?.primaryColor || '#a855f7' }}
              className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Recovery Code'}
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Key size={12} className="text-primary" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Set New Password</span>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl leading-relaxed text-center">
                {error}
              </div>
            )}

            <div>
              <label className={labelClasses}>6-Digit Recovery Code</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className={`${inputClasses} font-mono tracking-widest text-center text-base`}
                required
              />
            </div>

            <div>
              <label className={labelClasses}>New Password (min 8)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputClasses} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: cms.branding?.primaryColor || '#a855f7' }}
              className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password & Sign In'}
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Security Trust Indicators */}
        <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>Encrypted with Scrypt Authentication.</span>
        </div>
      </div>
    </div>
  );
}
