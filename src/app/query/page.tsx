'use client';

import { useState, useMemo } from 'react';
import { BackButton } from '@/components/back-button';
import { useRates } from '@/hooks/use-rates';

const FIAT_CURRENCIES = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'NZD', 'KRW', 'THB'];
const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA'];

export default function QueryPage() {
  const { rates } = useRates();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('CNY');
  const [amount, setAmount] = useState('1000');

  // Build lookup: pair -> rate
  const rateMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rates) {
      map[r.pair] = r.rate;
    }
    return map;
  }, [rates]);

  // Get rate from any currency to CNY
  const getToCNY = (currency: string): number | null => {
    if (currency === 'CNY') return 1;
    const direct = rateMap[`${currency}/CNY`];
    if (direct) return direct;
    return null;
  };

  // Calculate conversion
  const conversion = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fromRate = getToCNY(fromCurrency);
    const toRate = getToCNY(toCurrency);

    if (!fromRate || !toRate || numAmount === 0) {
      return { result: null, rate: null };
    }

    const crossRate = fromRate / toRate;
    const result = numAmount * crossRate;

    return { result, rate: crossRate };
  }, [amount, fromCurrency, toCurrency, rateMap]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <BackButton label="汇率快速查询" />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 space-y-6">
            {/* Amount input */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">金额</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3.5 text-xl font-mono text-foreground outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                placeholder="输入金额"
              />
            </div>

            {/* From currency */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">从</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3.5 text-foreground outline-none transition-colors focus:border-cyan-500/50"
              >
                <optgroup label="法币">
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="虚拟货币">
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <button
                onClick={swapCurrencies}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>

            {/* To currency */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">到</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3.5 text-foreground outline-none transition-colors focus:border-cyan-500/50"
              >
                <optgroup label="法币">
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="虚拟货币">
                  {CRYPTO_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Result */}
            <div className="rounded-lg border border-border bg-secondary/20 p-5">
              {conversion.result !== null ? (
                <>
                  <div className="text-center">
                    <span className="text-3xl font-bold font-mono text-foreground">
                      {conversion.result.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: conversion.result > 1000 ? 2 : 6,
                      })}
                    </span>
                    <span className="ml-2 text-base text-muted-foreground">{toCurrency}</span>
                  </div>
                  <div className="mt-3 text-center text-xs text-muted-foreground">
                    1 {fromCurrency} = {conversion.rate!.toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: conversion.rate! < 1 ? 8 : 4,
                    })} {toCurrency}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  暂无该币对汇率数据
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
