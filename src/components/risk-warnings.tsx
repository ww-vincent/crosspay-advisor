"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { RiskWarning } from "@/lib/prediction-types";

interface Props {
  warnings: RiskWarning[];
}

const levelConfig = {
  alert: {
    border: "border-red-500/20",
    bg: "bg-red-500/5",
    dot: "bg-red-400 animate-pulse",
    text: "text-red-400",
    icon: "!",
  },
  warning: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    dot: "bg-amber-400",
    text: "text-amber-400",
    icon: "!",
  },
  info: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    dot: "bg-blue-400",
    text: "text-blue-400",
    icon: "i",
  },
};

export function RiskWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null;

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">风险预警</h4>
        {warnings.map((w, i) => {
          const cfg = levelConfig[w.level] || levelConfig.info;
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${cfg.border} ${cfg.bg}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${cfg.dot} ${w.level === "alert" ? "text-white" : "text-white"}`}
              >
                {cfg.icon}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">{w.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
