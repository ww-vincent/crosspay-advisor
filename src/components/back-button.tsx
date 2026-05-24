'use client';

import Link from 'next/link';

interface BackButtonProps {
  label: string;
}

export function BackButton({ label }: BackButtonProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3">
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <div className="h-4 w-px bg-border" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
