"use client";

import { useState, useEffect } from "react";
import { useRates, type RateItem } from "@/hooks/use-rates";
import { useHistory } from "@/hooks/use-history";
import { usePrediction } from "@/hooks/use-prediction";
import { ExchangeRateChart } from "@/components/exchange-rate-chart";
import { CurrencyPairList } from "@/components/currency-pair-list";
import { SignalCard } from "@/components/signal-card";
import { UserAlerts } from "@/components/user-alerts";
import { generateSignals } from "@/lib/sma-signals";
import { CURRENCY_META } from "@/lib/currency-meta";
import type { EconomicEvent } from "@/lib/prediction-types";

type TimeRange = "7d" | "30d" | "90d" | "1y";

const TIME_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7日" },
  { key: "30d", label: "30日" },
  { key: "90d", label: "90日" },
  { key: "1y", label: "1年" },
];

export default function AlertPage() {
  const [selectedPair, setSelectedPair] = useState("USD/CNY");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  const { rates } = useRates();
  const { points: historyPoints, loading: histLoading } = useHistory(selectedPair, timeRange);
  const { prediction, loading: predLoading } = usePrediction(selectedPair);

  useEffect(() => {
    import("@/data/events.json")
      .then((m) => setEvents(m.default as EconomicEvent[]))
      .catch(() => {});
  }, []);

  const signals = generateSignals([{ pair: selectedPair, points: historyPoints }]);

  const [base, target] = selectedPair.split("/");
  const baseMeta = CURRENCY_META[base] || { flag: "💱" };

  // Filter events in chart range
  const chartEvents = events
    .filter((e) => {
      if (historyPoints.length === 0) return false;
      return e.date >= historyPoints[0].date && e.date <= historyPoints[historyPoints.length - 1].date;
    })
    .map((e) => ({
      date: e.date,
      type: e.type as "fed" | "pboc" | "ecb" | "boj" | "data",
      label: e.label,
      impact: e.impact as "high" | "medium" | "low",
    }));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Left Sidebar ── */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card/50 p-4 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            {baseMeta.flag} 汇率顾问
          </h1>
          <p className="text-xs text-muted-foreground mt-1">FX Advisor</p>
        </div>

        <CurrencyPairList
          rates={rates}
          selectedPair={selectedPair}
          onSelect={setSelectedPair}
        />

        <div className="mt-6">
          <UserAlerts currentRate={prediction?.current?.rate} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回
          </a>
          <span className="text-sm text-muted-foreground">
            {base} → {target} 汇率走势
          </span>
          <div className="flex gap-1 ml-auto">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeRange(opt.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  timeRange === opt.key
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {/* Chart area */}
        <div className="flex-1 p-6 min-h-0">
          <div className="h-full max-h-[55vh]">
            <ExchangeRateChart
              pair={selectedPair}
              points={historyPoints}
              range={timeRange}
              events={chartEvents}
              loading={histLoading}
            />
          </div>
        </div>

        {/* Bottom: prediction signals */}
        <div className="border-t border-border px-6 py-4 flex-shrink-0">
          <SignalCard
            signals={signals}
            prediction={prediction ? {
              signal: { direction: prediction.signal.direction, confidence: prediction.signal.confidence },
              analysis: prediction.analysis,
              forecast: prediction.forecast,
            } : null}
          />
        </div>
      </main>

      {/* ── Right Sidebar ── */}
      <aside className="w-72 flex-shrink-0 border-l border-border bg-card/50 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          快速概览
        </h3>

        {rates.filter((r) => r.type === "fiat").slice(0, 8).map((r) => {
          const [b, t] = r.pair.split("/");
          const bMeta = CURRENCY_META[b] || { flag: "💱", name: b };
          const up = r.change > 0;
          return (
            <div key={r.pair} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <div className="text-xs text-foreground font-medium">
                  {bMeta.flag} {r.pair}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-foreground">
                  {r.rate >= 1 ? r.rate.toFixed(4) : r.rate.toFixed(5)}
                </div>
                <div className={`text-[10px] font-medium ${up ? "text-emerald-400" : r.change < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                  {r.change > 0 ? "+" : ""}{r.change.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}

        {events.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">
              关键事件
            </h3>
            <div className="space-y-1.5">
              {events.slice(0, 6).map((e, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                      e.type === "fed" ? "bg-red-500" : e.type === "pboc" ? "bg-blue-500" : e.type === "ecb" ? "bg-purple-500" : e.type === "boj" ? "bg-orange-500" : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="text-muted-foreground/50 ml-1">{e.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
