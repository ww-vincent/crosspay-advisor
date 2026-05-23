"""ARIMA + GARCH 联合模型，带 STL 趋势修正。

ARIMA: 短期均值预测（1天最准，随horizon收敛到均值）。
GARCH: 波动率预测 → 置信区间。
trend_drift: 来自 STL 的长期趋势斜率，修正中长周期预测防止 flatline。
"""

import numpy as np
from arch import arch_model
from statsmodels.tsa.arima.model import ARIMA


class ARIMAGARCHModel:
    def __init__(self, arima_order=(2, 1, 2)):
        self.arima_order = arima_order

    @staticmethod
    def _safe_fit_arima(series, order):
        for try_order in [order, (1, 1, 1), (1, 0, 0), (0, 1, 0)]:
            try:
                model = ARIMA(series, order=try_order)
                return model.fit()
            except Exception:
                continue
        raise RuntimeError("ARIMA 所有阶数拟合失败")

    def forecast_with_confidence(self, series, horizon=7, trend_drift=0.0):
        """联合预测：ARIMA + 趋势修正 + GARCH 波动率。

        Args:
            series: 汇率时间序列
            horizon: 预测步数
            trend_drift: 来自 STL 的日趋势斜率，0=不修正

        Returns:
            (predictions_list, latest_price)
        """
        series_clean = series.dropna().copy()
        latest_price = float(series_clean.iloc[-1])

        # ── ARIMA ──
        arima_fit = self._safe_fit_arima(series_clean, self.arima_order)
        arima_raw = list(arima_fit.forecast(steps=horizon))

        # ── 趋势修正：ARIMA 短期权重高，长期逐渐混入 STL 趋势 ──
        arima_forecast_values = []
        for h in range(horizon):
            arima_weight = max(0.2, 1.0 - h / horizon)  # 1d=1.0, 7d=0.2
            trend_weight = 1.0 - arima_weight
            trend_pred = latest_price + trend_drift * (h + 1)
            blended = arima_raw[h] * arima_weight + trend_pred * trend_weight
            arima_forecast_values.append(blended)

        # ── GARCH ──
        returns = np.log(series_clean / series_clean.shift(1)).dropna() * 100

        try:
            garch_fit = arch_model(returns, vol="Garch", p=1, q=1, dist="normal").fit(disp="off")
            garch_forecast = garch_fit.forecast(horizon=horizon)
            vol_forecast = np.sqrt(garch_forecast.variance.values[-1, :])
        except Exception:
            vol_forecast = np.full(horizon, returns.std())

        # ── 置信区间 ──
        z_scores = {0.68: 0.994, 0.90: 1.645, 0.95: 1.960}

        results = []
        for h in range(horizon):
            mean_pred = float(arima_forecast_values[h])
            vol = float(vol_forecast[h]) / 100.0

            intervals = {}
            for conf, z in z_scores.items():
                half = z * vol * np.sqrt(h + 1) * latest_price
                intervals[f"ci_{int(conf * 100)}"] = {
                    "lower": round(mean_pred - half, 6),
                    "upper": round(mean_pred + half, 6),
                }

            results.append({
                "horizon": h + 1,
                "forecast": round(mean_pred, 6),
                "volatility": round(vol, 6),
                "confidence_intervals": intervals,
            })

        return results, latest_price
