import { tf } from "../../stores/timeframe.svelte";
import { wl } from "../../stores/watchlist.svelte";
import { safeDiv, type ForexItem, type WeightedFxPoint } from "../market";

export interface ForexPoint {
  time: number;
  price: number;
}

const API = "https://api.frankfurter.dev/v1";
const DAYS = 24 * 60 * 60 * 1000;
const FIVE_YEARS_MS = 365 * 5 * DAYS;

const cache: Record<string, ForexPoint[]> = {};
const fetching = new Set<string>();

function toDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

export async function fetchForex(quote: string): Promise<ForexPoint[]> {
  if (fetching.has(quote)) {
    return new Promise((resolve, reject) => {
      let counter = 0;
      const interval = setInterval(() => {
        if (cache[quote]) {
          clearInterval(interval);
          resolve(cache[quote]);
        }
        if (counter >= 100) {
          clearInterval(interval);
          reject("cache timeout");
        }
        counter++;
      }, 100);
    });
  }

  if (cache[quote]) {
    return cache[quote];
  }

  for (const f of wl.fxs) {
    fetching.add(f.symbol);
  }

  try {
    const now = new Date();
    const start = new Date(now.getTime() - FIVE_YEARS_MS);
    const res = await fetch(
      `${API}/${toDateString(start)}..${toDateString(now)}` +
        `?base=USD` +
        `&symbols=${wl.fxs.map((f) => f.symbol.toUpperCase())}`,
    );
    const rates = (await res.json()).rates as Record<
      string,
      Record<string, number>
    >;

    for (const f of wl.fxs) {
      const points: ForexPoint[] = Object.entries(rates)
        .map(([date, values]) => {
          return {
            time: new Date(date).getTime(),
            price: Number(values[f.symbol.toUpperCase()]),
          };
        })
        .filter((p) => Number.isFinite(p.price))
        .sort((a, b) => a.time - b.time);
      cache[f.symbol] = points;
    }

    return cache[quote];
  } finally {
    for (const f of wl.fxs) {
      fetching.delete(f.symbol);
    }
  }
}

export function sliceForex(points: ForexPoint[], days: number) {
  const cutoff = Date.now() - days * DAYS;
  return points.filter((p) => p.time >= cutoff);
}

export async function calculateForex(
  quote: ForexItem,
): Promise<WeightedFxPoint | null> {
  try {
    const range = tf.activeFx.days;
    const raw = await fetchForex(quote.symbol);

    if (!raw.length) {
      return null;
    }

    const points = sliceForex(raw, range);

    if (!points.length) {
      return null;
    }

    const t0 = points[0].price;
    const t1 = points.at(-1)?.price ?? t0;

    let peak = -Infinity;
    let low = Infinity;
    let sum = 0;
    let max_dd = 0;

    const returns: number[] = [];
    let prev: number | null = null;
    let returns_sum = 0;

    for (const point of points) {
      const p = point.price;

      if (p > peak) peak = p;
      if (p < low) low = p;

      if (peak > 0) {
        const dd = (peak - p) / peak;
        if (dd > max_dd) max_dd = dd;
      }

      sum += p;

      if (prev !== null) {
        const ret = (p - prev) / prev;
        returns.push(ret);
        returns_sum += ret;
      }

      prev = p;
    }

    const count = points.length;

    const avg = safeDiv(sum, count);
    const avg_returns = safeDiv(returns_sum, returns.length);

    const volatility = Math.sqrt(
      safeDiv(
        returns.reduce((s, r) => {
          const d = r - avg_returns;
          return s + d * d;
        }, 0),
        returns.length,
      ),
    );

    const growth = safeDiv(t1 - t0, t0);
    const avg_growth = safeDiv(avg - t0, t0);
    const log_return = Math.log(t1 / t0);

    const momentum = safeDiv(growth - avg_growth, volatility);

    const sharpe = safeDiv(growth, volatility);

    const trend_quality = Math.sqrt(
      Math.max(momentum, 0) * Math.max(sharpe, 0),
    );

    return {
      fx: {
        id: quote.symbol,
        symbol: quote.symbol,
        visible: true,
      } satisfies ForexItem,
      price: {
        t0,
        t1,
        avg,
        peak,
        low,
      },
      performance: {
        growth,
        avg_growth,
        avg_returns,
        log_return,
        momentum,
        sharpe,
        trend_quality,
      },
      risk: {
        max_dd,
        volatility,
      },
    };
  } catch {
    return null;
  }
}

export async function fetchAllForex() {
  const res = await Promise.all(wl.fxs.map((f) => calculateForex(f)));
  return res.filter((p) => p !== null);
}
