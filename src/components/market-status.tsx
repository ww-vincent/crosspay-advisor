'use client';

import { useState, useEffect, useRef } from 'react';

interface MarketRegion {
  id: string;
  name: string;
  cities: { name: string; offset: number; openHour: number; closeHour: number }[];
}

const REGIONS: MarketRegion[] = [
  {
    id: 'asia',
    name: 'Asia-Pacific',
    cities: [
      { name: 'Tokyo', offset: 9, openHour: 9, closeHour: 15 },
      { name: 'Sydney', offset: 10, openHour: 9, closeHour: 17 },
      { name: 'Singapore', offset: 8, openHour: 9, closeHour: 17 },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    cities: [
      { name: 'London', offset: 0, openHour: 8, closeHour: 16 },
      { name: 'Frankfurt', offset: 1, openHour: 8, closeHour: 16 },
      { name: 'Paris', offset: 1, openHour: 8, closeHour: 16 },
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    cities: [
      { name: 'New York', offset: -5, openHour: 8, closeHour: 17 },
      { name: 'Toronto', offset: -5, openHour: 9, closeHour: 16 },
      { name: 'Chicago', offset: -6, openHour: 8, closeHour: 15 },
    ],
  },
  {
    id: 'forex',
    name: 'Global Forex',
    cities: [
      { name: '24h Market', offset: 0, openHour: 0, closeHour: 24 },
    ],
  },
];

function isMarketOpen(region: MarketRegion): { open: boolean; closesIn?: number; opensIn?: number } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const day = now.getUTCDay();

  if (day === 0 || day === 6) {
    return { open: false, opensIn: undefined };
  }

  if (region.id === 'forex') {
    return { open: true };
  }

  for (const city of region.cities) {
    const localHour = (utcHour + city.offset + 24) % 24;
    if (localHour >= city.openHour && localHour < city.closeHour) {
      const closesIn = (city.closeHour - localHour) * 60 - utcMinute;
      return { open: true, closesIn };
    }
  }

  return { open: false };
}

interface MarketStatusProps {
  isFallback?: boolean;
}

export function MarketStatus({ isFallback }: MarketStatusProps) {
  const [activeRegion, setActiveRegion] = useState('forex');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const region = REGIONS.find((r) => r.id === activeRegion) || REGIONS[3];
  const status = isFallback ? { open: false } : isMarketOpen(region);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
        >
          <span>{region.name}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-white/40 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-[#111827] border border-white/10 shadow-xl shadow-black/40 py-1 z-50">
            {REGIONS.map((r) => {
              const s = isFallback ? { open: false } : isMarketOpen(r);
              return (
                <button
                  key={r.id}
                  onClick={() => { setActiveRegion(r.id); setDropdownOpen(false); }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs transition-colors ${
                    activeRegion === r.id
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }`}
                >
                  <span>{r.name}</span>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.open ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`pulse-dot inline-block h-2 w-2 rounded-full ${
            status.open ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <span className={`text-xs font-medium ${status.open ? 'text-emerald-400' : 'text-amber-400'}`}>
          {status.open ? (
            <>
              Open
              {status.closesIn !== undefined && (
                <span className="ml-1 text-white/40">
                  · {formatTime(status.closesIn)}
                </span>
              )}
            </>
          ) : (
            'Closed'
          )}
        </span>
      </div>
    </div>
  );
}
