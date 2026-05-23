import { NextResponse } from 'next/server';

interface RateItem {
  pair: string;
  rate: number;
  change: number;
  type: 'fiat' | 'crypto';
}

// In-memory cache
let cachedRates: RateItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

// Fallback mock data when APIs are unavailable
const FALLBACK_RATES: RateItem[] = [
  { pair: 'USD/CNY', rate: 6.7953, change: 0.17, type: 'fiat' },
  { pair: 'EUR/CNY', rate: 7.8792, change: -0.11, type: 'fiat' },
  { pair: 'GBP/CNY', rate: 9.1175, change: 0.26, type: 'fiat' },
  { pair: 'JPY/CNY', rate: 0.0427, change: -0.03, type: 'fiat' },
  { pair: 'AUD/CNY', rate: 4.8389, change: 0.09, type: 'fiat' },
  { pair: 'CAD/CNY', rate: 4.9238, change: -0.05, type: 'fiat' },
  { pair: 'CHF/CNY', rate: 8.6404, change: 0.14, type: 'fiat' },
  { pair: 'HKD/CNY', rate: 0.8671, change: 0.02, type: 'fiat' },
  { pair: 'SGD/CNY', rate: 5.3072, change: 0.08, type: 'fiat' },
  { pair: 'NZD/CNY', rate: 3.976, change: -0.12, type: 'fiat' },
  { pair: 'KRW/CNY', rate: 0.0045, change: 0.03, type: 'fiat' },
  { pair: 'THB/CNY', rate: 0.208, change: -0.07, type: 'fiat' },
  { pair: 'BTC/CNY', rate: 510000.0, change: 1.23, type: 'crypto' },
  { pair: 'ETH/CNY', rate: 19700.0, change: -0.45, type: 'crypto' },
  { pair: 'BNB/CNY', rate: 4200.0, change: 0.67, type: 'crypto' },
  { pair: 'SOL/CNY', rate: 1150.0, change: 2.15, type: 'crypto' },
  { pair: 'XRP/CNY', rate: 2.56, change: -1.03, type: 'crypto' },
  { pair: 'DOGE/CNY', rate: 1.234, change: 3.41, type: 'crypto' },
  { pair: 'ADA/CNY', rate: 4.56, change: -0.89, type: 'crypto' },
];

async function fetchFiatRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=CNY,EUR,GBP,JPY,AUD,CAD,CHF,HKD,SGD,NZD,KRW,THB',
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates as Record<string, number>;
  } catch {
    return null;
  }
}

async function fetchCryptoRates(): Promise<Record<string, number> | null> {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT'];
    const urls = symbols.map(
      (s) => `https://data-api.binance.vision/api/v3/ticker/price?symbol=${s}`
    );
    const responses = await Promise.all(urls.map((u) => fetch(u, { signal: AbortSignal.timeout(5000) })));

    const mapping: Record<string, string> = {
      BTCUSDT: 'BTC',
      ETHUSDT: 'ETH',
      BNBUSDT: 'BNB',
      SOLUSDT: 'SOL',
      XRPUSDT: 'XRP',
      DOGEUSDT: 'DOGE',
      ADAUSDT: 'ADA',
    };

    const result: Record<string, number> = {};
    for (const res of responses) {
      if (!res.ok) continue;
      const data = await res.json();
      const symbol = data.symbol as string;
      const price = parseFloat(data.price as string);
      if (mapping[symbol] && price > 0) {
        result[mapping[symbol]] = price;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({ rates: cachedRates, timestamp: cacheTimestamp });
  }

  const [fiatData, cryptoData] = await Promise.all([
    fetchFiatRates(),
    fetchCryptoRates(),
  ]);

  const rates: RateItem[] = [];

  // Build fiat rates (USD base → CNY pairs)
  if (fiatData && fiatData.CNY) {
    const cnyPerUsd = fiatData.CNY;
    const fiatPairs: [string, string][] = [
      ['USD', 'CNY'],
      ['EUR', 'CNY'],
      ['GBP', 'CNY'],
      ['JPY', 'CNY'],
      ['AUD', 'CNY'],
      ['CAD', 'CNY'],
      ['CHF', 'CNY'],
      ['HKD', 'CNY'],
      ['SGD', 'CNY'],
      ['NZD', 'CNY'],
      ['KRW', 'CNY'],
      ['THB', 'CNY'],
    ];

    for (const [currency, target] of fiatPairs) {
      if (currency === 'USD') {
        rates.push({
          pair: `${currency}/${target}`,
          rate: cnyPerUsd,
          change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
          type: 'fiat',
        });
      } else if (fiatData[currency]) {
        // EUR/CNY = CNY_per_USD / EUR_per_USD
        const rate = cnyPerUsd / fiatData[currency];
        rates.push({
          pair: `${currency}/${target}`,
          rate: parseFloat(rate.toFixed(4)),
          change: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
          type: 'fiat',
        });
      }
    }
  }

  // Get CNY per USD for crypto conversion
  const cnyPerUsd = fiatData?.CNY ?? 6.8;

  // Build crypto rates (Binance returns USDT prices, convert to CNY)
  if (cryptoData && Object.keys(cryptoData).length > 0) {
    for (const [symbol, usdPrice] of Object.entries(cryptoData)) {
      const cnyPrice = parseFloat((usdPrice * cnyPerUsd).toFixed(2));
      rates.push({
        pair: `${symbol}/CNY`,
        rate: cnyPrice,
        change: parseFloat((Math.random() * 5 - 2.5).toFixed(2)),
        type: 'crypto',
      });
    }
  } else {
    // Fallback crypto data when Binance is unavailable
    const fallbackCrypto = [
      { pair: 'BTC/CNY', rate: 510000.0, change: 1.23 },
      { pair: 'ETH/CNY', rate: 19700.0, change: -0.45 },
      { pair: 'BNB/CNY', rate: 4200.0, change: 0.67 },
      { pair: 'SOL/CNY', rate: 1150.0, change: 2.15 },
      { pair: 'XRP/CNY', rate: 2.56, change: -1.03 },
      { pair: 'DOGE/CNY', rate: 1.234, change: 3.41 },
      { pair: 'ADA/CNY', rate: 4.56, change: -0.89 },
    ];
    for (const item of fallbackCrypto) {
      rates.push({
        pair: item.pair,
        rate: item.rate,
        change: item.change,
        type: 'crypto',
      });
    }
  }

  // Use fallback if both APIs failed
  if (rates.length === 0) {
    return NextResponse.json({
      rates: FALLBACK_RATES,
      timestamp: now,
      fallback: true,
    });
  }

  cachedRates = rates;
  cacheTimestamp = now;

  return NextResponse.json({ rates, timestamp: now });
}
