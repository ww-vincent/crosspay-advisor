'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRates, type RateItem } from '@/hooks/use-rates';
import { MarketStatus } from '@/components/market-status';

function formatRate(rate: number): string {
  if (rate >= 1000) return rate.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(5);
}

function RateTickerItem({ item }: { item: RateItem }) {
  const isUp = item.change >= 0;
  const isCrypto = item.type === 'crypto';

  return (
    <div className="inline-flex items-center gap-1.5 px-3 text-[11px]">
      <span className="text-muted-foreground">{item.pair}</span>
      <span className="font-mono font-medium text-foreground">{formatRate(item.rate)}</span>
      <span className={`font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{item.change.toFixed(2)}%
      </span>
      <span className="text-border/50">│</span>
    </div>
  );
}

function RateTicker({ rates }: { rates: RateItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);

  // Speed: pixels per frame (~60fps)
  const SPEED = 0.45;

  const animate = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || pausedRef.current) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    offsetRef.current -= SPEED;
    // Half width = one full copy; reset seamlessly
    const halfWidth = el.scrollWidth / 2;
    if (Math.abs(offsetRef.current) >= halfWidth) {
      offsetRef.current += halfWidth;
    }
    el.style.transform = `translateX(${offsetRef.current}px)`;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const handleMouseEnter = () => { pausedRef.current = true; };
  const handleMouseLeave = () => { pausedRef.current = false; };

  const items = [...rates, ...rates];

  return (
    <div
      className="relative overflow-hidden py-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-card/80 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-card/80 to-transparent" />
      <div ref={scrollerRef} className="flex whitespace-nowrap will-change-transform">
        {items.map((item, idx) => (
          <RateTickerItem key={`${item.pair}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [entered, setEntered] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('crosspay-entered') === '1';
    }
    return false;
  });
  const [splashVisible, setSplashVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('crosspay-entered') !== '1';
    }
    return true;
  });
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const { rates, isFallback } = useRates();

  const handleEnter = useCallback(() => {
    setEntered(true);
    sessionStorage.setItem('crosspay-entered', '1');
    // Wait for fade-out animation before removing from DOM
    setTimeout(() => setSplashVisible(false), 800);
  }, []);

  useEffect(() => {
    if (entered) return;
    const onKey = () => {
      setEntered(true);
      sessionStorage.setItem('crosspay-entered', '1');
      setTimeout(() => setSplashVisible(false), 800);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entered]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Splash screen overlay with fade-out */}
      {splashVisible && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer transition-opacity duration-700 ${entered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          onClick={handleEnter}
          onMouseMove={handleMouseMove}
          role="button"
          tabIndex={0}
          aria-label="点击进入"
        >
          {/* Mouse spotlight */}
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16,185,129,0.28) 0%, rgba(6,182,212,0.14) 35%, transparent 65%)`,
              opacity: mousePos.x === -999 ? 0 : 1,
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Globe icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#splashGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl">
              跨境支付，从此清晰
            </h1>
            <p className="max-w-lg text-center text-base text-muted-foreground leading-relaxed">
              实时汇率追踪、智能换汇建议、目标汇率预警，为你的跨境资金保驾护航
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/60 animate-pulse">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
              点击任意位置开始
            </div>
          </div>
        </div>
      )}

      {/* Main content (always rendered, staggered slide-up behind splash) */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className={`slide-up-enter ${entered ? 'active' : ''} flex items-center justify-between border-b border-border px-6 py-3`} style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">CrossPay Advisor</h1>
              <p className="text-[11px] text-muted-foreground">跨境支付智能顾问平台</p>
            </div>
          </div>
          <MarketStatus isFallback={isFallback} />
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-24">
          {/* Hero text */}
          <div className={`slide-up-enter ${entered ? 'active' : ''} mb-14 text-center`} style={{ animationDelay: '120ms' }}>
            <h2 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl">
              跨境支付，从此清晰
            </h2>
            <p className="mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
              实时汇率追踪、智能换汇建议、目标汇率预警，为你的跨境资金保驾护航
            </p>
          </div>

          {/* Three module cards */}
          <div className={`slide-up-enter ${entered ? 'active' : ''} grid w-full max-w-4xl grid-cols-3 gap-5`} style={{ animationDelay: '280ms' }}>
            {/* Module 1: 智能换汇顾问 */}
            <Link href="/chat" className="group flex-1">
              <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 blur-2xl transition-all duration-300 group-hover:from-emerald-500/20 group-hover:to-cyan-500/20" />
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="relative">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                    智能换汇顾问
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    AI 对话式换汇建议，实时汇率分析，智能推荐最优换汇方案
                  </p>
                </div>
                <div className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-all duration-200 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 group-hover:text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Module 2: 汇率追踪预警 */}
            <Link href="/alert" className="group flex-1">
              <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-2xl transition-all duration-300 group-hover:from-amber-500/20 group-hover:to-orange-500/20" />
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                    </defs>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="relative">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                    汇率追踪预警
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    设置目标汇率，实时监控波动，到达目标自动通知提醒
                  </p>
                </div>
                <div className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-all duration-200 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 group-hover:text-amber-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Module 3: 汇率快速查询 */}
            <Link href="/query" className="group flex-1">
              <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-cyan-500/40 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-2xl transition-all duration-300 group-hover:from-cyan-500/20 group-hover:to-blue-500/20" />
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="relative">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                    汇率快速查询
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    即时查询任意币对汇率，支持法币与虚拟货币一键换算
                  </p>
                </div>
                <div className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-all duration-200 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </main>

        {/* Bottom scrolling rate ticker */}
        <div className={`slide-up-enter ${entered ? 'active' : ''} border-t border-border bg-card/60 backdrop-blur-sm`} style={{ animationDelay: '440ms' }}>
          {rates.length > 0 ? (
            <RateTicker rates={rates} />
          ) : (
            <div className="py-3 text-center text-xs text-muted-foreground">
              正在加载汇率数据...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
