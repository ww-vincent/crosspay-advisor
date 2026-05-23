export interface ModelDetail {
  model: string;
  direction: "bullish" | "bearish" | "ranging";
  weight: number;
  reason: string;
}

export interface ForecastPoint {
  day: number;
  rate: number;
  volatility: number;
  ci_90_lower: number;
  ci_90_upper: number;
}

export interface PredictionSignal {
  direction: "bullish" | "bearish" | "ranging";
  confidence: number;
  direction_score: number;
  model_agreement: number;
  model_details: ModelDetail[];
}

export interface RiskWarning {
  level: "info" | "warning" | "alert";
  message: string;
}

export interface Suggestion {
  priority: number;
  icon: string;
  title: string;
  detail: string;
}

export interface AutoAlert {
  type: string;
  level: "info" | "warning" | "alert";
  pair: string;
  title: string;
  message: string;
  triggered_at: string;
}

export interface PredictionReport {
  pair: string;
  generatedAt: string;
  current: {
    rate: number;
    daily_change_pct: number;
    rsi_14: number;
    vol_annualized_pct: number;
    macd_hist: number;
  };
  signal: PredictionSignal;
  forecast: {
    horizon_days: number[];
    predictions: ForecastPoint[];
  };
  analysis: string;
  alerts: AutoAlert[];
  suggestions: Suggestion[];
  riskWarnings: RiskWarning[];
}
