import type { CryptoItem, WeightedPoint } from "./market";

import { wl } from "../stores/watchlist.svelte";

export interface ComputedPoint {
  p: WeightedPoint;
  c: {
    common: string;
    t1Diff: string;
    t0Diff: string;
    t1: number;
    t0: number;
    pair: string;
    growth: number;
  };
}

const usdCoin: CryptoItem = {
  id: "usdc",
  symbol: "usdc",
  weight: 1,
  confidence: 1,
  position: 0,
  visible: true,
};

const usdc: WeightedPoint = {
  coin: usdCoin,
  price: { t1: 1, t0: 1, avg: 1, high: 1, low: 1 },
  performance: { growth: 0, avg_growth: 0, log_ratio: 0, sharpe: 1 },
  risk: { max_dd: 0, volatility: 0 },
  volume: { v1: 0, vol: 0, avg: 0, intensity: 0 },
};

export function weightPoints(data: WeightedPoint[]) {
  return [usdc, ...data].flatMap((p): WeightedPoint[] => {
    const c = wl.items.find((i) => i.symbol === p.coin.symbol);

    if (c && !c.visible) {
      return [];
    }

    return [
      {
        ...p,
        coin: {
          ...p.coin,
          weight:
            wl.mode === "position_size"
              ? p.coin.position * p.price.t1
              : p.coin.weight,
        },
      },
    ];
  });
}

export function getFormattedMarkets(
  points: WeightedPoint[],
  base: string,
  inverted: boolean,
): ComputedPoint[] {
  const b = points.find((r) => r.coin.symbol === base);

  const mapped = points.map((p): ComputedPoint => {
    // Convert Logic
    let c;
    if (p.coin.symbol === base && base !== "usdc") {
      c = {
        t0: inverted ? p.price.t0 : 1 / p.price.t0,
        t1: inverted ? p.price.t1 : 1 / p.price.t1,
        pair: inverted
          ? `${p.coin.symbol.toUpperCase()}/USDC`
          : `USDC/${p.coin.symbol.toUpperCase()}`,
      };
    } else if (!b || base === "usdc") {
      c = {
        t0: inverted ? 1 / p.price.t0 : p.price.t0,
        t1: inverted ? 1 / p.price.t1 : p.price.t1,
        pair: inverted
          ? `${base.toUpperCase()}/${p.coin.symbol.toUpperCase()}`
          : `${p.coin.symbol.toUpperCase()}/${base.toUpperCase()}`,
      };
    } else {
      const t0 = p.price.t0 / b.price.t0;
      const t1 = p.price.t1 / b.price.t1;
      c = {
        t0: inverted ? 1 / t0 : t0,
        t1: inverted ? 1 / t1 : t1,
        pair: inverted
          ? `${base.toUpperCase()}/${p.coin.symbol.toUpperCase()}`
          : `${p.coin.symbol.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    // Formatting Logic
    const maxVal = Math.max(Math.abs(c.t1), Math.abs(c.t0));
    let decimals = maxVal >= 10 ? 2 : maxVal >= 1 ? 4 : 9;

    let t1Str = c.t1.toFixed(decimals);
    let t0Str = c.t0.toFixed(decimals);

    let trimCount = 0;
    while (
      trimCount < decimals &&
      t1Str[t1Str.length - 1 - trimCount] === "0" &&
      t0Str[t0Str.length - 1 - trimCount] === "0"
    ) {
      trimCount++;
    }

    if (trimCount > 0) {
      t1Str = t1Str.slice(0, -trimCount);
      t0Str = t0Str.slice(0, -trimCount);
    }

    if (t1Str.endsWith(".")) t1Str = t1Str.slice(0, -1);
    if (t0Str.endsWith(".")) t0Str = t0Str.slice(0, -1);

    let i = 0;
    while (i < t1Str.length && i < t0Str.length && t1Str[i] === t0Str[i]) i++;

    return {
      p: p,
      c: {
        ...c,
        common: t1Str.slice(0, i),
        t1Diff: t1Str.slice(i, decimals > 4 ? i + 3 : t0Str.length),
        t0Diff: t0Str.slice(i, decimals > 4 ? i + 3 : t1Str.length),
        growth: c.t1 / c.t0 - 1,
      },
    };
  });

  // Sort Logic
  mapped.sort((a, b) => {
    return inverted ? a.c.growth - b.c.growth : b.c.growth - a.c.growth;
  });

  return mapped;
}
