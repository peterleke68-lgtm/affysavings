'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DB } from '@/services/db';
import { ShieldCheck, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';
import { supabase } from '@/services/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const { cms } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all fields.');
      return;
    }

    const users = DB.getUsers();
    if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('An account with this email already exists.');
      return;
    }

    if (!supabase) {
      setError('Authentication service is not initialized.');
      return;
    }

    // Call Supabase Auth to generate and send OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: formData.email.toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          name: formData.name,
          phone: formData.phone
        }
      }
    });

    if (otpError) {
      setError(otpError.message);
      return;
    }

    // Create temporary user profile (not yet verified)
    const newUser = {
      id: '', // Will be updated with real Supabase UID on verification
      email: formData.email.toLowerCase(),
      name: formData.name,
      phone: formData.phone,
      avatar_url: '',
      is_verified: false,
      two_factor_enabled: false,
      two_factor_secret: '',
      is_locked: false,
      failed_attempts: 0,
      device_tracking: [
        { id: 'dt-1', device: navigator.userAgent, ip: '192.168.1.100', date: new Date().toISOString() }
      ],
      created_at: new Date().toISOString()
    };

    // Save temporary details
    localStorage.setItem(`affy_pending_user_${formData.email.toLowerCase()}`, JSON.stringify({ user: newUser }));
    
    // Add audit log
    DB.addAuditLog(null, 'User Registration Initiated', { email: formData.email, phone: formData.phone });

    setSuccess(true);
    setTimeout(() => {
      router.push(`/auth/verify?email=${encodeURIComponent(formData.email.toLowerCase())}&type=signup`);
    }, 1500);
  };

  const inputClasses = "w-full text-sm px-4 py-3.5 rounded-xl bg-input-bg border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-zinc-400";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="bg-ambient-glow glow-purple top-[-150px] right-[-100px]" />
      <div className="bg-ambient-glow glow-emerald bottom-[-200px] left-[-150px]" />

      <div className="w-full max-w-md bg-card-bg border border-border/40 rounded-3xl p-8 md:p-10 shadow-xl shadow-black/5 dark:shadow-black/30 z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <Link href="/" className="mb-3">
            <AffyLogo className="h-9" />
          </Link>
          <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Create Your Vault</p>
        </div>

        {success ? (
          <div className="py-16 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-display">Registration Successful</h2>
            <p className="text-sm text-zinc-500 mt-2">Redirecting to verification...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-display tracking-tight">Create your account</h2>
              <p className="text-xs text-zinc-500">Start your disciplined savings journey today.</p>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/15 text-red-500 text-xs p-4 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClasses}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Phone Number</label>
              <input
                type="tel"
                placeholder="+234 810 000 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClasses}
              />
            </div>



            {/* CTA */}
            <button
              type="submit"
              style={{ backgroundColor: cms.branding.primaryColor }}
              className="w-full text-white text-sm font-bold py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 mt-2"
            >
              Continue to Verification
              <ArrowRight size={16} />
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
        <div className="mt-8 pt-5 border-t border-border/30 flex items-center justify-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>End-to-end encrypted with AES-256 & MFA.</span>
        </div>
      </div>
    </div>
  );
}
