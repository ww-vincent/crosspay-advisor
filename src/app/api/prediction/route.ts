import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const PREDICTIONS_DIR = join(process.cwd(), "output", "predictions");

interface ForecastPoint {
  day: number;
  rate: number;
  volatility: number;
  ci_90_lower: number;
  ci_90_upper: number;
}

interface PredictionReport {
  meta: { pair: string; generated_at: string; data_range: string; data_points: number };
  current: { rate: number; daily_change_pct: number; rsi_14: number; vol_annualized_pct: number; macd_hist: number };
  signal: { direction: string; confidence: number; direction_score: number; model_agreement: number; model_details: any[]; targets: Record<string, any> };
  indicators: { ma: any; bollinger: any; atr_14: number };
  forecast: { horizon_days: number[]; predictions: ForecastPoint[] };
  risk_warnings: { level: string; message: string }[];
  analysis: string;
  alerts: { type: string; level: string; pair: string; title: string; message: string; triggered_at: string }[];
  suggestions: { priority: number; icon: string; title: string; detail: string }[];
}

function getLatestReport(pair: string): PredictionReport | null {
  try {
    const [base, target] = pair.split("/");
    const forward = `${base}${target}`;
    const reverse = `${target}${base}`;
    const files = readdirSync(PREDICTIONS_DIR)
      .filter((f) => (f.includes(forward) || f.includes(reverse)) && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const raw = readFileSync(join(PREDICTIONS_DIR, files[0]), "utf-8");
    return JSON.parse(raw) as PredictionReport;
  } catch {
    return null;
  }
}

function getAllReports(): PredictionReport[] {
  try {
    const files = readdirSync(PREDICTIONS_DIR).filter((f) => f.endsWith(".json"));
    const seen = new Set<string>();
    const reports: PredictionReport[] = [];

    // latest per pair
    for (const f of files.sort().reverse()) {
      const raw = readFileSync(join(PREDICTIONS_DIR, f), "utf-8");
      const report = JSON.parse(raw) as PredictionReport;
      const pair = report.meta.pair;
      if (!seen.has(pair)) {
        seen.add(pair);
        reports.push(report);
      }
    }
    return reports;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pair = searchParams.get("pair");

  if (pair) {
    const report = getLatestReport(pair);
    if (!report) {
      return NextResponse.json({ error: `No prediction found for ${pair}` }, { status: 404 });
    }

    return NextResponse.json({
      pair: report.meta.pair,
      generatedAt: report.meta.generated_at,
      current: report.current,
      signal: report.signal,
      forecast: report.forecast,
      analysis: report.analysis,
      alerts: report.alerts,
      suggestions: report.suggestions,
      riskWarnings: report.risk_warnings,
    });
  }

  // all pairs — summary only
  const all = getAllReports();
  const summaries = all.map((r) => ({
    pair: r.meta.pair,
    generatedAt: r.meta.generated_at,
    rate: r.current.rate,
    dailyChange: r.current.daily_change_pct,
    signal: r.signal.direction,
    confidence: r.signal.confidence,
    target1d: r.forecast.predictions[0]?.rate,
    target7d: r.forecast.predictions[2]?.rate,
    analysis: r.analysis,
    alertCount: r.alerts.length,
    suggestionCount: r.suggestions.length,
  }));

  return NextResponse.json({ pairs: summaries, updatedAt: new Date().toISOString() });
}
