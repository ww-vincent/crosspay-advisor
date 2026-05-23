"use client";

import { useMemo } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface RatePoint {
  date: string;
  rate: number;
}

interface EventMarker {
  date: string;
  type: "fed" | "pboc" | "ecb" | "boj" | "data";
  label: string;
  impact: "high" | "medium" | "low";
}

interface Props {
  pair: string;
  points: RatePoint[];
  range: "7d" | "30d" | "90d" | "1y";
  events?: EventMarker[];
  loading?: boolean;
}

function formatDate(date: string, range: string): string {
  const d = parseISO(date);
  if (range === "1y") return format(d, "M月");
  if (range === "90d") return format(d, "M/d");
  return format(d, "d日");
}

export function ExchangeRateChart({ pair, points, range, events = [], loading }: Props) {
  const { chartData, domain, maShort, maLong } = useMemo(() => {
    if (points.length === 0) return { chartData: [], domain: [0, 0] as [number, number], maShort: [], maLong: [] };

    const rates = points.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const padding = (max - min) * 0.15 || 0.001;
    const domain: [number, number] = [+(min - padding).toFixed(4), +(max + padding).toFixed(4)];

    const n = points.length;
    const shortW = n >= 14 ? 7 : n >= 8 ? 5 : 0;
    const longW = n >= 60 ? 30 : n >= 40 ? 20 : 0;

    const sma = (window: number) =>
      window === 0 ? [] : points.map((_, i) => {
        if (i < window - 1) return null;
        const slice = rates.slice(i - window + 1, i + 1);
        return { date: points[i].date, rate: +(slice.reduce((a, b) => a + b, 0) / window).toFixed(4) };
      });

    return {
      chartData: points,
      domain,
      maShort: sma(shortW),
      maLong: sma(longW),
    };
  }, [points]);

  const mergedData = chartData.map((p, i) => ({
    ...p,
    maShort: maShort[i]?.rate ?? null,
    maLong: maLong[i]?.rate ?? null,
  }));

  const eventDots = useMemo(() => {
    if (chartData.length === 0 || events.length === 0) return [];
    return events
      .filter((e) => chartData.some((d) => d.date === e.date))
      .map((e) => {
        const pt = chartData.find((d) => d.date === e.date)!;
        return { ...e, rate: pt.rate };
      });
  }, [chartData, events]);

  if (loading) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
            <span className="text-xs text-muted-foreground">加载汇率数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-[#0B1120]/95 px-3 py-2 shadow-xl backdrop-blur">
        <p className="text-xs text-muted-foreground">{d.date}</p>
        <p className="text-sm font-mono font-bold text-foreground">{d.rate.toFixed(4)}</p>
      </div>
    );
  };

  const eventColor = (t: string) =>
    t === "fed" ? "#EF4444" : t === "pboc" ? "#3B82F6" : t === "ecb" ? "#A855F7" : "#F59E0B";

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{pair} 走势</h3>
            <p className="text-xs text-muted-foreground">
              {chartData.length > 0 && `${chartData[0].date} → ${chartData[chartData.length - 1].date}`}
            </p>
          </div>
          {chartData.length > 0 && (
            <span className="font-mono text-xl font-bold text-emerald-400">
              {chartData[chartData.length - 1].rate.toFixed(4)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, range)}
                stroke="rgba(148,163,184,0.3)" tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={domain}
                stroke="rgba(148,163,184,0.3)"
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "monospace" }}
                tickFormatter={(v) => v < 0.1 ? v.toFixed(4) : v.toFixed(2)}
                tickLine={false} axisLine={false} width={55} />
              <Tooltip content={<CustomTooltip />} />

              <Area type="monotone" dataKey="rate" stroke="none" fill="url(#chartGrad)" animationDuration={600} />
              {maLong.length > 0 && (
                <Line type="monotone" dataKey="maLong" stroke="rgba(148,163,184,0.15)" strokeWidth={1}
                  strokeDasharray="4 3" dot={false} connectNulls animationDuration={600} />
              )}
              {maShort.length > 0 && (
                <Line type="monotone" dataKey="maShort" stroke="rgba(148,163,184,0.3)" strokeWidth={1}
                  dot={false} connectNulls animationDuration={600} />
              )}
              <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} dot={false}
                connectNulls animationDuration={600} />

              {eventDots.map((e, i) => (
                <ReferenceDot key={`${e.date}-${i}`} x={e.date} y={e.rate} r={4}
                  fill={eventColor(e.type)} stroke="rgba(0,0,0,0.6)" strokeWidth={1} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-emerald-500" /> 汇率</span>
          {maShort.length > 0 && (
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-slate-400/30" /> 短期均线</span>
          )}
          {maLong.length > 0 && (
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded border-t border-dashed border-slate-400/15" /> 长期均线</span>
          )}
          {eventDots.length > 0 && eventDots.slice(0, 4).map((e, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: eventColor(e.type) }} />
              {e.date}: {e.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
