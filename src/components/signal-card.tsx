"use client";

import type { SMASignal } from "@/lib/sma-signals";

interface PredictionInfo {
  signal: { direction: string; confidence: number };
  analysis: string;
  forecast?: {
    horizon_days: number[];
    predictions: { day: number; rate: number; ci_90_lower: number; ci_90_upper: number }[];
  };
}

interface Props {
  signals: SMASignal[];
  prediction?: PredictionInfo | null;
}

const dirConfig: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  bullish: { emoji: "📈", label: "看涨", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  bearish: { emoji: "📉", label: "看跌", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  neutral: { emoji: "➡️", label: "震荡", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

function ConfidenceBar({ pct }: { pct: number }) {
  const width = Math.round(pct);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${width}%`,
            background: width >= 70 ? "linear-gradient(90deg, #10B981, #059669)" : width >= 50 ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #6B7280, #4B5563)",
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right">{width}%</span>
    </div>
  );
}

export function SignalCard({ signals, prediction }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        预测信号
      </h3>

      {/* Python AI analysis (priority) */}
      {prediction && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-semibold text-emerald-300">
              {prediction.signal.direction === "bearish" ? "📉" : prediction.signal.direction === "bullish" ? "📈" : "↔️"}
              {" "}AI 量化分析
            </span>
            <ConfidenceBar pct={prediction.signal.confidence * 100} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{prediction.analysis}</p>

          {prediction.forecast?.predictions && (
            <div className="flex gap-3 mt-2 pt-2 border-t border-border/50">
              {prediction.forecast.predictions.map((p) => (
                <div key={p.day} className="text-center">
                  <div className="text-[10px] text-muted-foreground">{p.day}日目标</div>
                  <div className="text-xs font-mono font-bold text-foreground">{p.rate.toFixed(4)}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {p.ci_90_lower.toFixed(3)}~{p.ci_90_upper.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browser SMA signals (fallback) */}
      <div className="grid grid-cols-1 gap-2">
        {signals.map((s) => {
          const cfg = dirConfig[s.direction];
          return (
            <div
              key={s.pair}
              className={`rounded-xl p-3 border ${cfg.bg} ${cfg.border} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{s.pair}</span>
                <span className={`text-xs font-semibold ${cfg.color}`}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-1.5">
                {s.predictionRange[0]} ~ {s.predictionRange[1]}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.suggestion}</span>
                <span className="text-[10px] text-muted-foreground">{Math.round(s.confidence)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
