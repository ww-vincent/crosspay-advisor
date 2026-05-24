import { NextRequest, NextResponse } from "next/server";

const FRANKFURTER_BASE = "https://api.frankfurter.app";

interface RatePoint {
  date: string;
  rate: number;
}

// Frankfurter uses EUR as base for historical data by default
// We need to handle currency pair conversion
async function fetchHistory(base: string, target: string, start: string, end: string): Promise<RatePoint[]> {
  // For non-EUR bases, Frankfurter supports ?from=BASE&to=TARGET
  const url = `${FRANKFURTER_BASE}/${start}..${end}?from=${base}&to=${target}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.rates) return [];

  const points: RatePoint[] = [];
  for (const [date, rates] of Object.entries(data.rates) as [string, Record<string, number>][]) {
    if (rates[target]) {
      points.push({ date, rate: +rates[target].toFixed(4) });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function generateFallback(pair: string, days: number): RatePoint[] {
  const [base] = pair.split("/");
  const seed = base === "USD" ? 7.2 : base === "EUR" ? 7.9 : base === "GBP" ? 9.1 : base === "JPY" ? 0.048 : 5.0;
  const points: RatePoint[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const noise = (Math.random() - 0.5) * seed * 0.02;
    points.push({ date: dateStr, rate: +(seed + noise).toFixed(4) });
  }
  return points;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair") || "USD/CNY";
  const range = searchParams.get("range") || "30d";

  const [base, target] = pair.split("/");
  if (!base || !target) {
    return NextResponse.json({ error: "Invalid pair format" }, { status: 400 });
  }

  const endDate = new Date();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  try {
    const points = await fetchHistory(base, target, start, end);
    if (points.length > 0) {
      return NextResponse.json({ pair, range, points });
    }
    // Fallback if Frankfurter returns empty
    return NextResponse.json({ pair, range, points: generateFallback(pair, days), fallback: true });
  } catch {
    return NextResponse.json({ pair, range, points: generateFallback(pair, days), fallback: true });
  }
}
