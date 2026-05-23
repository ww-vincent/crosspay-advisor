'use client';

import Link from 'next/link';

interface BackButtonProps {
  label: string;
}

export function BackButton({ label }: BackButtonProps) {
  return (
    <header className="flex items-center gap-4 border-b border-border px-6 py-3">
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回
      </Link>
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-foreground">{label}</h1>
      </div>
    </header>
  );
}
