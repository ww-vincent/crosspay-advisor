"""汇率数据管线 — Yahoo Finance + Frankfurter 双源拉取，自动降级。

Yahoo Finance: OHLCV 日线，免费无限量，主力数据源。
Frankfurter: ECB 参考汇率，无限量无Key，Yahoo 不可用时降级使用。
"""

import time
import yfinance as yf
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta


PAIR_TICKERS = {
    "GBP/CNY": "GBPCNY=X",
    "EUR/CNY": "EURCNY=X",
    "USD/CNY": "USDCNY=X",
    "JPY/CNY": "JPYCNY=X",
    "AUD/CNY": "AUDCNY=X",
    "GBP/USD": "GBPUSD=X",
    "EUR/USD": "EURUSD=X",
}

MACRO_TICKERS = {
    "DXY": "DX-Y.NYB",
    "VIX": "^VIX",
    "US10Y": "^TNX",
}


def _retry_yahoo_download(ticker, period, interval, max_retries=3):
    """yfinance 下载加重试 + 退避。"""
    for attempt in range(max_retries):
        try:
            df = yf.download(ticker, period=period, interval=interval, progress=False)
            if not df.empty:
                return df
        except Exception:
            pass
        if attempt < max_retries - 1:
            wait = (attempt + 1) * 3
            time.sleep(wait)
    return pd.DataFrame()


class ForexDataPipeline:
    def __init__(self, pair="GBP/CNY", lookback_days=730):
        if pair not in PAIR_TICKERS:
            raise ValueError(f"不支持交易对: {pair}。可选: {list(PAIR_TICKERS.keys())}")
        self.pair = pair
        self.ticker = PAIR_TICKERS[pair]
        self.lookback = lookback_days
        self.source = None

    # ── Frankfurter 主数据源（无频率限制） ─────────

    def fetch_frankfurter(self):
        """拉取 ECB 每日参考汇率，返回 DataFrame（仅 close 列）。"""
        base, quote = self.pair.split("/")
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=self.lookback)).strftime("%Y-%m-%d")

        url = f"https://api.frankfurter.app/{start_date}..{end_date}"
        try:
            resp = requests.get(url, params={"from": base, "to": quote}, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            rates = {k: v[quote] for k, v in data.get("rates", {}).items()}
            if not rates:
                raise RuntimeError("Frankfurter 返回空数据")
            idx = pd.to_datetime(list(rates.keys()))
            vals = [float(v) for v in rates.values()]
            df = pd.DataFrame({"close": vals}, index=idx).sort_index()
            self.source = "frankfurter"
            return df
        except Exception as e:
            raise RuntimeError(f"Frankfurter 拉取失败: {e}")

    # ── Yahoo 尝试拉取 ─────────────────────────────

    def fetch_yahoo(self):
        """尝试从 Yahoo 拉取 OHLCV，失败返回空 DataFrame。"""
        df = _retry_yahoo_download(self.ticker, f"{self.lookback}d", "1d", max_retries=3)
        if df.empty:
            return pd.DataFrame()

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0].strip().lower() for c in df.columns]
        else:
            df.columns = [c.strip().lower() for c in df.columns]

        df.index = pd.to_datetime(df.index)
        self.source = "yahoo"
        return df

    # ── 特征工程 ────────────────────────────────────

    def _feature_engineering(self, df):
        """构建技术指标 + 滚动统计特征。"""
        close = df["close"]

        df["log_return"] = np.log(close / close.shift(1))
        df["ma5"] = close.rolling(5).mean()
        df["ma20"] = close.rolling(20).mean()
        df["ma60"] = close.rolling(60).mean()
        df["vol_20"] = df["log_return"].rolling(20).std() * np.sqrt(252)

        # RSI(14)
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        df["rsi_14"] = 100.0 - (100.0 / (1.0 + rs))

        # Bollinger Bands
        df["bb_mid"] = df["ma20"]
        bb_std = close.rolling(20).std()
        df["bb_upper"] = df["bb_mid"] + 2 * bb_std
        df["bb_lower"] = df["bb_mid"] - 2 * bb_std

        # ATR(14) — 仅 Yahoo 数据有 high/low
        if "high" in df.columns and "low" in df.columns:
            prev_close = close.shift(1)
            tr = pd.concat([
                df["high"] - df["low"],
                (df["high"] - prev_close).abs(),
                (df["low"] - prev_close).abs(),
            ], axis=1).max(axis=1)
            df["atr_14"] = tr.rolling(14).mean()
        else:
            df["atr_14"] = close.rolling(14).std()

        # MACD
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        df["macd"] = ema12 - ema26
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]

        return df.dropna()

    # ── 宏观因子 ────────────────────────────────────

    def fetch_macro_factors(self):
        """拉取宏观驱动因子，失败静默返回空 DataFrame。"""
        factors = {}
        for name, ticker in MACRO_TICKERS.items():
            try:
                df = _retry_yahoo_download(ticker, f"{self.lookback}d", "1d", max_retries=1)
                if not df.empty:
                    if isinstance(df.columns, pd.MultiIndex):
                        col = df.columns[0][0].strip().lower()
                    else:
                        col = "close"
                    factors[name] = df[col].squeeze() if col in [c.strip().lower() for c in df.columns] else df.iloc[:, 0]
            except Exception:
                continue

        if not factors:
            return pd.DataFrame()

        macro_df = pd.DataFrame(factors)
        macro_df.index = pd.to_datetime(macro_df.index)
        return macro_df

    # ── 全量拉取（自动降级） ────────────────────────

    def fetch_all(self):
        """拉取数据：Yahoo优先 → Frankfurter降级。

        尝试 Yahoo 获取完整 OHLCV → 失败则用 Frankfurter（仅 close）。
        """
        df = self.fetch_yahoo()

        if df.empty:
            print(f"  ⚠ Yahoo 不可用，降级到 Frankfurter（仅日终汇率）")
            df = self.fetch_frankfurter()
        else:
            print(f"  ✓ 数据源: Yahoo Finance ({len(df)} 条)")

        df = self._feature_engineering(df)

        # 宏观因子（尽力而为）
        macro = self.fetch_macro_factors()
        if not macro.empty:
            df = df.join(macro, how="left").ffill()

        return df
