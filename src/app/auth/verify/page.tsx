'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DB, User } from '@/services/db';
import { ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cms, setCurrentUser } = useApp();
  
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup'; // 'signup' | '2fa' | 'login'

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Focus helper
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown === 0) return;
    const timer = setTimeout(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleChange = (index: number, value: string) => {
    // Strip non-numeric characters
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue === '') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }
    
    const char = cleanValue.substring(cleanValue.length - 1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Only accept 6 digits

    const digits = pastedData.split('');
    setOtp(digits);

    // Focus the last input box
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits.');
      setLoading(false);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let pendingUser: any = null;
    const pendingUserStr = localStorage.getItem(`affy_pending_user_${normalizedEmail}`);
    if (pendingUserStr) {
      try {
        pendingUser = JSON.parse(pendingUserStr)?.user;
      } catch {
        // Ignored
      }
    }

    // Verify OTP with self-managed backend API
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          otp: fullOtp,
          type,
          name: pendingUser?.name,
          phone: pendingUser?.phone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.verified && data.user) {
        // Server verification and session creation succeeded
        const verifiedUser: User = data.user;
        const users = DB.getUsers();
        const filtered = users.filter(u => u.email.toLowerCase() !== normalizedEmail);
        filtered.push(verifiedUser);
        DB.saveUsers(filtered);
        DB.getWalletForUser(verifiedUser.id);
        DB.addAuditLog(verifiedUser.id, type === 'signup' ? 'User Email Verified (Signup)' : 'User Login Verified', { email: verifiedUser.email });

        localStorage.removeItem(`affy_otp_${normalizedEmail}`);
        localStorage.removeItem(`affy_pending_user_${normalizedEmail}`);
        localStorage.removeItem(`affy_2fa_${normalizedEmail}`);

        setSuccess(true);
        setTimeout(() => {
          setCurrentUser(verifiedUser);
          router.push('/dashboard');
        }, 1000);
        return;
      } else if (!res.ok) {
        setError(data.error || 'Invalid verification code.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Affy Auth] verify-otp API network error:', err);
      setError('Unable to reach the server. Please check your connection and try again.');
      setLoading(false);
      return;
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, type }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setResendCountdown(60);
        setError('A new verification code has been sent to your email.');
        return;
      } else {
        setError(data.error || 'Failed to resend code. Please try again.');
        return;
      }
    } catch (err) {
      console.warn('[Affy Auth] resend-otp API request failed:', err);
      setError('Unable to reach the server. Please check your connection and try again.');
      setResendCountdown(60);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-150px] left-[30%]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-8 md:p-10 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Header Link */}
        <button 
          onClick={() => router.push('/auth/login')}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary mb-8 font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Login
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-4">
            <AffyLogo className="h-8" />
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight">Verify Your Identity</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-[280px] leading-relaxed">
            Enter the 6-digit code sent to your registered channels for <strong className="text-foreground">{email}</strong>.
          </p>
        </div>

        {success ? (
          <div className="py-16 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
              <ShieldCheck size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold font-display text-primary">Identity Confirmed</h2>
            <p className="text-xs text-zinc-500 mt-1">Initializing secure session...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <KeyRound size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Enter Security Code</span>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-xl leading-relaxed text-center">
                {error}
              </div>
            )}

            {/* OTP Input Grid */}
            <div className="flex justify-between items-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={digit}
                  ref={(el) => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-lg font-extrabold rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200"
                />
              ))}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: cms.branding.primaryColor }}
              className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Verify Code
            </button>

            <div className="text-center">
              <button
                type="button"
                disabled={resendCountdown > 0 || loading}
                onClick={handleResend}
                className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                  resendCountdown > 0 
                    ? 'text-zinc-500 cursor-not-allowed' 
                    : 'text-zinc-400 hover:text-primary'
                }`}
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* Security Trust Indicators */}
        <div className="mt-8 pt-5 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>End-to-end encrypted with AES-256 & MFA.</span>
        </div>
      </div>
    </div>
  );
}
