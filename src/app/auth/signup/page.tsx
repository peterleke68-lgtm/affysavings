'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, ArrowRight, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';

export default function SignupPage() {
  const router = useRouter();
  const { cms } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.pin) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and password confirmation do not match.');
      return;
    }

    if (!/^\d{4}$/.test(formData.pin.trim())) {
      setError('Transaction PIN must be exactly 4 numeric digits.');
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      setError('Transaction PIN and confirmation do not match.');
      return;
    }

    const normalizedEmail = formData.email.toLowerCase().trim();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: normalizedEmail,
          phone: formData.phone.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          pin: formData.pin.trim(),
          confirmPin: formData.confirmPin.trim(),
          type: 'signup',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code. Please check your inputs.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/auth/verify?email=${encodeURIComponent(normalizedEmail)}&type=signup`);
      }, 1000);
    } catch (err) {
      console.error('[Signup] Error:', err);
      setError('Unable to reach the server. Please check your internet connection.');
      setLoading(false);
    }
  };

  const inputClasses = "w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400";
  const labelClasses = "block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-150px] right-[-100px]" />
      <div className="bg-ambient-glow glow-emerald bottom-[-200px] left-[-150px]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Link href="/" className="mb-2">
            <AffyLogo className="h-8" />
          </Link>
          <p className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase">Create Your Strict Savings Vault</p>
        </div>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold font-display">Registration Initiated</h2>
            <p className="text-xs text-zinc-500 mt-1">Verification code sent. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold font-display tracking-tight">Create your account</h2>
              <p className="text-[11px] text-zinc-500">Secure your wealth with strict vault discipline.</p>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className={labelClasses}>Full Name</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                required
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Email Address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+234 810 000 0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="space-y-3 pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Lock size={12} className="text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Account Password</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className={labelClasses}>Password (min 8)</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`${inputClasses} pr-9`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-zinc-400 hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="relative">
                  <label className={labelClasses}>Confirm Password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`${inputClasses} pr-9`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-zinc-400 hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 4-Digit Transaction PIN */}
            <div className="space-y-3 pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <KeyRound size={12} className="text-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest">4-Digit Transaction PIN</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    className={`${inputClasses} text-center font-mono tracking-widest text-base`}
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>Confirm PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={formData.confirmPin}
                    onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g, '') })}
                    className={`${inputClasses} text-center font-mono tracking-widest text-base`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: cms.branding?.primaryColor || '#a855f7' }}
              className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2 disabled:opacity-50"
            >
              {loading ? 'Creating Vault...' : 'Continue to Email Verification'}
              <ArrowRight size={14} />
            </button>

            <div className="text-center text-xs text-zinc-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-bold hover:underline">
                Login
              </Link>
            </div>
          </form>
        )}

        {/* Security Trust Indicators */}
        <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>Encrypted with Scrypt &amp; Argon-grade Security.</span>
        </div>
      </div>
    </div>
  );
}
