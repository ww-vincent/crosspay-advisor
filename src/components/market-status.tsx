'use client';

import { useState, useEffect } from 'react';

interface MarketRegion {
  id: string;
  name: string;
  flag: string;
  /** Trading session in UTC hours [start, end) – forex is Mon-Fri */
  sessions: [number, number][];
  /** Major exchanges in this region */
  exchanges: string;
}

const REGIONS: MarketRegion[] = [
  {
    id: 'asia',
    name: '亚太市场',
    flag: '🌏',
    sessions: [[0, 9]],       // Tokyo 00:00-09:00 UTC
    exchanges: '东京、悉尼、新加坡',
  },
  {
    id: 'europe',
    name: '欧洲市场',
    flag: '🌍',
    sessions: [[8, 17]],      // London 08:00-17:00 UTC
    exchanges: '伦敦、法兰克福、巴黎',
  },
  {
    id: 'americas',
    name: '美洲市场',
    flag: '🌎',
    sessions: [[13, 22]],     // New York 13:00-22:00 UTC
    exchanges: '纽约、多伦多、芝加哥',
  },
  {
    id: 'global',
    name: '全球外汇',
    flag: '🌐',
    sessions: [[0, 24]],      // Forex is technically 24h on weekdays
    exchanges: '24 小时连续交易',
  },
];

function isMarketOpen(region: MarketRegion, now: Date): boolean {
  const day = now.getUTCDay();
  // Forex closed on Saturday (6) and Sunday (0) until Sydney opens
  if (day === 6) return false;
  if (day === 0) return false;

  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const time = hour + minute / 60;

  return region.sessions.some(([start, end]) => time >= start && time < end);
}

function getTimeLabel(region: MarketRegion): string {
  const now = new Date();
  const open = isMarketOpen(region, now);
  if (!open) return '未开盘';

  // Calculate next close time
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  for (const [start, end] of region.sessions) {
    if (hour >= start && hour < end) {
      const hoursLeft = Math.floor(end - hour);
      const minsLeft = Math.round((end - hour - hoursLeft) * 60);
      return `开盘中 · 剩余 ${hoursLeft}h${minsLeft}m`;
    }
  }
  return '开盘中';
}

function getNextOpen(region: MarketRegion): string {
  const now = new Date();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;

  for (const [start] of region.sessions) {
    if (hour < start) {
      const diff = start - hour;
      const h = Math.floor(diff);
      const m = Math.round((diff - h) * 60);
      return `${h}h${m}m 后开盘`;
    }
  }
  // Next day
  const diff = 24 - hour + region.sessions[0][0];
  const h = Math.floor(diff);
  const m = Math.round((diff - h) * 60);
  return `${h}h${m}m 后开盘`;
}

interface MarketStatusProps {
  isFallback: boolean;
}

export function MarketStatus({ isFallback }: MarketStatusProps) {
  const [selectedId, setSelectedId] = useState('asia');
  const [tick, setTick] = useState(0);

  // Refresh every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const region = REGIONS.find((r) => r.id === selectedId) ?? REGIONS[0];
  const open = isMarketOpen(region, new Date());
  // Force re-render on tick
  void tick;

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground outline-none transition-colors hover:border-emerald-500/50 focus:border-emerald-500/50 cursor-pointer appearance-none pr-6"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.flag} {r.name}
          </option>
        ))}
      </select>

      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
          isFallback
            ? 'border-border bg-card'
            : open
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-amber-500/20 bg-amber-500/10'
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isFallback
              ? 'bg-muted-foreground'
              : open
                ? 'bg-emerald-500 pulse-dot'
                : 'bg-amber-500'
          }`}
        />
        <span
          className={`text-xs font-medium ${
            isFallback
              ? 'text-muted-foreground'
              : open
                ? 'text-emerald-400'
                : 'text-amber-400'
          }`}
        >
          {isFallback ? '离线数据' : getTimeLabel(region)}
        </span>
      </div>

      {!isFallback && !open && (
        <span className="text-[11px] text-muted-foreground">{getNextOpen(region)}</span>
      )}

      <span className="text-[11px] text-muted-foreground">{region.exchanges}</span>
    </div>
  );
}
