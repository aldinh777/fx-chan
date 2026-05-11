import { safeDiv, type WeightedPoint, type CryptoItem } from "../market";

import { tf } from "./../../stores/timeframe.svelte";
import { wl } from "./../../stores/watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const DAY = 24 * 60 * 60 * 1000;

export interface CandleData<T = number> {
  // symbol & interval
  s: string;
  i: string;

  // open high low close
  o: T;
  h: T;
  l: T;
  c: T;

  // opening (t) & closing (T) time
  t: number;
  T: number;

  // volume & times traded
  v: T;
  n: number;
}

const candleCache: Record<string, CandleData[]> = {};
const awaitFetching: Set<string> = new Set();

export async function fetchCoin(symbol: string): Promise<CandleData[]> {
  const tfsymbol = `${symbol}:${tf.active.label}:${tf.active.interval}`;

  if (awaitFetching.has(tfsymbol)) {
    return new Promise((resolve, reject) => {
      let counter = 0;
      const interval = setInterval(() => {
        if (candleCache[tfsymbol]) {
          clearInterval(interval);
          resolve(candleCache[tfsymbol]);
        }
        if (counter >= 100) {
          clearInterval(interval);
          reject("cache timeout");
        }
        counter++;
      }, 100);
    });
  }

  if (candleCache[tfsymbol]) {
    return candleCache[tfsymbol];
  }

  awaitFetching.add(tfsymbol);

  try {
    const now = Date.now();
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin: symbol.toUpperCase(),
          interval: tf.active.interval,
          startTime: now - tf.active.days * DAY,
          endTime: now,
        },
      }),
    });

    const candles: CandleData[] = (await res.json()).map(
      (c: CandleData<string>): CandleData => ({
        ...c,
        o: parseFloat(c.o),
        h: parseFloat(c.h),
        l: parseFloat(c.l),
        c: parseFloat(c.c),
        v: parseFloat(c.v),
      }),
    );
    candleCache[tfsymbol] = candles;

    return candles;
  } finally {
    awaitFetching.delete(tfsymbol);
  }
}

interface Candleman {
  symbol: string;
  candles: CandleData[];
}

interface AverageReturnPoint {
  t: number;
  r: number;
}

interface PriceActionResult {
  prices: CandleData[];
  market_avg: AverageReturnPoint[];
}

export async function calculatePriceAction(
  coin: string,
  base: string,
): Promise<PriceActionResult> {
  const coins = await Promise.all(
    wl.items.map(
      async (c): Promise<Candleman> => ({
        symbol: c.symbol,
        candles: await fetchCoin(c.symbol),
      }),
    ),
  );

  const baseMan: Candleman | undefined = coins.find((c) => c.symbol === base);
  const coinMan: Candleman | undefined = coins.find((c) => c.symbol === coin);

  const compare = (i: number, param: keyof CandleData) => {
    let basePrice = 1;
    let coinPrice = 1;

    if (baseMan) {
      basePrice = parseFloat(baseMan.candles[i][param] as string);
    }
    if (coinMan) {
      coinPrice = parseFloat(coinMan.candles[i][param] as string);
    }

    return coinPrice / basePrice;
  };

  if (coins.length === 0) {
    return { prices: [], market_avg: [] };
  }

  const minLength = Math.min(...coins.map((c) => c.candles.length));
  const marketAverages: AverageReturnPoint[] = [];
  const priceCandles: CandleData[] = [];

  for (let i = 0; i < minLength; i++) {
    const baseCandle = coins[0].candles[i];

    // price calculation logic
    const o = compare(i, "o");
    const h = compare(i, "h");
    const l = compare(i, "l");
    const c = compare(i, "c");
    const tp = (o + h + l + c) / 4;

    priceCandles.push({
      ...baseCandle,
      v: coinMan ? coinMan.candles[i].v * tp : 0,
      o,
      h,
      l,
      c,
    });

    // market averaging logic
    if (i === 0) {
      marketAverages.push({ t: baseCandle.t, r: 1 });
      continue;
    }
    let logSum = 0;
    for (const coin of coins) {
      const t0 = coin.candles[0].c;
      const t1 = coin.candles[i].c;
      logSum += Math.log(t1 / t0);
    }
    const marketScore = logSum / (coins.length + 1);
    const priceScore =
      Math.log(priceCandles[i].c / priceCandles[0].c) - marketScore;
    marketAverages.push({
      t: baseCandle.t,
      r: Math.exp(priceScore),
    });
  }

  return {
    prices: priceCandles,
    market_avg: marketAverages,
  };
}

export async function calculateCoin(
  coin: CryptoItem,
): Promise<WeightedPoint | null> {
  try {
    const candles = await fetchCoin(coin.symbol);

    if (!Array.isArray(candles) || candles.length === 0) return null;

    const t0 = Number(candles.at(0)?.c);
    const t1 = Number(candles.at(-1)?.c);
    const v1 = Number(candles.at(-1)?.v);

    if (!t0 || !t1) return null;

    // --- Calculate Metrix
    const count = candles.length;

    let peak = 0;
    let max_dd = 0;
    let high = -Infinity;
    let low = Infinity;
    let sum = 0;
    let volume = 0;

    const returns = [];
    let returns_sum = 0;
    let c0: number | null = null;

    for (const candle of candles) {
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

      // Returns Logic
      if (c0 !== null) {
        returns.push((returns_sum += (c - c0) / c0));
      }
      c0 = c;
    }

    const avg_returns = safeDiv(returns_sum, returns.length);
    const volatility = Math.sqrt(
      safeDiv(
        returns.reduce((sum, r) => {
          const d = r - avg_returns;
          return sum + d * d;
        }, 0),
        returns.length,
      ),
    );

    const avg_volume = safeDiv(volume, count);
    const intensity = safeDiv(v1 * t1, avg_volume);

    const avg = safeDiv(sum, count);
    const avg_growth = safeDiv(avg - t0, t0);
    const log_ratio = Math.log(t1 / t0);

    const growth = safeDiv(t1 - t0, t0);
    const momentum = safeDiv(growth - avg_growth, volatility);
    const sharpe = safeDiv(growth, volatility);

    return {
      coin,
      price: { t1, t0, avg, high, low },
      performance: {
        growth,
        avg_growth,
        avg_returns,
        momentum,
        log_ratio,
        sharpe,
      },
      risk: { max_dd, volatility },
      volume: { v1, vol: volume, avg: avg_volume, intensity },
    };
  } catch {
    return null;
  }
}

export async function fetchAllCrypto() {
  const res = await Promise.all(wl.items.map((c) => calculateCoin(c)));
  return res.filter((p) => p !== null);
}
