import { type WeightedCryptoPoint, type CryptoItem } from "../market";
import { _avg, _returns, type ReturnSeries, _variance } from "../quant";

import { tf } from "./../../stores/timeframe.svelte";
import { wl } from "./../../stores/watchlist.svelte";

const API = "https://api.hyperliquid.xyz/info";
const HOURS = 60 * 60 * 1000;

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

export interface CoinData {
  candles: CandleData[];
  returns: ReturnSeries;
}

const candleCache: Record<string, CoinData> = {};
const awaitFetching: Set<string> = new Set();

export async function fetchCoin(symbol: string): Promise<CoinData> {
  const tfsymbol = `${symbol}:${tf.crypto.label}:${tf.crypto.interval}`;

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
          interval: tf.crypto.interval,
          startTime: now - tf.crypto.hours * HOURS,
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
    const prices = candles.map((c) => c.c);
    const returns = _returns(prices);

    const coin: CoinData = { candles, returns };
    candleCache[tfsymbol] = coin;
    return coin;
  } finally {
    awaitFetching.delete(tfsymbol);
  }
}

interface Candleman {
  symbol: string;
  candles: CandleData[];
}

export async function calculatePriceAction(
  coin: string,
  base: string,
): Promise<CandleData[]> {
  if (coin === base) {
    return [];
  }

  const [coinMan, baseMan] = await Promise.all(
    [coin, base].map(async (s): Promise<Candleman | null> => {
      const w = wl.cryptos.find((c) => c.symbol === s);
      return w
        ? ({
            symbol: w.symbol,
            candles: (await fetchCoin(w.symbol)).candles,
          } satisfies Candleman)
        : null;
    }),
  );

  const baseCandles = baseMan ? baseMan.candles : coinMan?.candles;
  if (!baseCandles) {
    return [];
  }

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

  const priceCandles: CandleData[] = [];

  for (let i = 0; i < baseCandles.length; i++) {
    // price calculation logic
    const o = compare(i, "o");
    const h = compare(i, "h");
    const c = compare(i, "c");
    const l = compare(i, "l");
    const tp = (o + h + l + c) / 4;

    priceCandles.push({
      ...baseCandles[i],
      s: coinMan?.symbol ?? "usdc",
      n: coinMan ? coinMan.candles[i].n : 0,
      v: coinMan ? coinMan.candles[i].v * tp : 0,
      o,
      h,
      l,
      c,
    });
  }

  return priceCandles;
}

export async function calculateCoin(
  coin: CryptoItem,
): Promise<WeightedCryptoPoint | null> {
  try {
    const coinData = await fetchCoin(coin.symbol);
    const candles = coinData.candles;

    if (!Array.isArray(candles) || candles.length === 0) {
      return null;
    }

    const t0 = Number(candles.at(0)?.c);
    const t1 = Number(candles.at(-1)?.c);
    const v1 = Number(candles.at(-1)?.v);

    if (!t0 || !t1) {
      return null;
    }

    // --- Calculate Metrix
    const count = candles.length;

    let peak = 0;
    let max_dd = 0;
    let dd_high = 0;
    let dd_low = 0;
    let peak_time = 0;
    let dd_thigh = 0;
    let dd_tlow = 0;

    let trough = Infinity;
    let max_rally = 0;
    let rally_low = 0;
    let rally_high = 0;
    let trough_time = 0;
    let rally_thigh = 0;
    let rally_tlow = 0;

    let high = -Infinity;
    let low = Infinity;

    let price_sum = 0;
    let usd_volume_sum = 0;

    for (const candle of candles) {
      const h = Number(candle.h || candle.c);
      const l = Number(candle.l || candle.c);
      const c = Number(candle.c);
      const v = Number(candle.v);
      const t = candle.t;

      // Volume Calculation
      usd_volume_sum += v * c;

      // Max Drawdown Logic
      if (h > peak) {
        peak = h;
        peak_time = t;
      }
      const drawdown = (peak - l) / peak;
      if (drawdown > max_dd) {
        max_dd = drawdown;

        dd_high = peak;
        dd_low = l;

        dd_thigh = peak_time;
        dd_tlow = t;
      }

      // Max Rally Logic
      if (l < trough) {
        trough = l;
        trough_time = t;
      }
      const rally = (h - trough) / trough;
      if (rally > max_rally) {
        max_rally = rally;

        rally_low = trough;
        rally_high = h;

        rally_tlow = trough_time;
        rally_thigh = t;
      }

      // High, Low, Avg Logic
      if (h > high) {
        high = h;
      }
      if (l < low) {
        low = l;
      }
      price_sum += c;
    }

    // Price
    const avg_price = price_sum / count;

    // Risk
    const volatility = Math.sqrt(_variance(coinData.returns.log));
    const volatility_timeframed = volatility * Math.sqrt(count);
    const volatility_annualized = volatility * Math.sqrt(tf.crypto.annualized);

    const down_volatility = Math.sqrt(
      _avg(coinData.returns.log.map((r) => Math.min(0, r) ** 2)),
    );
    const down_volatility_timeframed = down_volatility * Math.sqrt(count);
    const down_volatility_annualized =
      down_volatility * Math.sqrt(tf.crypto.annualized);

    // Performance
    const log_return = Math.log(t1 / t0);
    const avg_log_return = _avg(coinData.returns.log);

    const simple_return = Math.exp(log_return) - 1;
    const avg_return = Math.exp(avg_log_return) - 1;
    const avg_return_timeframed = avg_return * count;
    const avg_return_annualized = avg_return * tf.crypto.annualized;

    const sharpe = avg_log_return / volatility;
    const sharpe_timeframed = sharpe * Math.sqrt(count);
    const sharpe_annualized = sharpe * Math.sqrt(tf.crypto.annualized);

    const sortino = avg_log_return / down_volatility;
    const sortino_timeframed = sortino * Math.sqrt(count);
    const sortino_annualized = sortino * Math.sqrt(tf.crypto.annualized);

    const avg_volume = usd_volume_sum / count;
    const intensity = (v1 * t1) / avg_volume;

    return {
      coin,
      price: { t1, t0, avg: avg_price, high, low },
      performance: {
        simple_return,
        log_return,
        avg_log_return,
        avg_return: {
          candle: avg_return,
          timeframe: avg_return_timeframed,
          annual: avg_return_annualized,
        },
        sharpe: {
          candle: sharpe,
          timeframe: sharpe_timeframed,
          annual: sharpe_annualized,
        },
        sortino: {
          candle: sortino,
          timeframe: sortino_timeframed,
          annual: sortino_annualized,
        },
      },
      risk: {
        volatility: {
          candle: volatility,
          timeframe: volatility_timeframed,
          annual: volatility_annualized,
        },
        down_volatility: {
          candle: down_volatility,
          timeframe: down_volatility_timeframed,
          annual: down_volatility_annualized,
        },
        drawdown: {
          max: max_dd,
          peak: dd_high,
          trough: dd_low,
          peak_time: dd_thigh,
          trough_time: dd_tlow,
        },
        runup: {
          max: max_rally,
          peak: rally_high,
          trough: rally_low,
          peak_time: rally_thigh,
          trough_time: rally_tlow,
        },
      },
      volume: { v1, vol: usd_volume_sum, avg: avg_volume, intensity },
    };
  } catch {
    return null;
  }
}

export async function fetchAllCrypto() {
  const res = await Promise.all(wl.cryptos.map((c) => calculateCoin(c)));
  return res.filter((p) => p !== null);
}
