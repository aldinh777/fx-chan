import type { PricePoint } from "../market";
import type { CryptoItem } from "../watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export async function fetchHyperliquidCoin(
  coin: CryptoItem,
  days: number,
  interval: string,
): Promise<PricePoint | null> {
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
    let peak = 0;
    let max_drawdown = 0;
    let high = -Infinity;
    let low = Infinity;
    let sum = 0;
    let count = 0;
    let prevClose = t0;
    let totalVolatility = 0;
    let volume = 0;

    for (const candle of json) {
      const h = Number(candle.h || candle.c);
      const l = Number(candle.l || candle.c);
      const c = Number(candle.c);
      const v = Number(candle.v);

      // Volume Calculation
      volume += v * c;

      // Max Drawdown Logic
      if (h > peak) peak = h;
      if (peak > 0) {
        const drawdown = (peak - l) / peak;
        if (drawdown > max_drawdown) max_drawdown = drawdown;
      }

      // High, Low, Avg Logic
      if (h > high) high = h;
      if (l < low) low = l;
      sum += c;
      count++;

      // Volatility Logic
      const range = h - l;
      const gapUp = Math.abs(h - prevClose);
      const gapDown = Math.abs(l - prevClose);
      const trueRange = Math.max(range, gapUp, gapDown);
      const voltPercent = trueRange / c;
      totalVolatility += voltPercent;
      prevClose = c;
    }

    const avg = count > 0 ? sum / count : 0;
    const volatility = totalVolatility / count;

    const avgVolume = volume / count;
    const intensity = (v1 * t1) / avgVolume;

    const absoluteGrowth = (t1 - t0) / t0;
    const sharpe = absoluteGrowth / (volatility + 0.0001);

    return {
      base: "usdc",
      coin: symbolString.toLowerCase(),
      t0,
      t1,
      stats: {
        max_drawdown,
        high,
        low,
        avg,
        volatility,
        intensity,
        volume: v1,
        sharpe,
      },
    };
  } catch {
    return null;
  }
}

export async function fetchAllCrypto(
  coins: CryptoItem[],
  days: number,
  interval: string,
) {
  const res = await Promise.all(
    coins.map((c) => fetchHyperliquidCoin(c, days, interval)),
  );

  return res.filter(
    (x): x is PricePoint =>
      x !== null &&
      typeof x.coin === "string" &&
      typeof x.base === "string" &&
      !Number.isNaN(x.t0) &&
      !Number.isNaN(x.t1),
  );
}
