"""均线交叉 + Bollinger Band 信号模型。

输出: bullish / bearish / ranging + 置信度辅助指标。
"""

import numpy as np


class MACrossoverModel:
    def __init__(self, short_window=5, long_window=20, bb_window=20, bb_std=2):
        self.short = short_window
        self.long = long_window
        self.bb_window = bb_window
        self.bb_std = bb_std

    def generate_signal(self, df):
        """基于最新行生成方向信号。"""
        if len(df) < self.long + 1:
            raise ValueError(f"数据不足，需要至少 {self.long + 1} 行")

        latest = df.iloc[-1]
        prev = df.iloc[-2]

        ma5 = float(latest["ma5"])
        ma20 = float(latest["ma20"])
        ma60 = float(latest.get("ma60", ma20))
        prev_ma5 = float(prev["ma5"])
        prev_ma20 = float(prev["ma20"])

        close = float(latest["close"])
        bb_upper = float(latest["bb_upper"])
        bb_lower = float(latest["bb_lower"])

        # 交叉检测
        golden_cross = (prev_ma5 <= prev_ma20) and (ma5 > ma20)
        death_cross = (prev_ma5 >= prev_ma20) and (ma5 < ma20)

        # 均线排列
        if ma5 > ma20 > ma60:
            alignment = "bullish_aligned"
        elif ma5 < ma20 < ma60:
            alignment = "bearish_aligned"
        else:
            alignment = "mixed"

        # Bollinger 位置 (0=下轨, 0.5=中轨, 1=上轨)
        bb_range = bb_upper - bb_lower
        bb_position = (close - bb_lower) / bb_range if bb_range > 0 else 0.5

        # MACD
        macd = float(latest.get("macd", 0))
        macd_signal = float(latest.get("macd_signal", 0))
        macd_hist = float(latest.get("macd_hist", 0))
        macd_bullish = macd_hist > 0

        # RSI
        rsi = float(latest.get("rsi_14", 50))

        # 综合评分
        score = 0
        if golden_cross:
            score += 2
        if death_cross:
            score -= 2
        if alignment == "bullish_aligned":
            score += 1
        if alignment == "bearish_aligned":
            score -= 1
        if bb_position < 0.2:
            score += 1
        if bb_position > 0.8:
            score -= 1
        if macd_bullish:
            score += 0.5
        else:
            score -= 0.5

        if score >= 2:
            signal = "bullish"
        elif score <= -2:
            signal = "bearish"
        else:
            signal = "ranging"

        return {
            "signal": signal,
            "score": round(score, 2),
            "ma5": round(ma5, 4),
            "ma20": round(ma20, 4),
            "ma60": round(ma60, 4),
            "bb_upper": round(bb_upper, 4),
            "bb_lower": round(bb_lower, 4),
            "bb_position": round(bb_position, 3),
            "golden_cross": golden_cross,
            "death_cross": death_cross,
            "alignment": alignment,
            "macd_bullish": macd_bullish,
            "rsi_14": round(rsi, 1),
        }
