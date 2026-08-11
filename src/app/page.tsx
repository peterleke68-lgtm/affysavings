'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/Providers';
import AffyLogo from '@/components/AffyLogo';
import { 
  Shield, 
  Wallet, 
  Lock, 
  Calendar, 
  Target, 
  ArrowRight, 
  ChevronDown,
  ChevronUp, 
  Sun, 
  Moon, 
  Globe, 
  Layers, 
  CheckCircle2, 
  Activity,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const { cms, theme, toggleTheme } = useApp();
  const [metricCount, setMetricCount] = useState(5230);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Counter ticking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setMetricCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Lock': return <Lock className="text-primary w-5 h-5" />;
      case 'Calendar': return <Calendar className="text-primary w-5 h-5" />;
      case 'Target': return <Target className="text-primary w-5 h-5" />;
      case 'Shield': return <Shield className="text-primary w-5 h-5" />;
      default: return <Layers className="text-primary w-5 h-5" />;
    }
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative Blur Ambient Elements */}
      <div className="bg-ambient-glow glow-purple top-[-100px] left-[-100px] opacity-10" />
      <div className="bg-ambient-glow glow-emerald top-[300px] right-[-200px] opacity-10" />
      <div className="bg-ambient-glow glow-purple bottom-[-200px] left-[20%] opacity-10" />

      {/* HEADER SECTION */}
      <header className="border-b border-border/40 sticky top-0 z-40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <AffyLogo />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <a href="#features" className="hover:text-primary transition-colors">Savings Products</a>
            <a href="#preview" className="hover:text-primary transition-colors">Visual Goals</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            <Link href="/staff" className="hover:text-primary transition-colors flex items-center gap-1.5 normal-case font-mono">
              <Globe size={14} /> Staff Portal
            </Link>
          </nav>
 
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border bg-card-bg hover:bg-neutral-gray transition-colors text-zinc-400 hover:text-foreground cursor-pointer flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link href="/auth/login" className="text-sm font-bold text-zinc-500 hover:text-primary transition-colors px-3 py-2">
              Login
            </Link>

            <Link 
              href="/auth/signup"
              style={{ backgroundColor: cms.branding.primaryColor }}
              className="text-xs sm:text-sm font-bold text-white px-5 py-2.5 rounded-xl hover:opacity-95 transition-opacity shadow-lg shadow-primary/20 cursor-pointer"
            >
              Start Saving
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left">

            <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-extrabold tracking-tight leading-none text-gradient">
              {cms.hero.title}
            </h1>

            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {cms.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link 
                href="/auth/signup"
                style={{ backgroundColor: cms.branding.primaryColor }}
                className="w-full sm:w-auto text-white px-8 py-4 rounded-xl font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-primary/25 cursor-pointer"
              >
                {cms.hero.primaryCta}
                <ArrowRight size={16} />
              </Link>
              <Link 
                href="/auth/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold border border-border bg-card-bg hover:bg-neutral-gray hover:text-primary transition-all text-center cursor-pointer"
              >
                {cms.hero.secondaryCta}
              </Link>
            </div>

            <div className="pt-8 border-t border-border/40 grid grid-cols-3 gap-6 text-center lg:text-left max-w-sm mx-auto lg:mx-0">
              <div className="space-y-1">
                <div className="text-2xl font-black text-primary font-display">5.0%</div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Break Penalty</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-primary font-display">90 Days</div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Min Locked</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-primary font-display">100%</div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Visual Goals</div>
              </div>
            </div>
          </div>

          {/* Redesigned Premium Dashboard Preview */}
          <div className="lg:col-span-7 flex justify-center relative w-full">
            <div className="absolute w-80 h-80 bg-primary/10 rounded-full blur-3xl -top-6 -right-6 z-0" />
            
            <div className="w-full max-w-[560px] bg-card-bg border border-border/50 rounded-3xl shadow-2xl p-6 overflow-hidden hover-lift z-10">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                  <Activity size={10} className="animate-pulse" />
                  <span>ACTIVE</span>
                </div>
              </div>

              {/* Balances Card Redesign */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-gradient-to-br from-primary to-[#7B2CBF] text-white p-5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[135px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
                  <div>
                    <div className="text-[10px] opacity-80 uppercase font-bold tracking-widest flex items-center gap-1"><Wallet size={10} /> Liquid Wallet</div>
                    <div className="text-2xl font-black mt-3">
                      ₦14,520,500.00
                    </div>
                  </div>
                  <div className="text-[9px] opacity-80 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 size={12} className="text-emerald-300" /> Wema Virtual Linked
                  </div>
                </div>

                <div className="bg-neutral-gray border border-border/40 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-widest flex items-center gap-1"><TrendingUp size={10} /> Escrow Savings</div>
                    <div className="text-2xl font-black mt-3 text-foreground">
                      ₦{((5000 + metricCount) * 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-[8px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">
                    🔒 Strict Lock Locked
                  </div>
                </div>
              </div>

              {/* Progress Milestones list */}
              <div className="mt-6 border border-border/40 rounded-2xl p-5 bg-background/50 space-y-5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Active Portfolios Milestones</span>
                
                {/* Milestone 1: Locked */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5"><Lock size={12} className="text-red-400" /> Capital Guard (Locked)</span>
                    <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-semibold">90 Days Limit</span>
                  </div>
                  <div className="w-full bg-neutral-gray h-2 rounded-full overflow-hidden">
                    <div className="bg-red-400 h-full w-[100%]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Saved: ₦3,500,000.00</span>
                    <span className="text-red-400">Locked Vault (Matures in 88d)</span>
                  </div>
                </div>

                {/* Milestone 2: Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-amber-500" /> Emergency Backup (Fixed)</span>
                    <span className="text-amber-500 text-[10px] font-semibold">60% Reached</span>
                  </div>
                  <div className="w-full bg-neutral-gray h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[60%]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Saved: ₦1,200,000.00</span>
                    <span>Target: ₦2,000,000.00</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* MOBILE DEVICE DISPLAY REDESIGN */}
      <section id="preview" className="py-20 bg-neutral-gray/30 border-y border-border/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Rigid Capital Discipline</h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">
              Our interface enforces absolute saving constraints, visually guiding you toward financial confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            
            <div className="space-y-10 text-center md:text-right">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:ml-auto md:mr-0"><Zap size={18} /></div>
                <h3 className="text-lg font-bold">Instant Receipts Alert</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto md:mr-0">
                  Receive immediate WhatsApp simulated alerts for credit deposits and early savings penalty statements.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:ml-auto md:mr-0"><Lock size={18} /></div>
                <h3 className="text-lg font-bold">90-Day Absolute Lock</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto md:mr-0">
                  Locked vaults cannot be broken under any circumstances before their target maturity date.
                </p>
              </div>
            </div>

            {/* Smartphone Center Mockup */}
            <div className="flex justify-center">
              <div className="w-[280px] h-[550px] rounded-[42px] border-[12px] border-zinc-800 dark:border-zinc-900 bg-card-bg shadow-2xl overflow-hidden relative flex flex-col hover-lift">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-zinc-800 dark:bg-zinc-900 rounded-b-2xl z-25 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-950" />
                  <div className="w-10 h-1.5 bg-zinc-900 ml-4 rounded" />
                </div>
                
                <div className="p-5 pt-12 flex-1 flex flex-col justify-between text-center relative bg-gradient-to-b from-primary/5 via-card-bg to-card-bg">
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <AffyLogo className="h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Locked Savings</div>
                      <div className="text-2xl font-mono font-black text-primary">₦3,500,000.00</div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-neutral-gray/50 p-4 rounded-2xl border border-border/40 text-left">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase flex justify-between">
                      <span>Maturity Lock:</span>
                      <span className="text-red-500 font-mono">88 Days Left</span>
                    </div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase flex justify-between border-t border-border/30 pt-2">
                      <span>Early Penalty:</span>
                      <span className="text-amber-500 font-mono">5.0% Break Fee</span>
                    </div>
                  </div>

                  <Link 
                    href="/auth/signup"
                    style={{ backgroundColor: cms.branding.primaryColor }}
                    className="w-full text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-primary/10 block cursor-pointer"
                  >
                    Lock Vault Now
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-10 text-center md:text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:mr-auto md:ml-0"><Award size={18} /></div>
                <h3 className="text-lg font-bold">5% Breakout Protection</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto md:ml-0">
                  Fixed target goals broken prematurely trigger a 5% penalty, protecting your savings from emotional spending.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto md:mr-auto md:ml-0"><Sparkles size={18} /></div>
                <h3 className="text-lg font-bold">Interactive Operator Console</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto md:ml-0">
                  Configure visual branding rules, lock percentage constraints, and WhatsApp endpoints in the Admin control center.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Structured Vault Portfolios</h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Choose the strict strategy that fits your wealth accelerator targets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {cms.features.map((feat: any) => (
            <div key={feat.id} className="bg-card-bg border border-border/40 p-6 rounded-2xl shadow-sm hover-lift flex flex-col justify-between min-h-[220px]">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {getIcon(feat.icon)}
                </div>
                <h3 className="text-lg font-bold text-foreground">{feat.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{feat.desc}</p>
              </div>
              <Link href="/auth/signup" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline pt-4 group">
                Open Vault <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 border-t border-border/40 max-w-3xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-zinc-500">Quick answers to our discipline guidelines.</p>
        </div>
        <div className="space-y-4">
          {cms.faqs.map((faq: any, index: number) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={index} className="border border-border/40 rounded-2xl bg-card-bg transition-colors overflow-hidden">
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex justify-between items-center font-bold text-sm text-foreground cursor-pointer focus:outline-none"
                >
                  <span className="pr-4">{faq.question}</span>
                  <div className="text-zinc-400 dark:text-zinc-500">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 border-t border-border/20 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 border-t border-zinc-900 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <AffyLogo className="h-6" />
            <div className="flex flex-wrap gap-8 text-xs font-bold uppercase tracking-wider text-zinc-500">
              {cms.footer.links.map((link: any, index: number) => (
                <Link key={index} href={link.href} className="hover:text-primary transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div>{cms.terms || cms.footer.copyright}</div>
            <div className="font-mono text-[10px]">{cms.footer.copyright}</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
