"""三模型信号融合引擎。

STL(30%) + MA Cross(30%) + ARIMA-GARCH(40%) → 最终信号 + 综合置信度。

ARIMA 在预测变化 < 5bp 时视为"ranging"，避免噪声方向。
"""


class SignalFusion:
    def __init__(self):
        self.weights = {"stl": 0.30, "ma": 0.30, "arima_garch": 0.40}
        self.direction_threshold = 0.20  # |score| > 此值判定为方向

    def fuse(self, stl_result, ma_result, arima_result, arima_latest_price):
        direction_score = 0.0
        details = []

        # ── STL 趋势方向 ──
        stl_dir = 1 if stl_result["trend_direction"] == "up" else -1
        direction_score += self.weights["stl"] * stl_dir
        details.append({
            "model": "STL",
            "direction": "bullish" if stl_dir > 0 else "bearish",
            "weight": self.weights["stl"],
            "reason": (
                f"长期趋势{'向上' if stl_dir > 0 else '向下'}，"
                f"日斜率 {stl_result['trend_slope_per_day']:.6f}，"
                f"年化 {stl_result['trend_slope_annualized']:.2f}"
            ),
        })

        # ── MA 交叉信号 ──
        ma_map = {"bullish": 1, "bearish": -1, "ranging": 0}
        ma_dir = ma_map[ma_result["signal"]]
        direction_score += self.weights["ma"] * ma_dir

        gold_death_note = ""
        if ma_result["golden_cross"]:
            gold_death_note = "，金叉"
        elif ma_result["death_cross"]:
            gold_death_note = "，死叉"

        details.append({
            "model": "MA_Cross",
            "direction": ma_result["signal"],
            "weight": self.weights["ma"],
            "golden_cross": ma_result["golden_cross"],
            "death_cross": ma_result["death_cross"],
            "alignment": ma_result["alignment"],
            "reason": (
                f"MA5({ma_result['ma5']:.2f}) vs MA20({ma_result['ma20']:.2f})，"
                f"{'多头排列' if ma_result['alignment'] == 'bullish_aligned' else '空头排列' if ma_result['alignment'] == 'bearish_aligned' else '交织'}"
                f"{gold_death_note}，Bollinger {ma_result['bb_position']:.0%}位，"
                f"RSI={ma_result['rsi_14']:.1f}"
            ),
        })

        # ── ARIMA 方向（含最小变动阈值） ──
        arima_next = arima_result[0]["forecast"]
        arima_pct = (arima_next - arima_latest_price) / arima_latest_price * 100
        bp_threshold = 0.005  # 5bp 以下视为 ranging

        if abs(arima_pct) < bp_threshold:
            arima_dir = 0
            arima_direction_label = "ranging"
            arima_note = "预测变动 < 5bp，接近随机游走"
        else:
            arima_dir = 1 if arima_next > arima_latest_price else -1
            arima_direction_label = "bullish" if arima_dir > 0 else "bearish"
            arima_note = (
                f"1日预测 {arima_next:.4f}（{arima_pct:+.3f}%），"
                f"7日趋势目标 {arima_result[6]['forecast']:.4f}"
            )

        direction_score += self.weights["arima_garch"] * arima_dir
        details.append({
            "model": "ARIMA+GARCH",
            "direction": arima_direction_label,
            "weight": self.weights["arima_garch"],
            "reason": arima_note,
        })

        # ── 最终方向判定 ──
        abs_score = abs(direction_score)
        if abs_score > self.direction_threshold:
            direction = "bullish" if direction_score > 0 else "bearish"
        else:
            direction = "ranging"

        # ── 模型一致性 ──
        non_ranging = [d for d in details if d["direction"] != "ranging"]
        if non_ranging:
            bull_votes = sum(1 for d in non_ranging if d["direction"] == "bullish")
            bear_votes = sum(1 for d in non_ranging if d["direction"] == "bearish")
            agreement = max(bull_votes, bear_votes) / len(non_ranging)
        else:
            agreement = 0.0

        # ── 置信度：|score| / max_possible，映射到 0.2-1.0 区间 ──
        raw_confidence = min(abs_score / 0.7, 1.0)
        confidence = round(0.2 + raw_confidence * 0.8, 3)

        # ── 目标价 (ARIMA 1d/3d/7d + 趋势修正) ──
        targets = {}
        for h_idx in [0, 2, 6]:
            if h_idx < len(arima_result):
                day = arima_result[h_idx]["horizon"]
                targets[f"target_{day}d"] = {
                    "rate": arima_result[h_idx]["forecast"],
                    "volatility": arima_result[h_idx]["volatility"],
                    "ci_90": arima_result[h_idx]["confidence_intervals"]["ci_90"],
                }

        return {
            "direction": direction,
            "confidence": confidence,
            "direction_score": round(direction_score, 3),
            "model_agreement": round(agreement, 2),
            "model_details": details,
            "targets": targets,
        }
