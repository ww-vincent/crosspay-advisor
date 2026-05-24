'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRates } from '@/hooks/use-rates';

type AlertDirection = 'up' | 'down';

interface Alert {
  id: string;
  pair: string;
  targetRate: number;
  direction: AlertDirection;
  currentRate: number;
  triggered: boolean;
  createdAt: number;
}

const MOCK_ALERTS: Alert[] = [
  { id: '1', pair: 'USD/CNY', targetRate: 6.7, direction: 'down', currentRate: 7.24, triggered: false, createdAt: Date.now() - 86400000 },
  { id: '2', pair: 'EUR/CNY', targetRate: 8.0, direction: 'up', currentRate: 7.85, triggered: false, createdAt: Date.now() - 43200000 },
  { id: '3', pair: 'GBP/CNY', targetRate: 9.3, direction: 'up', currentRate: 9.28, triggered: true, createdAt: Date.now() - 172800000 },
];

const CURRENCY_PAIRS = ['USD/CNY', 'EUR/CNY', 'GBP/CNY', 'JPY/CNY', 'AUD/CNY', 'CAD/CNY', 'CHF/CNY', 'HKD/CNY', 'BTC/CNY', 'ETH/CNY'];

function generateMiniChart() {
  const points = [];
  let y = 50;
  for (let i = 0; i < 40; i++) {
    y += (Math.random() - 0.5) * 12;
    y = Math.max(15, Math.min(85, y));
    points.push(`${i * 5},${100 - y}`);
  }
  return points.join(' ');
}

export function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPair, setNewPair] = useState('USD/CNY');
  const [newTarget, setNewTarget] = useState('');
  const [newDirection, setNewDirection] = useState<AlertDirection>('up');
  const { rates } = useRates();

  const getCurrentRate = useCallback(
    (pair: string): number => {
      const found = rates.find((r) => r.pair === pair);
      return found?.rate ?? 0;
    },
    [rates]
  );

  const miniChart = useMemo(() => generateMiniChart(), []);

  const handleAddAlert = () => {
    const target = parseFloat(newTarget);
    if (isNaN(target) || target <= 0) return;

    const newAlert: Alert = {
      id: Date.now().toString(),
      pair: newPair,
      targetRate: target,
      direction: newDirection,
      currentRate: getCurrentRate(newPair),
      triggered: false,
      createdAt: Date.now(),
    };
    setAlerts([newAlert, ...alerts]);
    setShowAddForm(false);
    setNewTarget('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="flex h-full flex-col px-4 py-4">
      {/* Alert list */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Rate Alerts</h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          className="h-7 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs text-white hover:from-amber-600 hover:to-orange-600"
        >
          {showAddForm ? 'Cancel' : '+ Add Alert'}
        </Button>
      </div>

      {/* Add alert form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Currency Pair</label>
              <select
                value={newPair}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewPair(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {CURRENCY_PAIRS.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Direction</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewDirection('up')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    newDirection === 'up'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  ↑ Above
                </button>
                <button
                  onClick={() => setNewDirection('down')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    newDirection === 'down'
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  ↓ Below
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Target Rate</label>
              <Input
                type="number"
                step="any"
                value={newTarget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTarget(e.target.value)}
                placeholder="Enter target rate"
                className="rounded-lg border-border bg-background text-sm"
              />
            </div>
            <Button
              onClick={handleAddAlert}
              disabled={!newTarget || isNaN(parseFloat(newTarget))}
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-xs text-white hover:from-amber-600 hover:to-orange-600"
            >
              Create Alert
            </Button>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {alerts.map((alert) => {
          const currentRate = getCurrentRate(alert.pair);
          const displayRate = currentRate || alert.currentRate;
          const progress =
            alert.direction === 'up'
              ? Math.min(100, (displayRate / alert.targetRate) * 100)
              : Math.min(100, (alert.targetRate / displayRate) * 100);
          const isClose = progress > 90 && !alert.triggered;

          return (
            <div
              key={alert.id}
              className={`rounded-xl border p-3 transition-all duration-200 ${
                alert.triggered
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : isClose
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">{alert.pair}</span>
                  {alert.triggered ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      Triggered
                    </span>
                  ) : isClose ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Close
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Monitoring
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-red-400"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Target: <span className="font-mono text-foreground">{alert.targetRate}</span>
                  <span className={alert.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                    {' '}{alert.direction === 'up' ? '↑' : '↓'}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Current: <span className="font-mono text-foreground">{displayRate || '—'}</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    alert.triggered
                      ? 'bg-amber-500'
                      : isClose
                      ? 'bg-emerald-500'
                      : 'bg-muted-foreground/30'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Market overview */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Market Overview</h3>
        <div className="space-y-2">
          {rates.filter((r) => r.type === 'fiat').slice(0, 5).map((item) => {
            const isUp = item.change >= 0;
            return (
              <div key={item.pair} className="flex items-center justify-between text-xs">
                <span className="font-mono text-foreground">{item.pair}</span>
                <span className={`font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{item.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-12 w-full">
          <svg viewBox="0 0 200 100" className="h-full w-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="url(#alertChartGrad)"
              strokeWidth="1.5"
              points={miniChart}
            />
            <defs>
              <linearGradient id="alertChartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
