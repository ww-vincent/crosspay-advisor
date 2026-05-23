#!/usr/bin/env node
/**
 * JS fallback prediction generator — used when Python venv isn't available.
 * Creates minimal valid prediction JSON so the Coze deployment works without Python.
 */
const fs = require("fs");
const path = require("path");

const PAIRS = [
  { base: "USD", target: "CNY", rate: 6.7953, baseRate: 7.2 },
  { base: "EUR", target: "CNY", rate: 7.8792, baseRate: 7.9 },
  { base: "GBP", target: "CNY", rate: 9.1175, baseRate: 9.1 },
  { base: "JPY", target: "CNY", rate: 0.0427, baseRate: 0.048 },
  { base: "AUD", target: "CNY", rate: 4.8389, baseRate: 4.9 },
  { base: "EUR", target: "USD", rate: 1.085, baseRate: 1.09 },
  { base: "GBP", target: "USD", rate: 1.263, baseRate: 1.27 },
];

const OUT_DIR = path.resolve(__dirname, "..", "output", "predictions");

function generateReport(pairData) {
  const { base, target, rate } = pairData;
  const now = new Date().toISOString();
  const dateStr = now.split("T")[0];

  return {
    meta: {
      pair: `${base}/${target}`,
      generated_at: now,
      data_range: `${dateStr} → ${dateStr}`,
      data_points: 30,
    },
    current: {
      rate,
      daily_change_pct: +(Math.random() * 0.4 - 0.2).toFixed(2),
      rsi_14: +(40 + Math.random() * 20).toFixed(1),
      vol_annualized_pct: +(1 + Math.random() * 3).toFixed(2),
      macd_hist: +(Math.random() * 0.004 - 0.002).toFixed(6),
    },
    signal: {
      direction: Math.random() > 0.6 ? "bullish" : Math.random() > 0.3 ? "ranging" : "bearish",
      confidence: +(0.5 + Math.random() * 0.5).toFixed(2),
      direction_score: +(Math.random() * 1.4 - 0.7).toFixed(2),
      model_agreement: +(0.5 + Math.random() * 0.5).toFixed(2),
      model_details: [
        { model: "STL", direction: "ranging", weight: 0.3, reason: "趋势平稳" },
        { model: "MA_Cross", direction: "ranging", weight: 0.3, reason: "均线交叉信号中性" },
        { model: "ARIMA+GARCH", direction: "ranging", weight: 0.4, reason: "短期预测平稳" },
      ],
      targets: {
        target_1d: { rate: +(rate * (1 + (Math.random() - 0.5) * 0.002)).toFixed(4), volatility: 0.0015, ci_90: { lower: +(rate * 0.997).toFixed(4), upper: +(rate * 1.003).toFixed(4) } },
        target_3d: { rate: +(rate * (1 + (Math.random() - 0.5) * 0.004)).toFixed(4), volatility: 0.0025, ci_90: { lower: +(rate * 0.995).toFixed(4), upper: +(rate * 1.005).toFixed(4) } },
        target_7d: { rate: +(rate * (1 + (Math.random() - 0.5) * 0.008)).toFixed(4), volatility: 0.004, ci_90: { lower: +(rate * 0.992).toFixed(4), upper: +(rate * 1.008).toFixed(4) } },
      },
    },
    indicators: {
      ma: { ma_5: rate, ma_20: +(rate * 1.001).toFixed(4) },
      bollinger: { upper: +(rate * 1.02).toFixed(4), middle: rate, lower: +(rate * 0.98).toFixed(4), position_pct: 50 },
      atr_14: +(rate * 0.005).toFixed(4),
    },
    forecast: {
      horizon_days: [1, 3, 7],
      predictions: [
        { day: 1, rate: +(rate * (1 + (Math.random() - 0.5) * 0.002)).toFixed(4), volatility: 0.0015, ci_90_lower: +(rate * 0.997).toFixed(4), ci_90_upper: +(rate * 1.003).toFixed(4) },
        { day: 3, rate: +(rate * (1 + (Math.random() - 0.5) * 0.005)).toFixed(4), volatility: 0.0025, ci_90_lower: +(rate * 0.995).toFixed(4), ci_90_upper: +(rate * 1.005).toFixed(4) },
        { day: 7, rate: +(rate * (1 + (Math.random() - 0.5) * 0.01)).toFixed(4), volatility: 0.004, ci_90_lower: +(rate * 0.992).toFixed(4), ci_90_upper: +(rate * 1.008).toFixed(4) },
      ],
    },
    risk_warnings: [
      { level: "info", message: "此为静态回退数据，实际预测请运行 Python 模型流水线" },
    ],
    analysis: "此为离线回退预测数据。请运行 scripts/run_prediction.sh 生成基于 STL + MA交叉 + ARIMA+GARCH 三模型融合的真实预测。",
    alerts: [],
    suggestions: [
      { priority: 1, icon: "📊", title: "运行真实模型", detail: `执行 scripts/run_prediction.sh 获取基于 ${base}/${target} 历史数据的多模型融合预测` },
    ],
  };
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const today = new Date().toISOString().split("T")[0];

for (const pairData of PAIRS) {
  const report = generateReport(pairData);
  const filename = `${today}_${pairData.base}${pairData.target}_forecast.json`;
  fs.writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(report, null, 2));
  console.log(`Generated fallback: ${filename}`);
}

console.log(`\nFallback predictions written to ${OUT_DIR} for ${PAIRS.length} pairs.`);
