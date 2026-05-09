import { safeDiv, type WeightedPoint, type CryptoItem } from "../market";

import { tf } from "./../../stores/timeframe.svelte";
import { wl } from "./../../stores/watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export async function fetchHyperliquidCoin(
  coin: CryptoItem,
  days: number,
  interval: string,
): Promise<WeightedPoint | null> {
  try {
    const now = Date.now();
    const symbolString = coin.symbol;

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin: symbolString.toUpperCase(),
          interval,
          startTime: now - days * DAY,
          endTime: now,
        },
      }),
    });

    const json = await res.json();

    if (!Array.isArray(json) || json.length === 0) return null;

    const t0 = Number(json[0]?.c);
    const t1 = Number(json.at(-1)?.c);
    const v1 = Number(json.at(-1)?.v);

    if (!t0 || !t1) return null;

    // --- Calculate Metrix
    const count = json.length;

    let peak = 0;
    let max_dd = 0;
    let high = -Infinity;
    let low = Infinity;
    let sum = 0;
    let close = t0;
    let volatility_sum = 0;
    let volume = 0;

    for (const candle of json) {
      const h = Number(candle.h || candle.c);
      const l = Number(candle.l || candle.c);
      const c = Number(candle.c);
      const v = Number(candle.v);

      // Volume Calculation
      volume += v * c;

      // Max Drawdown Logic
      if (h > peak) {
        peak = h;
      }
      if (peak > 0) {
        const drawdown = (peak - l) / peak;
        if (drawdown > max_dd) max_dd = drawdown;
      }

      // High, Low, Avg Logic
      if (h > high) {
        high = h;
      }
      if (l < low) {
        low = l;
      }
      sum += c;

      // Volatility Logic
      const range = h - l;
      const gap_up = Math.abs(h - close);
      const gap_down = Math.abs(l - close);
      const true_range = Math.max(range, gap_up, gap_down);
      const volt_percentage = true_range / close;
      volatility_sum += volt_percentage;

      close = c;
    }

    const avg_volume = safeDiv(volume, count);
    const intensity = safeDiv(v1 * t1, avg_volume);

    const avg = safeDiv(sum, count);
    const avg_growth = safeDiv(avg - t0, t0);
    const log_ratio = Math.log(t1 / t0);

    const growth = safeDiv(t1 - t0, t0);
    const volatility = safeDiv(volatility_sum, count);
    const sharpe = safeDiv(growth, volatility + 0.0001);

    return {
      coin,
      price: { t1, t0, avg, high, low },
      performance: { growth, avg_growth, log_ratio, sharpe },
      risk: { max_dd, volatility },
      volume: { v1, vol: volume, avg: avg_volume, intensity },
    };
  } catch {
    return null;
  }
}

export async function fetchAllCrypto() {
  const res = await Promise.all(
    wl.items.map((c) =>
      fetchHyperliquidCoin(c, tf.active.days, tf.active.interval),
    ),
  );

  return res.filter((p) => p !== null);
}
