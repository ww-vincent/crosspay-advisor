"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { PredictionSignal, ForecastPoint, ModelDetail } from "@/lib/prediction-types";

interface Props {
  pair: string;
  signal: PredictionSignal | null;
  forecast: ForecastPoint[] | null;
  analysis: string | null;
  loading?: boolean;
}

const dirConfig = {
  bullish: { label: "看涨", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  bearish: { label: "看跌", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
  ranging: { label: "震荡", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
};

function ConfidenceBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  const width = Math.round(pct * 100);
  const gradient =
    width >= 70
      ? "from-emerald-500 to-emerald-400"
      : width >= 50
        ? "from-amber-500 to-amber-400"
        : "from-slate-500 to-slate-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{width}%</span>
    </div>
  );
}

function ModelBadge({ model }: { model: ModelDetail }) {
  const dirColors = {
    bullish: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    bearish: "text-red-400 border-red-500/20 bg-red-500/5",
    ranging: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${dirColors[model.direction]}`}>
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{model.model}</span>
        <span className="opacity-70">{model.reason}</span>
      </div>
      <span className="font-mono text-[10px] opacity-60">权重 {Math.round(model.weight * 100)}%</span>
    </div>
  );
}

export function PredictionSignalCard({ pair, signal, forecast, analysis, loading }: Props) {
  if (loading) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
            <span className="text-xs text-muted-foreground">加载预测数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signal) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-xs text-muted-foreground">暂未生成预测数据，请运行预测脚本</span>
        </CardContent>
      </Card>
    );
  }

  const cfg = dirConfig[signal.direction];

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4 space-y-4">
        {/* Header: direction + confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
            <h4 className="text-sm font-bold text-foreground">{pair}</h4>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">三模型融合预测</span>
        </div>

        {/* Confidence & agreement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">方向置信度</span>
            <span className="text-muted-foreground">模型一致率 <span className="font-mono text-foreground">{Math.round(signal.model_agreement * 100)}%</span></span>
          </div>
          <ConfidenceBar pct={signal.confidence} colorClass={cfg.color} />
        </div>

        {/* Model details */}
        {signal.model_details.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">模型拆解</span>
            {signal.model_details.map((m, i) => (
              <ModelBadge key={i} model={m} />
            ))}
          </div>
        )}

        {/* Analysis text */}
        {analysis && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
            {analysis}
          </p>
        )}

        {/* Forecast targets */}
        {forecast && forecast.length > 0 && (
          <div className="border-t border-border pt-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">预测目标价</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {forecast.map((p) => (
                <div key={p.day} className="rounded-lg border border-border bg-background/50 px-2.5 py-2 text-center">
                  <div className="text-[10px] text-muted-foreground">{p.day}日</div>
                  <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                    {p.rate.toFixed(4)}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {p.ci_90_lower.toFixed(3)}~{p.ci_90_upper.toFixed(3)}
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500/40 to-emerald-500/20 rounded-full"
                      style={{ width: `${Math.round((1 - p.volatility) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
