'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DB, logSimulation, User } from '@/services/db';
import { ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cms, setCurrentUser } = useApp();
  
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup'; // 'signup' | '2fa'

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Focus helper
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits.');
      setLoading(false);
      return;
    }

    // Check code validity
    if (type === 'signup') {
      const otpDataStr = localStorage.getItem(`affy_otp_${email}`);
      const pendingUserStr = localStorage.getItem(`affy_pending_user_${email}`);

      if (!otpDataStr || !pendingUserStr) {
        setError('Verification session expired or invalid. Please sign up again.');
        setLoading(false);
        return;
      }

      const otpData = JSON.parse(otpDataStr);
      const pending = JSON.parse(pendingUserStr);

      if (Date.now() > otpData.expires) {
        setError('OTP has expired. Please request a new code.');
        setLoading(false);
        return;
      }

      if (fullOtp !== otpData.otp) {
        setError('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }

      // Valid OTP: Save user to DB & activate wallet
      const users = DB.getUsers();
      const userToSave: User = {
        ...pending.user,
        is_verified: true
      };
      users.push(userToSave);
      DB.saveUsers(users);

      // Create initial wallet and balance
      DB.getWalletForUser(userToSave.id);

      // Add audit log
      DB.addAuditLog(userToSave.id, 'User Email Verified (Signup)', { email: userToSave.email });

      // Clear pending
      localStorage.removeItem(`affy_otp_${email}`);
      localStorage.removeItem(`affy_pending_user_${email}`);

      setSuccess(true);
      setTimeout(() => {
        setCurrentUser(userToSave);
        router.push('/dashboard');
      }, 1200);

    } else if (type === '2fa') {
      const otpDataStr = localStorage.getItem(`affy_2fa_${email}`);
      if (!otpDataStr) {
        setError('2FA verification session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const otpData = JSON.parse(otpDataStr);
      if (Date.now() > otpData.expires) {
        setError('2FA code has expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (fullOtp !== otpData.otp) {
        setError('Invalid 2FA code. Please check your verification source.');
        setLoading(false);
        return;
      }

      // Valid 2FA OTP: Find user and log in
      const users = DB.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        setError('User profile not found.');
        setLoading(false);
        return;
      }

      // Clear otp
      localStorage.removeItem(`affy_2fa_${email}`);

      setSuccess(true);
      setTimeout(() => {
        setCurrentUser(user);
        DB.addAuditLog(user.id, 'Login 2FA Successful', { email: user.email });
        router.push('/dashboard');
      }, 1200);
    }
  };

  const handleResend = () => {
    setError('');
    const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    if (type === 'signup') {
      localStorage.setItem(`affy_otp_${email}`, JSON.stringify({ otp: newOtpCode, expires: Date.now() + 10 * 60000 }));
      logSimulation(
        'WhatsApp',
        'Resent OTP Verification Code',
        '+1 (555) 123-4567',
        `Your new AFFY SAVINGS verification code is ${newOtpCode}. Expires in 10 minutes.`
      );
      setError('A new verification code has been dispatched. Check the simulation terminal.');
    } else {
      localStorage.setItem(`affy_2fa_${email}`, JSON.stringify({ otp: newOtpCode, expires: Date.now() + 5 * 60000 }));
      logSimulation(
        'Email',
        'Resent 2FA OTP',
        email,
        `Your new AFFY SAVINGS 2FA verification code is ${newOtpCode}. Expires in 5 minutes.`
      );
      setError('A new 2FA code has been dispatched. Check the simulation terminal.');
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
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary font-bold transition-colors duration-200 cursor-pointer"
              >
                <RefreshCw size={12} />
                Resend Code
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
