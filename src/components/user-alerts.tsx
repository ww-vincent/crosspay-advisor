"use client";

import { useState } from "react";

interface UserAlert {
  id: string;
  pair: string;
  targetRate: number;
  direction: "above" | "below";
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

interface Props {
  currentRate?: number;
}

export function UserAlerts({ currentRate }: Props) {
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPair, setNewPair] = useState("USD/CNY");
  const [newDir, setNewDir] = useState<"above" | "below">("above");
  const [newRate, setNewRate] = useState("");

  const addAlert = () => {
    if (!newRate) return;
    const alert: UserAlert = {
      id: Date.now().toString(),
      pair: newPair,
      targetRate: parseFloat(newRate),
      direction: newDir,
      triggered: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setAlerts((prev) => [alert, ...prev]);
    setShowForm(false);
    setNewRate("");
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const PAIRS = [
    "USD/CNY",
    "EUR/CNY",
    "GBP/CNY",
    "JPY/CNY",
    "AUD/CNY",
    "USD/EUR",
    "GBP/USD",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">
          My Alerts
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          + New
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800 space-y-2">
          <div className="flex gap-2">
            <select
              value={newPair}
              onChange={(e) => setNewPair(e.target.value)}
              className="flex-1 bg-[#020202] border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={newDir}
              onChange={(e) => setNewDir(e.target.value as "above" | "below")}
              className="bg-[#020202] border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              placeholder="Target rate"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="flex-1 bg-[#020202] border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600"
            />
            <button
              onClick={addAlert}
              className="px-3 py-1.5 bg-emerald-500 text-black text-xs rounded-lg hover:bg-emerald-400 transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs group ${
              a.triggered
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-zinc-900/20 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  a.triggered
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="text-zinc-200 font-medium">{a.pair}</span>
              <span className="text-zinc-500 truncate">
                {a.direction === "above" ? "≥" : "≤"}{" "}
                {a.targetRate.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  a.triggered ? "text-emerald-400" : "text-zinc-600"
                }
              >
                {a.triggered ? `Triggered ${a.triggeredAt}` : "Waiting"}
              </span>
              <button
                onClick={() => removeAlert(a.id)}
                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">
            No alerts yet. Click &quot;+ New&quot; to add one.
          </p>
        )}
      </div>
    </div>
  );
}
