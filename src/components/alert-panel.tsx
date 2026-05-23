"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRates } from "@/hooks/use-rates";
import { usePrediction } from "@/hooks/use-prediction";
import { useHistory } from "@/hooks/use-history";
import { ExchangeRateChart } from "@/components/exchange-rate-chart";
import { PredictionSignalCard } from "@/components/prediction-signal";
import { RiskWarnings } from "@/components/risk-warnings";
import { SmartSuggestions } from "@/components/smart-suggestions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Alert {
  id: string;
  pair: string;
  targetRate: number;
  currentRate: number;
  direction: "above" | "below";
  status: "active" | "triggered";
  createdAt: string;
}

const CURRENCY_PAIRS = ["USD/CNY", "EUR/CNY", "GBP/CNY", "JPY/CNY", "AUD/CNY", "CAD/CNY"];
const TIME_RANGES = ["7d", "30d", "90d", "1y"] as const;

export function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newPair, setNewPair] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newDirection, setNewDirection] = useState<"above" | "below">("above");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState("USD/CNY");
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { rates } = useRates();
  const { prediction, loading: predLoading } = usePrediction(selectedPair);
  const { points: historyPoints, loading: histLoading } = useHistory(selectedPair, chartRange);

  const getCurrentRate = (pair: string): number => {
    const found = rates.find((r) => r.pair === pair);
    return found ? found.rate : 7.2456;
  };

  const handleAddAlert = () => {
    if (!newPair || !newRate) return;
    const alert: Alert = {
      id: Date.now().toString(),
      pair: newPair,
      targetRate: parseFloat(newRate),
      currentRate: getCurrentRate(newPair),
      direction: newDirection,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setAlerts((prev) => [alert, ...prev]);
    setNewPair("");
    setNewRate("");
    setNewDirection("above");
    setDialogOpen(false);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Pair selector tabs */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2 overflow-x-auto">
        {CURRENCY_PAIRS.map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedPair === pair
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll">
        <div className="p-4 space-y-4">
          {/* Range selector + chart */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    chartRange === r
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "7d" ? "7日" : r === "30d" ? "30日" : r === "90d" ? "90日" : "1年"}
                </button>
              ))}
            </div>
            {prediction?.current && (
              <span className="text-[11px] text-muted-foreground">
                RSI {prediction.current.rsi_14?.toFixed(1)} · 波动率 {prediction.current.vol_annualized_pct?.toFixed(1)}%
              </span>
            )}
          </div>

          <ExchangeRateChart
            pair={selectedPair}
            points={historyPoints}
            range={chartRange}
            loading={histLoading}
          />

          {/* Prediction signal */}
          <PredictionSignalCard
            pair={selectedPair}
            signal={prediction?.signal ?? null}
            forecast={prediction?.forecast?.predictions ?? null}
            analysis={prediction?.analysis ?? null}
            loading={predLoading}
          />

          {/* Risk warnings */}
          {prediction?.riskWarnings && prediction.riskWarnings.length > 0 && (
            <RiskWarnings warnings={prediction.riskWarnings} />
          )}

          {/* Smart suggestions */}
          {prediction?.suggestions && prediction.suggestions.length > 0 && (
            <SmartSuggestions suggestions={prediction.suggestions} />
          )}

          {/* ── User Alerts Section ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">我的预警</h4>
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
                  {alerts.filter((a) => a.status === "active").length} 活跃
                </Badge>
                {alerts.filter((a) => a.status === "triggered").length > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">
                    {alerts.filter((a) => a.status === "triggered").length} 已触发
                  </Badge>
                )}
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-xs text-white hover:from-amber-600 hover:to-orange-600"
                  >
                    + 新建
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">新增汇率预警</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">币对</label>
                      <Select value={newPair} onValueChange={setNewPair}>
                        <SelectTrigger className="border-border bg-background">
                          <SelectValue placeholder="选择币对" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          {CURRENCY_PAIRS.map((pair) => (
                            <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">预警方向</label>
                      <Select value={newDirection} onValueChange={(v) => setNewDirection(v as "above" | "below")}>
                        <SelectTrigger className="border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          <SelectItem value="above">高于目标汇率</SelectItem>
                          <SelectItem value="below">低于目标汇率</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">目标汇率</label>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="输入目标汇率"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="border-border bg-background font-mono"
                      />
                    </div>
                    <Button
                      onClick={handleAddAlert}
                      disabled={!newPair || !newRate}
                      className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600"
                    >
                      确认添加
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Alert list */}
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">暂无预警</p>
                <p className="text-xs text-muted-foreground mt-1">点击"+ 新建"添加汇率预警</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const liveRate = getCurrentRate(alert.pair);
                  const progress =
                    alert.direction === "above"
                      ? Math.min((liveRate / alert.targetRate) * 100, 100)
                      : Math.min((alert.targetRate / liveRate) * 100, 100);

                  return (
                    <div
                      key={alert.id}
                      className={`group rounded-xl border p-3 transition-colors ${
                        alert.status === "triggered"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-card/60 hover:border-emerald-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${
                              alert.status === "triggered"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {alert.pair.split("/")[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{alert.pair}</span>
                              {alert.status === "triggered" ? (
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                                  已触发
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                  监控中
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {alert.direction === "above" ? "涨至" : "跌至"} {alert.targetRate.toFixed(4)} 时提醒
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 p-1"
                          aria-label="删除预警"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between">
                        <div>
                          <div className="text-lg font-mono font-semibold text-foreground">
                            {liveRate >= 1 ? liveRate.toFixed(4) : liveRate.toFixed(5)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            当前汇率 · 创建于 {alert.createdAt}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>目标 {alert.targetRate.toFixed(4)}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-secondary">
                          <div
                            className={`h-1 rounded-full transition-all duration-500 ${
                              alert.status === "triggered"
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
