import type { PricePoint } from "../market";
import type { CryptoItem } from "../watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export async function fetchHyperliquidCoin(
  coin: CryptoItem,
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
          interval: "1d",
          startTime: now - 30 * DAY,
          endTime: now,
        },
      }),
    });

    const json = await res.json();

    if (!Array.isArray(json) || json.length === 0) return null;

    const t0 = Number(json[0]?.o);
    const t1 = Number(json.at(-1)?.c);

    if (!t0 || !t1) return null;

    // --- Calculate Drawdown, High, Low, and Avg ---
    let peak = 0;
    let max_drawdown = 0;
    let high = -Infinity;
    let low = Infinity;
    let sum = 0;
    let count = 0;

    for (const candle of json) {
      const h = Number(candle.h || candle.c);
      const l = Number(candle.l || candle.c);
      const c = Number(candle.c);

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
    }

    const avg = count > 0 ? sum / count : 0;

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
      },
    };
  } catch {
    return null;
  }
}

export async function fetchAll(
  coins: CryptoItem[],
  fetcher: (c: CryptoItem) => Promise<PricePoint | null>,
) {
  const res = await Promise.all(coins.map(fetcher));

  return res.filter(
    (x): x is PricePoint =>
      x !== null &&
      typeof x.coin === "string" &&
      typeof x.base === "string" &&
      !Number.isNaN(x.t0) &&
      !Number.isNaN(x.t1),
  );
}
