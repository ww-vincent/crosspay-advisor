"use client";

import { CURRENCY_META } from "@/lib/currency-meta";
import type { RateItem } from "@/hooks/use-rates";

interface Props {
  rates: RateItem[];
  selectedPair: string;
  onSelect: (pair: string) => void;
}

function MiniSparkline({ change }: { change: number }) {
  const up = change > 0;
  const neutral = change === 0;
  const color = neutral ? "#94A3B8" : up ? "#22c55e" : "#ef4444";
  const path = up
    ? "M0,12 L4,8 L8,10 L12,4 L16,7 L20,2"
    : "M0,4 L4,8 L8,6 L12,12 L16,9 L20,14";

  return (
    <svg width="60" height="16" viewBox="0 0 20 16" className="flex-shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CurrencyPairList({ rates, selectedPair, onSelect }: Props) {
  const fiatRates = rates.filter((r) => r.type === "fiat");

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
        关注列表
      </h3>
      {fiatRates.map((r) => {
        const [base, target] = r.pair.split("/");
        const baseMeta = CURRENCY_META[base] || { flag: "💱", name: base };
        const targetMeta = CURRENCY_META[target] || { flag: "", name: target };
        const isSelected = r.pair === selectedPair;
        const up = r.change > 0;
        const neutral = r.change === 0;
        const changeColor = neutral ? "text-muted-foreground" : up ? "text-emerald-400" : "text-red-400";

        return (
          <button
            key={r.pair}
            onClick={() => onSelect(r.pair)}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              isSelected
                ? "bg-emerald-500/10 ring-1 ring-emerald-500/20"
                : "hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{baseMeta.flag}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{r.pair}</div>
                  <div className="text-xs text-muted-foreground">
                    {baseMeta.name}兑{targetMeta.name}
                  </div>
                </div>
              </div>
              <MiniSparkline change={r.change} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-lg font-mono font-bold ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                {r.rate >= 1 ? r.rate.toFixed(4) : r.rate.toFixed(5)}
              </span>
              <span className={`text-xs font-medium ${changeColor}`}>
                {neutral ? "▬ 0.00" : `${up ? "▲" : "▼"} ${Math.abs(r.change).toFixed(2)}%`}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
