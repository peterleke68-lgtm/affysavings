'use client';

import React from 'react';

export default function AffyLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className} select-none`}>
      <div className="relative flex-shrink-0 transition-transform duration-300 hover:scale-105">
        <svg className="w-9 h-9" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="affyGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFA000" />
              <stop offset="35%" stopColor="#FF007F" />
              <stop offset="70%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
          </defs>
          {/* Main gradient folding A shape */}
          <path 
            d="M20 82 L44 22 C47 14 53 14 56 22 L80 82 C83 88 78 92 72 92 L62 92 C59 92 56 89 55 86 L49 68 L33 68 L27 86 C26 89 23 92 20 92 L18 92 C12 92 8 88 11 82 Z" 
            fill="url(#affyGrad)" 
          />
          {/* Inner triangle cut-out, adapts to local theme variables */}
          <polygon 
            points="50,28 41,56 59,56" 
            className="fill-background"
          />
        </svg>
      </div>
      <div className="flex flex-col justify-center text-left leading-none">
        <span className="text-foreground font-display font-extrabold text-xl tracking-tight">
          Affy <span className="text-primary font-black">Savings</span>
        </span>
        <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest mt-1 font-sans">
          Strict Vault
        </span>
      </div>
    </div>
  );
}
