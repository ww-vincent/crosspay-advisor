"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { RateItem } from "@/hooks/use-rates";

const FIAT_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "$" },
  { code: "EUR", name: "Euro", flag: "€" },
  { code: "GBP", name: "British Pound", flag: "£" },
  { code: "JPY", name: "Japanese Yen", flag: "¥" },
  { code: "AUD", name: "Australian Dollar", flag: "A$" },
  { code: "CAD", name: "Canadian Dollar", flag: "C$" },
  { code: "CHF", name: "Swiss Franc", flag: "Fr" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "HK$" },
  { code: "SGD", name: "Singapore Dollar", flag: "S$" },
  { code: "NZD", name: "New Zealand Dollar", flag: "NZ$" },
  { code: "KRW", name: "South Korean Won", flag: "₩" },
  { code: "THB", name: "Thai Baht", flag: "฿" },
  { code: "CNY", name: "Chinese Yuan", flag: "¥" },
];

const CRYPTO_CURRENCIES = [
  { code: "BTC", name: "Bitcoin", flag: "₿" },
  { code: "ETH", name: "Ethereum", flag: "Ξ" },
  { code: "USDT", name: "Tether", flag: "₮" },
  { code: "BNB", name: "BNB", flag: "B" },
  { code: "SOL", name: "Solana", flag: "S" },
  { code: "XRP", name: "XRP", flag: "X" },
  { code: "DOGE", name: "Dogecoin", flag: "Ð" },
  { code: "ADA", name: "Cardano", flag: "A" },
];

const ALL_CURRENCIES = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

const CHART_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "SGD",
  "KRW",
  "THB",
  "CNY",
];

export default function QueryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("CNY");
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/rates")
      .then((res) => res.json())
      .then((data) => setRates(data.rates || []))
      .catch(() => {});
  }, []);

  const getRate = useCallback(
    (from: string, to: string): number | null => {
      if (from === to) return 1;
      const direct = rates.find((r) => r.pair === `${from}/${to}`);
      if (direct) return direct.rate;
      const reverse = rates.find((r) => r.pair === `${to}/${from}`);
      if (reverse && reverse.rate !== 0) return 1 / reverse.rate;
      const fromToCny = rates.find((r) => r.pair === `${from}/CNY`);
      const toToCny = rates.find((r) => r.pair === `${to}/CNY`);
      if (fromToCny && toToCny && toToCny.rate !== 0) {
        return fromToCny.rate / toToCny.rate;
      }
      return null;
    },
    [rates]
  );

  const rate = useMemo(
    () => getRate(fromCurrency, toCurrency),
    [fromCurrency, toCurrency, getRate]
  );
  const numericAmount = parseFloat(amount) || 0;
  const converted = rate !== null ? numericAmount * rate : null;

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const chartData = useMemo(() => {
    return CHART_CURRENCIES.filter((c) => c !== fromCurrency).map((code) => {
      const r = getRate(fromCurrency, code);
      return { code, rate: r };
    });
  }, [fromCurrency, getRate]);

  const chartBars = useMemo(() => {
    const validData = chartData.filter(
      (d) => d.rate !== null
    ) as { code: string; rate: number }[];
    if (validData.length === 0) return [];

    const logValues = validData.map((d) => ({
      ...d,
      logRate: d.rate > 0 ? Math.log10(d.rate) : 0,
    }));

    const minLog = Math.min(...logValues.map((d) => d.logRate));
    const maxLog = Math.max(...logValues.map((d) => d.logRate));
    const range = maxLog - minLog || 1;

    return logValues.map((d) => ({
      ...d,
      height: Math.max(8, ((d.logRate - minLog) / range) * 72 + 8),
    }));
  }, [chartData]);

  const formatRate = (value: number): string => {
    if (value >= 1000) return value.toFixed(0);
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.01) return value.toFixed(5);
    return value.toFixed(6);
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020202]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }
  if (!mounted) return null;

  return (
    <div className="flex h-screen flex-col bg-[#020202]">
      <header className="h-11 border-b border-zinc-900 flex items-center px-5 gap-4 flex-shrink-0 bg-[#030303]">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono tracking-wider"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
        <span className="text-xs text-zinc-400 font-sans font-medium">
          Rate Lookup
        </span>
      </header>

      <div className="flex flex-1 min-h-0 px-5 py-4 gap-6">
        {/* Left: Converter */}
        <div className="flex flex-col items-center justify-center w-[420px] shrink-0">
          <div className="w-full rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
            <h2 className="mb-5 text-lg font-semibold text-zinc-100">
              Currency Converter
            </h2>

            {/* Amount input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-zinc-500">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-mono">
                  {ALL_CURRENCIES.find((c) => c.code === fromCurrency)?.flag}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-zinc-800 bg-[#020202] text-lg font-mono py-2.5 pl-8 pr-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* From currency */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs text-zinc-500">From</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#020202] px-4 py-2.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <optgroup label="Fiat Currencies">
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cryptocurrencies">
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Swap button */}
            <div className="flex justify-center py-1">
              <button
                onClick={handleSwap}
                className="h-9 w-9 rounded-full border border-zinc-800 flex items-center justify-center hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>

            {/* To currency */}
            <div className="mb-5">
              <label className="mb-1.5 block text-xs text-zinc-500">To</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-[#020202] px-4 py-2.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <optgroup label="Fiat Currencies">
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cryptocurrencies">
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Result */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4">
              {rate !== null && converted !== null ? (
                <>
                  <div className="text-center text-2xl font-bold font-mono text-zinc-100">
                    {converted.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                    <span className="ml-2 text-base text-zinc-500">
                      {toCurrency}
                    </span>
                  </div>
                  <div className="mt-2 text-center text-xs text-zinc-500">
                    1 {fromCurrency} = {formatRate(rate)} {toCurrency}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-zinc-500">
                  Rate data unavailable for this pair
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Bar Chart */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">
              Exchange Rates
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Base: 1 {fromCurrency}
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex items-end gap-3 min-h-0 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div
                    key={pct}
                    className="border-t border-zinc-800/20 w-full"
                  />
                ))}
              </div>

              {chartBars.map((bar) => {
                const isToCurrency = bar.code === toCurrency;
                const isHovered = hoveredBar === bar.code;
                const isActive = isToCurrency || isHovered;

                return (
                  <div
                    key={bar.code}
                    className="flex-1 flex flex-col items-center justify-end min-w-0 cursor-pointer relative"
                    style={{ height: "100%" }}
                    onMouseEnter={() => setHoveredBar(bar.code)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => setToCurrency(bar.code)}
                  >
                    {isActive && bar.rate !== null && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-10 px-2.5 py-1 rounded-lg bg-[#09090b] border border-zinc-800 text-xs font-mono whitespace-nowrap shadow-lg">
                        <span className="text-zinc-100 font-semibold">
                          {formatRate(bar.rate)}
                        </span>
                        <span className="text-zinc-500 ml-1">{bar.code}</span>
                      </div>
                    )}

                    <div
                      className="w-full max-w-[48px] mx-auto rounded-t-md transition-all duration-200"
                      style={{
                        height: `${bar.height}%`,
                        background: isToCurrency
                          ? "linear-gradient(to top, #10B981, #06B6D4)"
                          : isHovered
                          ? "linear-gradient(to top, rgba(16,185,129,0.6), rgba(6,182,212,0.6))"
                          : "rgba(148, 163, 184, 0.15)",
                        boxShadow: isToCurrency
                          ? "0 0 12px rgba(16, 185, 129, 0.3)"
                          : isHovered
                          ? "0 0 8px rgba(16, 185, 129, 0.15)"
                          : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 shrink-0 pt-3">
              {chartBars.map((bar) => {
                const isToCurrency = bar.code === toCurrency;
                const isHovered = hoveredBar === bar.code;

                return (
                  <div
                    key={bar.code}
                    className="flex-1 text-center min-w-0"
                    onMouseEnter={() => setHoveredBar(bar.code)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => setToCurrency(bar.code)}
                  >
                    <span
                      className={`text-[11px] font-mono transition-colors duration-200 ${
                        isToCurrency
                          ? "text-emerald-400 font-semibold"
                          : isHovered
                          ? "text-zinc-200"
                          : "text-zinc-500"
                      }`}
                    >
                      {bar.code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 mt-2 border-t border-zinc-800/30 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-500 to-cyan-500" />
              <span className="text-[11px] text-zinc-500">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-500/20" />
              <span className="text-[11px] text-zinc-500">Others</span>
            </div>
            <span className="text-[11px] text-zinc-600 ml-auto">
              Log scale · Click bar to select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
