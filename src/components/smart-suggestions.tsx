"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Suggestion } from "@/lib/prediction-types";

interface Props {
  suggestions: Suggestion[];
}

export function SmartSuggestions({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  const sorted = [...suggestions].sort((a, b) => a.priority - b.priority);

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">智能建议</h4>
        {sorted.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{s.icon}</span>
              <span className="text-xs font-semibold text-emerald-300">{s.title}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{s.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
