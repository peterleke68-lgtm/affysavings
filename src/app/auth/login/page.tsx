'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail || !formData.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Handle staff vs customer redirection
      if (data.userType === 'staff') {
        setCurrentStaff(data.user);
        if (data.role === 'Super Admin') {
          router.push('/admin');
        } else {
          router.push('/staff');
        }
      } else {
        setCurrentUser(data.user);
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('Unable to reach the server. Please check your connection.');
      setLoading(false);
    }
  };

  const inputClasses = "w-full text-xs px-3.5 py-3 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400";
  const labelClasses = "block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-200px] left-[-100px]" />
      <div className="bg-ambient-glow glow-emerald bottom-[-200px] right-[-100px]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="mb-2">
            <AffyLogo className="h-8" />
          </Link>
          <p className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase">Secure Fintech Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold font-display tracking-tight">Welcome back</h2>
            <p className="text-[11px] text-zinc-500">Enter your email and password to access your vault.</p>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-3 rounded-xl leading-relaxed">
              {error}
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={labelClasses}>Password</label>
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

          {/* CTA */}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: cms.branding?.primaryColor || '#a855f7' }}
            className="w-full text-white text-xs font-bold py-3.5 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={14} />
          </button>

          <div className="text-center text-xs text-zinc-500 pt-2">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">
              Create Vault
            </Link>
          </div>
        </form>

        {/* Security Trust Indicators */}
        <div className="mt-8 pt-4 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>Protected with Scrypt &amp; Tamper-Proof Sessions.</span>
        </div>
      </div>
    </div>
  );
}
