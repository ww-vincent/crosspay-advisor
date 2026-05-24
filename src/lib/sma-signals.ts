import type { RatePoint } from "@/components/exchange-rate-chart";

export type Direction = "bullish" | "bearish" | "neutral";

export interface SMASignal {
  pair: string;
  direction: Direction;
  label: string;
  confidence: number;
  predictionRange: [number, number];
  suggestion: string;
}

function sma(points: number[], window: number): number {
  if (points.length < window) return points[points.length - 1];
  const slice = points.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdDev(points: number[]): number {
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, v) => sum + (v - mean) ** 2, 0) / points.length;
  return Math.sqrt(variance);
}

export function analyzeTrend(points: RatePoint[]): {
  direction: Direction;
  confidence: number;
  suggestion: string;
  predictionRange: [number, number];
} {
  const rates = points.map((p) => p.rate);
  const sma7 = sma(rates, 7);
  const sma30 = sma(rates, Math.min(30, rates.length));
  const recentRates = rates.slice(-7);
  const volatility = stdDev(recentRates);
  const trend = sma7 - sma30;

  let direction: Direction;
  let confidence: number;

  if (trend > 0 && sma7 > sma30 * 1.002) {
    direction = "bullish";
    confidence = Math.min(75, 50 + Math.abs(trend) * 100);
  } else if (trend < 0 && sma7 < sma30 * 0.998) {
    direction = "bearish";
    confidence = Math.min(75, 50 + Math.abs(trend) * 100);
  } else {
    direction = "neutral";
    confidence = Math.max(30, 60 - Math.abs(trend) * 100);
  }

  const lastRate = rates[rates.length - 1];
  const dailyDrift = trend / 30;
  const forecastWidth = volatility * 1.5 * Math.sqrt(5);
  const forecastCenter = lastRate + dailyDrift * 5;
  const predictionRange: [number, number] = [
    +(forecastCenter - forecastWidth).toFixed(4),
    +(forecastCenter + forecastWidth).toFixed(4),
  ];

  const suggestion =
    direction === "bullish" ? "建议3天内换汇，短线看涨"
    : direction === "bearish" ? "建议观望，等汇率回调"
    : "波动率低，可按需随时换汇";

  return { direction, confidence: +confidence.toFixed(1), suggestion, predictionRange };
}

export function generateSignals(histories: { pair: string; points: RatePoint[] }[]): SMASignal[] {
  return histories.map((h) => {
    const result = analyzeTrend(h.points);
    return {
      pair: h.pair,
      direction: result.direction,
      label: result.direction === "bullish" ? "📈 看涨" : result.direction === "bearish" ? "📉 看跌" : "➡️ 震荡",
      confidence: result.confidence,
      predictionRange: result.predictionRange,
      suggestion: result.suggestion,
    };
  });
}
