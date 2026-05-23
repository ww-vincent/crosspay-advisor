"""生成每日预测 JSON 报告。

Pipeline: 拉取数据 → STL → MA → ARIMA+GARCH → 融合 → JSON输出
"""

import json
import sys
import os
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.fetch import ForexDataPipeline, PAIR_TICKERS
from models.stl_model import SeasonalDecompositionModel
from models.ma_crossover import MACrossoverModel
from models.arima_garch import ARIMAGARCHModel
from models.fusion import SignalFusion


def generate_risk_warnings(fused, df):
    """基于信号和指标生成风险提示。"""
    warnings = []
    latest = df.iloc[-1]

    rsi = float(latest.get("rsi_14", 50))
    vol_20 = float(latest.get("vol_20", 0))
    vol_60_avg = df["vol_20"].rolling(60).mean().iloc[-1] if len(df) >= 60 else vol_20

    if rsi > 70:
        warnings.append({
            "level": "warning",
            "message": f"RSI={rsi:.1f} 处于超买区域，短期回调风险较高",
        })
    elif rsi < 30:
        warnings.append({
            "level": "warning",
            "message": f"RSI={rsi:.1f} 处于超卖区域，可能出现技术反弹",
        })

    if vol_20 > vol_60_avg * 1.5:
        warnings.append({
            "level": "alert",
            "message": f"当前波动率({vol_20*100:.1f}%)显著高于60日均值({vol_60_avg*100:.1f}%)，汇率波动风险加大",
        })

    if fused["confidence"] < 0.5:
        warnings.append({
            "level": "info",
            "message": "多模型方向不一致，市场分歧较大，建议观望",
        })

    agreement = fused.get("model_agreement", 0)
    if agreement == 1.0:
        warnings.append({
            "level": "info",
            "message": f"三模型方向一致（全部看{fused['direction']}），信号可信度较高",
        })

    # 方向与长期趋势冲突
    stl_detail = next((d for d in fused["model_details"] if d["model"] == "STL"), None)
    if stl_detail and fused["direction"] == "ranging":
        pass
    elif stl_detail and fused["direction"] != stl_detail["direction"]:
        warnings.append({
            "level": "info",
            "message": f"短期信号({fused['direction']})与长期趋势({stl_detail['direction']})背离，关注反转风险",
        })

    return warnings


def generate_narrative(report):
    """基于预测数据生成简短自然语言分析。"""
    cur = report["current"]
    sig = report["signal"]
    ind = report["indicators"]
    fc = report["forecast"]["predictions"]

    pair = report["meta"]["pair"]
    rate = cur["rate"]
    change = cur["daily_change_pct"]
    rsi = cur["rsi_14"]
    direction = sig["direction"]
    conf = sig["confidence"]
    target_7d = fc[2]["rate"]
    change_7d_pct = (target_7d - rate) / rate * 100
    ci_low = fc[2]["ci_90_lower"]
    ci_high = fc[2]["ci_90_upper"]

    # ── 方向用词 ──
    dir_label = {"bullish": "看涨", "bearish": "看跌", "ranging": "震荡"}[direction]
    conf_label = "高" if conf >= 0.7 else "中等" if conf >= 0.5 else "偏低"

    # ── 日涨跌描述 ──
    if abs(change) < 0.05:
        change_desc = "基本持平"
    elif change > 0:
        change_desc = f"上涨{change:.2f}%"
    else:
        change_desc = f"下跌{abs(change):.2f}%"

    # ── RSI描述 ──
    if rsi > 70:
        rsi_desc = f"RSI={rsi:.0f} 超买"
    elif rsi < 30:
        rsi_desc = f"RSI={rsi:.0f} 超卖"
    elif rsi > 50:
        rsi_desc = f"RSI={rsi:.0f} 偏强"
    else:
        rsi_desc = f"RSI={rsi:.0f} 偏弱"

    # ── 均线描述 ──
    ma5, ma20, ma60 = ind["ma"]["ma5"], ind["ma"]["ma20"], ind["ma"]["ma60"]
    if ma5 > ma20 > ma60:
        ma_desc = "多头排列"
    elif ma5 < ma20 < ma60:
        ma_desc = "空头排列"
    else:
        ma_desc = "交织"

    # ── 模型共识 ──
    drivers = [d for d in sig["model_details"] if d["direction"] != "ranging"]
    if not drivers:
        driver_text = "各模型信号分歧，方向不明"
    else:
        driver_names = [d["model"] for d in drivers]
        driver_text = f"{'、'.join(driver_names)}一致{dir_label}"

    # ── 拼接 ──
    if direction == "ranging":
        outlook = (
            f"{pair} 当前报 {rate:.4f}，日{change_desc}，{rsi_desc}，均线{ma_desc}。"
            f"{driver_text}，置信度{conf_label}。"
            f"7日目标区间 [{ci_low:.4f}, {ci_high:.4f}]，"
            f"90%置信水平下预计波动 {abs(change_7d_pct):.2f}%。"
            f"建议观望，等待方向明确。"
        )
    else:
        outlook = (
            f"{pair} 当前报 {rate:.4f}，日{change_desc}，{rsi_desc}，均线{ma_desc}。"
            f"{driver_text}，置信度{conf_label}。"
            f"7日目标 {target_7d:.4f}（{change_7d_pct:+.2f}%），"
            f"90%置信区间 [{ci_low:.4f}, {ci_high:.4f}]。"
        )
        # 加一句操作建议
        if direction == "bearish" and rsi < 30:
            outlook += "但RSI超卖，注意短线反弹风险。"
        elif direction == "bullish" and rsi > 70:
            outlook += "但RSI超买，注意短线回调风险。"

    return outlook


def generate_alerts(report, df, fused):
    """生成系统自动预警：波动率异常、趋势突破、超买超卖。

    返回列表，前端可直接渲染。用户手动设置的目标价位预警
    在前端本地比对，不在此处理。
    """
    alerts = []
    cur = report["current"]
    sig = report["signal"]
    ind = report["indicators"]
    pair = report["meta"]["pair"]

    rate = cur["rate"]
    daily_change = cur["daily_change_pct"]
    rsi = cur["rsi_14"]
    vol = cur["vol_annualized_pct"]
    direction = sig["direction"]
    conf = sig["confidence"]
    bb_pos = (rate - ind["bollinger"]["lower"]) / (
        ind["bollinger"]["upper"] - ind["bollinger"]["lower"]
    )

    # ── 波动率预警 ──
    if abs(daily_change) >= 2.0:
        alerts.append({
            "type": "volatility",
            "level": "alert",
            "pair": pair,
            "title": f"剧烈波动：24h {'涨' if daily_change > 0 else '跌'}幅 {abs(daily_change):.2f}%",
            "message": f"{pair} 过去24小时波动{abs(daily_change):.2f}%，远超正常水平，建议谨慎操作。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })
    elif abs(daily_change) >= 1.0:
        alerts.append({
            "type": "volatility",
            "level": "warning",
            "pair": pair,
            "title": f"波动加剧：24h {'涨' if daily_change > 0 else '跌'}幅 {abs(daily_change):.2f}%",
            "message": f"{pair} 波动率({vol:.1f}%)高于正常水平，关注后续走势。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })

    # ── 布林带突破预警 ──
    if bb_pos < 0.10:
        alerts.append({
            "type": "breakout",
            "level": "warning",
            "pair": pair,
            "title": f"触及布林下轨（{ind['bollinger']['lower']:.4f}）",
            "message": f"价格接近布林带下轨，短期有超卖反弹可能。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })
    elif bb_pos > 0.90:
        alerts.append({
            "type": "breakout",
            "level": "warning",
            "pair": pair,
            "title": f"触及布林上轨（{ind['bollinger']['upper']:.4f}）",
            "message": f"价格接近布林带上轨，短期有超买回调可能。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })

    # ── 均线金叉/死叉 ──
    ma_detail = next(
        (d for d in sig["model_details"] if d["model"] == "MA_Cross"), None
    )
    if ma_detail:
        if ma_detail.get("golden_cross"):
            alerts.append({
                "type": "signal",
                "level": "info",
                "pair": pair,
                "title": "MA5 上穿 MA20 金叉",
                "message": "短期均线上穿中期均线，关注趋势转多信号。",
                "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            })
        elif ma_detail.get("death_cross"):
            alerts.append({
                "type": "signal",
                "level": "info",
                "pair": pair,
                "title": "MA5 下穿 MA20 死叉",
                "message": "短期均线下穿中期均线，关注趋势转空信号。",
                "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            })

    # ── 超买超卖 ──
    if rsi > 70:
        alerts.append({
            "type": "rsi",
            "level": "warning",
            "pair": pair,
            "title": f"RSI 超买（{rsi:.0f}）",
            "message": "短期回调概率较大，不建议追高换汇。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })
    elif rsi < 30:
        alerts.append({
            "type": "rsi",
            "level": "warning",
            "pair": pair,
            "title": f"RSI 超卖（{rsi:.0f}）",
            "message": f"RSI={rsi:.0f} 处于超卖区域，短期反弹概率较大，可考虑逢低换汇。",
            "triggered_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        })

    return alerts


def generate_suggestions(report, fused, df):
    """生成智能操作建议，基于信号方向+置信度+RSI+波动率组合判断。"""
    cur = report["current"]
    sig = report["signal"]
    fc = report["forecast"]["predictions"]
    pair = report["meta"]["pair"]

    rate = cur["rate"]
    rsi = cur["rsi_14"]
    vol = cur["vol_annualized_pct"]
    direction = sig["direction"]
    conf = sig["confidence"]
    change = cur["daily_change_pct"]
    target_7d = fc[2]["rate"]
    change_7d_pct = (target_7d - rate) / rate * 100

    suggestions = []

    # ── 主建议：基于方向+置信度 ──
    if direction == "bearish" and conf >= 0.5:
        if rsi < 30:
            suggestions.append({
                "priority": 1,
                "icon": "⏳",
                "title": "即将见底，准备换汇",
                "detail": (
                    f"{pair} 短期看跌，但RSI超卖({rsi:.0f})。"
                    f"7日目标{target_7d:.4f}（{change_7d_pct:+.2f}%）。"
                    f"建议等待RSI回升至30以上再操作，或分批换汇锁定成本。"
                ),
            })
        else:
            suggestions.append({
                "priority": 1,
                "icon": "📉",
                "title": "人民币走强，建议3天内换汇",
                "detail": (
                    f"{pair} 短期看跌(置信度{conf:.0%})，人民币相对走强。"
                    f"7日目标{target_7d:.4f}（{change_7d_pct:+.2f}%）。"
                    f"建议在3天内完成换汇，锁定当前汇率。"
                ),
            })

    elif direction == "bullish" and conf >= 0.5:
        if rsi > 70:
            suggestions.append({
                "priority": 1,
                "icon": "⏸️",
                "title": "涨势过热，暂缓换汇",
                "detail": (
                    f"{pair} 短期看涨但RSI超买({rsi:.0f})。"
                    f"7日目标{target_7d:.4f}（{change_7d_pct:+.2f}%）。"
                    f"建议等待回调再换汇，或设置汇率预警等回落到目标价。"
                ),
            })
        else:
            suggestions.append({
                "priority": 1,
                "icon": "🛑",
                "title": "人民币走弱，暂缓换汇",
                "detail": (
                    f"{pair} 短期看涨(置信度{conf:.0%})，人民币相对走弱。"
                    f"7日目标{target_7d:.4f}（{change_7d_pct:+.2f}%）。"
                    f"建议暂缓大额换汇，等待趋势转向。如有紧急需求可小额分批。"
                ),
            })

    elif direction == "ranging":
        suggestions.append({
            "priority": 1,
            "icon": "↔️",
            "title": "震荡行情，按需换汇",
            "detail": (
                f"{pair} 短期震荡(置信度{conf:.0%})，无明显方向。"
                f"波动率{vol:.1f}%，日内波幅有限。"
                f"可按实际需求随时换汇，无需择时。"
            ),
        })

    # ── 辅助建议 ──
    if abs(change) >= 1.5:
        suggestions.append({
            "priority": 2,
            "icon": "⚠️",
            "title": "大幅波动中，谨慎操作",
            "detail": f"过去24小时波动{abs(change):.2f}%，远超日常水平。波动率高的时段换汇成本不可控，建议等市场稳定。",
        })

    # ── 分批策略建议 ──
    if conf >= 0.5 and direction != "ranging":
        target_3d = fc[1]["rate"]
        target_1d = fc[0]["rate"]
        suggestions.append({
            "priority": 3,
            "icon": "📊",
            "title": "分批换汇策略",
            "detail": (
                f"建议分3批操作：今天换1/3（{rate:.4f}），3天后换1/3（预估{target_3d:.4f}），"
                f"7天后换剩余1/3（预估{target_7d:.4f}）。平滑汇率波动风险。"
            ),
        })

    return suggestions


def build_report(pair="GBP/CNY", horizon=7):
    """生成完整的单币种预测报告。"""
    # ── 1. 拉取数据 ──
    pipeline = ForexDataPipeline(pair=pair)
    df = pipeline.fetch_all()
    close = df["close"].dropna()

    current_rate = float(close.iloc[-1])
    prev_rate = float(close.iloc[-2])
    daily_change = (current_rate - prev_rate) / prev_rate * 100

    # ── 2. 运行三模型 ──
    stl = SeasonalDecompositionModel()
    stl_result = stl.forecast_trend(close, horizon=horizon)

    ma = MACrossoverModel()
    ma_result = ma.generate_signal(df)

    trend_drift = stl_result.get("trend_slope_per_day", 0.0)

    arima = ARIMAGARCHModel()
    arima_predictions, arima_latest = arima.forecast_with_confidence(
        close, horizon=horizon, trend_drift=trend_drift
    )

    # ── 3. 融合 ──
    fusion = SignalFusion()
    fused = fusion.fuse(stl_result, ma_result, arima_predictions, arima_latest)

    # ── 4. 风险提示 ──
    warnings = generate_risk_warnings(fused, df)

    # ── 5. 构建报告 ──
    latest = df.iloc[-1]
    report_tmp = {
        "meta": {
            "pair": pair,
            "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00"),
            "data_range": f"{df.index[0].strftime('%Y-%m-%d')} → {df.index[-1].strftime('%Y-%m-%d')}",
            "data_points": len(df),
        },
        "current": {
            "rate": round(current_rate, 4),
            "daily_change_pct": round(daily_change, 4),
            "rsi_14": round(float(latest.get("rsi_14", 50)), 1),
            "vol_annualized_pct": round(float(latest.get("vol_20", 0)) * 100, 2),
            "macd_hist": round(float(latest.get("macd_hist", 0)), 6),
        },
        "signal": fused,
        "indicators": {
            "ma": {
                "ma5": round(float(latest["ma5"]), 4),
                "ma20": round(float(latest["ma20"]), 4),
                "ma60": round(float(latest["ma60"]), 4),
            },
            "bollinger": {
                "upper": round(float(latest["bb_upper"]), 4),
                "middle": round(float(latest["bb_mid"]), 4),
                "lower": round(float(latest["bb_lower"]), 4),
            },
            "atr_14": round(float(latest["atr_14"]), 4),
        },
        "forecast": {
            "horizon_days": [1, 3, 7],
            "predictions": [
                {
                    "day": p["horizon"],
                    "rate": p["forecast"],
                    "volatility": p["volatility"],
                    "ci_90_lower": p["confidence_intervals"]["ci_90"]["lower"],
                    "ci_90_upper": p["confidence_intervals"]["ci_90"]["upper"],
                }
                for p in arima_predictions
                if p["horizon"] in [1, 3, 7]
            ],
        },
        "risk_warnings": warnings,
    }

    report_tmp["analysis"] = generate_narrative(report_tmp)
    report_tmp["alerts"] = generate_alerts(report_tmp, df, fused)
    report_tmp["suggestions"] = generate_suggestions(report_tmp, fused, df)

    return report_tmp


def run(pair="GBP/CNY", output_dir=None):
    """运行预测并保存 JSON 到 output 目录。"""
    print(f"[{datetime.now():%H:%M:%S}] 开始拉取 {pair} 数据...")
    report = build_report(pair)

    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "predictions")

    os.makedirs(output_dir, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    pair_slug = pair.replace("/", "")
    filename = f"{date_str}_{pair_slug}_forecast.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"  → 报告已保存: {filepath}")
    print(f"  → {pair}: {report['current']['rate']:.4f}  |  "
          f"信号: {report['signal']['direction']}  |  "
          f"置信度: {report['signal']['confidence']:.0%}  |  "
          f"1日目标: {report['forecast']['predictions'][0]['rate']:.4f}")

    return report


# ── 命令行入口 ──
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="汇率预测报告生成器")
    parser.add_argument("--pair", default=None, help="货币对，如 GBP/CNY, EUR/CNY。不指定则跑全部")
    parser.add_argument("--output", default=None, help="输出目录路径")
    args = parser.parse_args()

    if args.pair:
        run(args.pair, args.output)
    else:
        for pair in PAIR_TICKERS:
            try:
                run(pair, args.output)
            except Exception as e:
                print(f"  ✗ {pair} 失败: {e}")
            print()
