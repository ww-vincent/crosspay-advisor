import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rates & Alerts | Chain",
  description:
    "Real-time exchange rate monitoring, AI-powered predictions, and target rate alert notifications",
};

export default function AlertPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col bg-[#020202]">
        <header className="h-11 border-b border-zinc-900 flex items-center px-5 gap-4 flex-shrink-0 bg-[#030303]">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono tracking-wider"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </Link>
          <span className="text-xs text-zinc-400 font-sans font-medium">
            Rates & Alerts
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">
              Live Feed
            </span>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">
          <DashboardLayout />
        </div>
      </div>
    </AuthGuard>
  );
}
