"use client";

import { useState, useEffect } from "react";
import { useRates } from "@/hooks/use-rates";
import { useHistory } from "@/hooks/use-history";
import { usePrediction } from "@/hooks/use-prediction";
import { ExchangeRateChart } from "@/components/exchange-rate-chart";
import { CurrencyPairList } from "@/components/currency-pair-list";
import { SignalCard } from "@/components/signal-card";
import { UserAlerts } from "@/components/user-alerts";
import { generateSignals } from "@/lib/sma-signals";
import { CURRENCY_META } from "@/lib/currency-meta";

type TimeRange = "7d" | "30d" | "90d" | "1y";

const TIME_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
];

interface EconomicEvent {
  date: string;
  type: string;
  label: string;
  impact: string;
}

export function DashboardLayout() {
  const [selectedPair, setSelectedPair] = useState("USD/CNY");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  const { rates } = useRates();
  const { points: historyPoints, loading: histLoading } = useHistory(
    selectedPair,
    timeRange
  );
  const { prediction } = usePrediction(selectedPair);

  useEffect(() => {
    import("@/data/events.json")
      .then((m) => setEvents(m.default as EconomicEvent[]))
      .catch(() => {});
  }, []);

  const signals = generateSignals([
    { pair: selectedPair, points: historyPoints },
  ]);

  const [base, target] = selectedPair.split("/");
  const baseMeta = CURRENCY_META[base] || { flag: "💱" };

  const chartEvents = events
    .filter((e) => {
      if (historyPoints.length === 0) return false;
      return (
        e.date >= historyPoints[0].date &&
        e.date <= historyPoints[historyPoints.length - 1].date
      );
    })
    .map((e) => ({
      date: e.date,
      type: e.type as "fed" | "pboc" | "ecb" | "boj" | "data",
      label: e.label,
      impact: e.impact as "high" | "medium" | "low",
    }));

  return (
    <div className="flex h-full overflow-hidden bg-[#020202]">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-900 bg-zinc-950/50 p-4 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            {baseMeta.flag} FX Advisor
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">Rates Runway</p>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-11 border-b border-zinc-900 flex items-center px-5 gap-4 flex-shrink-0 bg-[#030303]">
          <span className="text-xs text-zinc-400 font-mono">
            {base} → {target} Rates Runway
          </span>
          <div className="flex gap-1 ml-auto">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeRange(opt.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all font-sans ${
                  timeRange === opt.key
                    ? "bg-emerald-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 p-5 min-h-0">
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

        <div className="border-t border-zinc-900 px-5 py-4 flex-shrink-0 bg-[#030303]">
          <SignalCard
            signals={signals}
            prediction={
              prediction
                ? {
                    signal: {
                      direction: prediction.signal.direction,
                      confidence: prediction.signal.confidence,
                    },
                    analysis: prediction.analysis,
                    forecast: prediction.forecast,
                  }
                : null
            }
          />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-72 flex-shrink-0 border-l border-zinc-900 bg-zinc-950/50 p-4 overflow-y-auto">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 font-mono">
          Quick Overview
        </h3>

        {rates
          .filter((r) => r.type === "fiat")
          .slice(0, 8)
          .map((r) => {
            const [b] = r.pair.split("/");
            const bMeta = CURRENCY_META[b] || { flag: "💱" };
            const up = r.change > 0;
            return (
              <div
                key={r.pair}
                className="flex items-center justify-between py-2 border-b border-zinc-900/50 last:border-0"
              >
                <div>
                  <div className="text-xs text-zinc-300 font-medium">
                    {bMeta.flag} {r.pair}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-zinc-100">
                    {r.rate >= 1 ? r.rate.toFixed(4) : r.rate.toFixed(5)}
                  </div>
                  <div
                    className={`text-[10px] font-medium ${
                      up
                        ? "text-emerald-400"
                        : r.change < 0
                        ? "text-red-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {r.change > 0 ? "+" : ""}
                    {r.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}

        {events.length > 0 && (
          <>
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-6 mb-3 font-mono">
              Key Events
            </h3>
            <div className="space-y-1.5">
              {events.slice(0, 6).map((e, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                      e.type === "fed"
                        ? "bg-red-500"
                        : e.type === "pboc"
                        ? "bg-blue-500"
                        : e.type === "ecb"
                        ? "bg-purple-500"
                        : e.type === "boj"
                        ? "bg-orange-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <span className="text-zinc-400">{e.label}</span>
                    <span className="text-zinc-600 ml-1">{e.date}</span>
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
