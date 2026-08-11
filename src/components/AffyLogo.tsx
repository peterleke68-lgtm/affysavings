'use client';

import React from 'react';

export default function AffyLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className} select-none`}>
      <div className="relative flex-shrink-0 transition-transform duration-300 hover:scale-105">
        <svg className="w-9 h-9" viewBox="0 0 50 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="affyLogoGrad" x1="0.2" y1="1" x2="0.6" y2="0">
              <stop offset="0%" stopColor="#E91E8C" />
              <stop offset="28%" stopColor="#FF6B35" />
              <stop offset="48%" stopColor="#F7D631" />
              <stop offset="72%" stopColor="#2DD4A8" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <polyline
            points="44,30 26,5 16,58"
            stroke="url(#affyLogoGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <div className="flex flex-col justify-center text-left leading-none">
        <span className="text-foreground font-bold text-xl tracking-tight leading-none">
          Affy
        </span>
        <span className="text-primary font-semibold text-[15px] tracking-tight leading-none mt-0.5">
          savings
        </span>
      </div>
    </div>
  );
}

