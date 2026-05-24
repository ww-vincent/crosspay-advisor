"use client";

import { useState, useEffect, useCallback } from "react";
import type { PredictionReport } from "@/lib/prediction-types";

export function usePrediction(pair: string, pollInterval = 300_000) {
  const [data, setData] = useState<PredictionReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrediction = useCallback(async () => {
    try {
      const res = await fetch(`/api/prediction?pair=${encodeURIComponent(pair)}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      if (json.error) {
        setData(null);
        return;
      }
      setData(json as PredictionReport);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [pair]);

  useEffect(() => {
    setLoading(true);
    fetchPrediction();
    const timer = setInterval(fetchPrediction, pollInterval);
    return () => clearInterval(timer);
  }, [fetchPrediction, pollInterval]);

  return { prediction: data, loading };
}
