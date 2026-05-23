"""STL 季节分解模型 — 将汇率序列分解为 趋势 + 季节 + 残差。

目的：识别长期趋势方向、月度结汇周期、噪声水平。
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.seasonal import STL


class SeasonalDecompositionModel:
    def __init__(self, seasonal_period=21):
        """seasonal_period: 季节周期（交易日），21≈1个月，63≈1季度"""
        self.period = seasonal_period
        self._last_decomp = None

    def decompose(self, series):
        """STL 分解，返回 trend / seasonal / residual + 强度指标。"""
        series_clean = series.dropna().copy()

        stl = STL(series_clean, period=self.period, robust=True)
        result = stl.fit()

        trend = result.trend
        seasonal = result.seasonal
        residual = result.resid

        # 趋势强度: 1 - Var(residual)/Var(trend+residual)
        tr_var = np.nanvar(trend + residual)
        trend_strength = max(0, 1 - np.nanvar(residual) / tr_var) if tr_var > 0 else 0

        # 季节强度
        s_var = np.nanvar(seasonal + residual)
        seasonal_strength = max(0, 1 - np.nanvar(residual) / s_var) if s_var > 0 else 0

        self._last_decomp = {
            "trend": trend,
            "seasonal": seasonal,
            "residual": residual,
            "trend_strength": round(trend_strength, 4),
            "seasonal_strength": round(seasonal_strength, 4),
        }
        return self._last_decomp

    def forecast_trend(self, series, horizon=7):
        """趋势外推 — 用最近60天趋势线性/二次拟合，外推 horizon 步。"""
        decomp = self.decompose(series)
        trend = decomp["trend"].dropna()

        if len(trend) < 60:
            window = len(trend)
        else:
            window = 60

        x = np.arange(len(trend))
        y = trend.values

        recent_x = x[-window:]
        recent_y = y[-window:]

        linear_coef = np.polyfit(recent_x, recent_y, 1)
        quad_coef = np.polyfit(recent_x, recent_y, 2)

        linear_pred = np.polyval(linear_coef, recent_x)
        quad_pred = np.polyval(quad_coef, recent_x)

        # 选 R² 高的
        ss_res_linear = np.sum((recent_y - linear_pred) ** 2)
        ss_res_quad = np.sum((recent_y - quad_pred) ** 2)
        ss_tot = np.sum((recent_y - np.mean(recent_y)) ** 2) or 1e-10

        r2_linear = 1 - ss_res_linear / ss_tot
        r2_quad = 1 - ss_res_quad / ss_tot

        if r2_quad > r2_linear + 0.02:
            best_coef = quad_coef
        else:
            best_coef = linear_coef

        x_forecast = np.arange(len(trend), len(trend) + horizon)
        forecast_values = np.polyval(best_coef, x_forecast)

        slope = best_coef[0] if len(best_coef) == 2 else best_coef[1]
        direction = "up" if slope > 0 else "down"

        return {
            "trend_direction": direction,
            "trend_slope_per_day": round(float(slope), 8),
            "trend_slope_annualized": round(float(slope) * 252, 6),
            "forecast_values": [round(float(v), 6) for v in forecast_values],
            "decomposition": {
                "trend_strength": decomp["trend_strength"],
                "seasonal_strength": decomp["seasonal_strength"],
            },
        }
