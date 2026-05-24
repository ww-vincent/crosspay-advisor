"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Cpu,
  Route,
  BellRing,
  Terminal,
  MessageSquare,
  TrendingUp,
  Search,
} from "lucide-react";
import GlobeBG from "@/components/GlobeBG";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  const handleConsult = () => {
    if (user) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020202] text-zinc-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-white">
      {/* Globe background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <GlobeBG />
      </div>

      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-[1] opacity-75" />

      {/* Floating nav pill */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, delay: 0.2 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl bg-zinc-950/80 backdrop-blur-lg border border-zinc-900 rounded-full px-4 py-2.5 flex items-center justify-between z-50 shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
      >
        <Link href="/" className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block animate-pulse" />
          <span className="font-mono text-xs text-white font-extrabold tracking-widest uppercase">
            CHAIN
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs">
          <Link
            href="/chat"
            className="px-3 py-1.5 rounded-full transition-all duration-200 font-sans font-medium uppercase tracking-tight text-zinc-400 hover:text-white hover:bg-zinc-900/40"
          >
            AI Consultation
          </Link>
          <Link
            href="/alert"
            className="px-3 py-1.5 rounded-full transition-all duration-200 font-sans font-medium uppercase tracking-tight text-zinc-400 hover:text-white hover:bg-zinc-900/40"
          >
            Rates Runway
          </Link>
          <Link
            href="/query"
            className="px-3 py-1.5 rounded-full transition-all duration-200 font-sans font-medium uppercase tracking-tight text-zinc-400 hover:text-white hover:bg-zinc-900/40"
          >
            Rate Lookup
          </Link>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero section */}
        <div className="relative w-full min-h-[92vh] flex flex-col justify-between pt-16 pb-8">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{" "}
              Node Alpha Active // Beijing
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              UTC {new Date().toUTCString().slice(17, 25)} / Secure client
              protocol
            </span>
          </div>

          {/* Hero text */}
          <div className="my-auto max-w-4xl space-y-6 mt-16 md:mt-24">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 font-mono text-[10px] rounded-full tracking-wider uppercase mb-2">
                FX Hedge Technology Suite
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-sans tracking-tighter text-white uppercase font-extrabold leading-[0.9] select-none">
                Chain |{" "}
                <span className="text-zinc-600 block sm:inline">
                  The World
                </span>
              </h1>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-sans font-light text-zinc-400 tracking-tight leading-snug max-w-2xl mt-4">
                Cross-Border Payments,{" "}
                <span className="text-emerald-400 font-normal">Clarified.</span>
              </h2>
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
              className="text-sm md:text-base text-zinc-500 font-light max-w-xl leading-relaxed font-sans"
            >
              Unlock your currency advantages with Chain&apos;s real-time risk
              modeling and algorithmic exchange counsel. We clarify interbank
              markup layers to secure raw mid-tier liquidity rates
              internationally.
            </motion.p>

            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center gap-4 pt-4"
            >
              <button
                onClick={handleConsult}
                className="group py-3 px-6 bg-white hover:bg-zinc-200 text-black text-xs md:text-sm font-sans font-semibold rounded-full flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-[0_8px_30px_rgba(255,255,255,0.1)]"
              >
                <span>Consult Advisor</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <span className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider hidden sm:block">
                AI-powered FX intelligence
              </span>
            </motion.div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-zinc-900 mt-12">
            <div className="space-y-1.5 p-1">
              <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest block font-bold">
                Annualized Vol
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-mono text-zinc-100 font-medium">
                  $136B+
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                  +24% YoY
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans leading-normal font-light">
                Processed across high-frequency interbank foreign corridors.
              </p>
            </div>

            <div className="space-y-1.5 p-1">
              <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest block font-bold">
                Quotation Latency
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-mono text-zinc-100 font-medium">
                  12ms
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Ultra-Low delay
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans leading-normal font-light">
                Real-time trade order book synchronization for 38 global fiat
                corridors.
              </p>
            </div>

            <div className="space-y-1.5 p-1">
              <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest block font-bold">
                Hedge Accuracy
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-mono text-zinc-100 font-medium">
                  98.4%
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                  ARIMA+GARCH
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans leading-normal font-light">
                Algorithmic predictive confidence intervals for core G10
                currency sets.
              </p>
            </div>
          </div>
        </div>

        {/* Features section */}
        <div className="py-12 sm:py-20 border-t border-zinc-900">
          <div className="max-w-4xl space-y-4">
            <span className="font-mono text-emerald-400 text-xs tracking-widest uppercase font-semibold block">
              Core Protocol Framework
            </span>
            <h2 className="text-3xl sm:text-5xl font-sans font-bold tracking-tight text-white uppercase">
              Cross-Border Payments,{" "}
              <span className="text-zinc-500 font-light">Simplified</span>
            </h2>
            <p className="text-zinc-400 font-sans text-sm sm:text-base font-light leading-relaxed max-w-2xl">
              AI-Powered Cross-Border Payment Advisor — Real-Time Tracking,
              Precision Forecasting, Intelligent Decisions
            </p>
          </div>

          {/* 3 capability cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", damping: 20 }}
              className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-200 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-base font-sans font-medium text-white tracking-tight">
                  AI Quantitative Prediction Engine
                </h4>
                <p className="text-xs text-zinc-400 font-light leading-relaxed font-sans">
                  A three-model fusion system combining STL seasonal
                  decomposition, MA crossover signals, and ARIMA+GARCH
                  volatility modeling. Generates daily 1-day, 3-day, and 7-day
                  price targets with confidence intervals.
                </p>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                Active Neural Nodes
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", damping: 20 }}
              className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-200 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <Route className="w-5 h-5" />
                </div>
                <h4 className="text-base font-sans font-medium text-white tracking-tight">
                  Omni-Channel Intelligent Routing
                </h4>
                <p className="text-xs text-zinc-400 font-light leading-relaxed font-sans">
                  Covering 12 fiat currencies and 7 cryptocurrencies, with
                  side-by-side comparison of traditional banking and on-chain
                  channels. The AI conversational advisor automatically
                  recommends the optimal remittance path.
                </p>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                38 active corridors
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", damping: 20 }}
              className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-200 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <BellRing className="w-5 h-5" />
                </div>
                <h4 className="text-base font-sans font-medium text-white tracking-tight">
                  Real-Time Alerts & Monitoring
                </h4>
                <p className="text-xs text-zinc-400 font-light leading-relaxed font-sans">
                  Set custom target rate alerts with live market monitoring.
                  Integrated with key economic events (FOMC, ECB, PBOC policy
                  meetings) and system-level risk warnings.
                </p>
              </div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                E2E Stream Broadcast
              </span>
            </motion.div>
          </div>

          {/* Tech highlights bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          >
            <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5 shrink-0">
              <Terminal className="w-4 h-4" /> Technical Highlights
            </span>
            <div className="font-mono text-[10px] sm:text-[11px] text-zinc-400 text-center sm:text-right leading-relaxed flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1">
              <span>Daily automated Python quantitative pipeline</span>
              <span className="text-zinc-700 font-bold">•</span>
              <span>Recharts professional financial charts</span>
              <span className="text-zinc-700 font-bold">•</span>
              <span>Coze AI Agent streaming dialogue</span>
              <span className="text-zinc-700 font-bold">•</span>
              <span>Dual-source real-time rates via Frankfurter + Binance</span>
            </div>
          </motion.div>
        </div>

        {/* Module link cards */}
        <div className="py-12 sm:py-20 border-t border-zinc-900">
          <div className="max-w-4xl space-y-4 mb-12">
            <span className="font-mono text-emerald-400 text-xs tracking-widest uppercase font-semibold block">
              Explore Modules
            </span>
            <h2 className="text-3xl sm:text-5xl font-sans font-bold tracking-tight text-white uppercase">
              Select Your{" "}
              <span className="text-zinc-500 font-light">Workflow</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/chat">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", damping: 20 }}
                className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-emerald-800/60 transition-all duration-200 flex flex-col justify-between space-y-4 h-full cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-sans font-medium text-white tracking-tight">
                    AI Advisor
                  </h4>
                  <p className="text-xs text-zinc-400 font-light mt-1">
                    Conversational FX intelligence with streaming responses and
                    smart routing suggestions.
                  </p>
                </div>
                <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                  Launch <ArrowRight className="w-3 h-3" />
                </span>
              </motion.div>
            </Link>

            <Link href="/alert">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", damping: 20 }}
                className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-emerald-800/60 transition-all duration-200 flex flex-col justify-between space-y-4 h-full cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-sans font-medium text-white tracking-tight">
                    Rates & Alerts
                  </h4>
                  <p className="text-xs text-zinc-400 font-light mt-1">
                    Live exchange rates, interactive charts, AI predictions, and
                    target rate notifications.
                  </p>
                </div>
                <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                  Launch <ArrowRight className="w-3 h-3" />
                </span>
              </motion.div>
            </Link>

            <Link href="/query">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", damping: 20 }}
                className="p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900/80 hover:border-emerald-800/60 transition-all duration-200 flex flex-col justify-between space-y-4 h-full cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/20 flex items-center justify-center text-emerald-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-sans font-medium text-white tracking-tight">
                    Rate Lookup
                  </h4>
                  <p className="text-xs text-zinc-400 font-light mt-1">
                    Quick currency pair search with real-time rates across 12
                    fiat and 7 crypto currencies.
                  </p>
                </div>
                <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                  Launch <ArrowRight className="w-3 h-3" />
                </span>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full bg-[#040404] border-t border-zinc-950 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
            <span>
              &copy; 2026 Chain Financial Technologies Inc. All rights
              reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">
              Protocol Standard (V5)
            </span>
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">
              E2E Shielding policy
            </span>
            <span className="hover:text-emerald-400 transition-colors cursor-pointer">
              Endpoint: Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
