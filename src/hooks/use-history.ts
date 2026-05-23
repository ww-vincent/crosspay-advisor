"use client";

import { useState, useEffect, useCallback } from "react";
import type { RatePoint } from "@/components/exchange-rate-chart";

export function useHistory(pair: string, range: "7d" | "30d" | "90d" | "1y" = "30d") {
  const [points, setPoints] = useState<RatePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rates/history?pair=${encodeURIComponent(pair)}&range=${range}`);
      if (!res.ok) return;
      const data = await res.json();
      setPoints(data.points || []);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [pair, range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { points, loading, refetch: fetchHistory };
}
