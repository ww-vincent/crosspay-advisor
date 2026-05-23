'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RateItem {
  pair: string;
  rate: number;
  change: number;
  type: 'fiat' | 'crypto';
}

interface RatesResponse {
  rates: RateItem[];
  timestamp: number;
  fallback?: boolean;
}

export function useRates(pollInterval = 60_000) {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/rates');
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data: RatesResponse = await res.json();
      setRates(data.rates);
      setIsFallback(!!data.fallback);
    } catch {
      // Keep previous rates on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const timer = setInterval(fetchRates, pollInterval);
    return () => clearInterval(timer);
  }, [fetchRates, pollInterval]);

  return { rates, loading, isFallback };
}
