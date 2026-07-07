'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DB, logSimulation } from '@/services/db';
import { ShieldCheck, ArrowLeft, Key, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function ResetPage() {
  const router = useRouter();
  const { cms } = useApp();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter otp + new password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      setError('No account matches this email.');
      return;
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem(`affy_reset_${email}`, JSON.stringify({ code: resetCode, expires: Date.now() + 10 * 60000 }));

    // Trigger simulation log
    logSimulation(
      'Email',
      'Password Reset Request',
      email,
      `Hi ${user.name},\n\nWe received a request to reset your password. Use the following code to authorize your password update: ${resetCode}.\n\nExpires in 10 minutes. If you did not request this, please contact security immediately.`
    );

    DB.addAuditLog(user.id, 'Password Reset Initiated', { email });
    setStep(2);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || !newPassword) {
      setError('Please fill in both fields.');
      return;
    }

    const savedCodeStr = localStorage.getItem(`affy_reset_${email}`);
    if (!savedCodeStr) {
      setError('Reset session expired. Try again.');
      return;
    }

    const savedCode = JSON.parse(savedCodeStr);
    if (Date.now() > savedCode.expires) {
      setError('Reset code has expired. Request another one.');
      return;
    }

    if (otp !== savedCode.code) {
      setError('Invalid reset code. Check code and try again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Save custom password key in mock user table
    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      localStorage.setItem(`affy_pwd_${email}`, newPassword);
      DB.addAuditLog(user.id, 'Password Reset Completed', { email });
      localStorage.removeItem(`affy_reset_${email}`);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    }
  };

  const inputClasses = "w-full text-sm px-4 py-3.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple bottom-[-150px] right-[-50px]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-8 md:p-10 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Header Link */}
        <Link 
          href="/auth/login"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary mb-8 font-bold transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Login
        </Link>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-4">
            <AffyLogo className="h-8" />
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight">Reset Password</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-[280px] leading-relaxed">
            {step === 1 
              ? "Enter your registered email to receive a reset code."
              : "Enter the reset code and set your new password."
            }
          </p>
        </div>

        {success ? (
          <div className="py-16 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-display">Password Updated</h2>
            <p className="text-sm text-zinc-500 mt-2">Redirecting to login...</p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleSendReset} className="space-y-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Mail size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Request Code</span>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-xl leading-relaxed text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              style={{ backgroundColor: cms.branding.primaryColor }}
              className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20"
            >
              Send Reset Code
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Key size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Set New Password</span>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-xl leading-relaxed text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">6-Digit Reset Code</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${inputClasses} font-mono tracking-widest text-center text-lg`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              style={{ backgroundColor: cms.branding.primaryColor }}
              className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20"
            >
              Update Password
              <ArrowRight size={16} />
            </button>
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
