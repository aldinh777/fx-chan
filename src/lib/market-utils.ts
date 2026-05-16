import type {
  CryptoItem,
  WeightedCryptoPoint,
  WeightedFxPoint,
} from "./market";

import { wl } from "../stores/watchlist.svelte";

export interface ComputedCryptoPoint {
  p: WeightedCryptoPoint;
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

export interface ComputedFxPoint {
  p: WeightedFxPoint;
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
  position: 0,
  visible: true,
};

const usdc: WeightedCryptoPoint = {
  coin: usdCoin,
  price: { t1: 1, t0: 1, avg: 1, high: 1, low: 1 },
  performance: {
    growth: 0,
    avg_growth: 0,
    avg_returns: 0,
    growth_rate: 0,
    momentum: 0,
    sharpe: 0,
  },
  risk: {
    max_dd: 0,
    max_rally: 0,
    volatility: 0,
    dd_high: 0,
    dd_low: 0,
    rally_high: 0,
    rally_low: 0,
  },
  volume: { v1: 0, vol: 0, avg: 0, intensity: 0 },
};

export function weightCryptoPoints(data: WeightedCryptoPoint[]) {
  return [usdc, ...data].flatMap((p): WeightedCryptoPoint[] => {
    const c = wl.cryptos.find((i) => i.symbol === p.coin.symbol);

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

type FormattedCore = {
  common: string;
  t1Diff: string;
  t0Diff: string;
};

function formatCore(t0: number, t1: number): FormattedCore {
  const maxVal = Math.max(Math.abs(t1), Math.abs(t0));
  const decimals = maxVal >= 1000 ? 2 : maxVal >= 1 ? 4 : 9;

  function normalize(n: number) {
    return n.toFixed(decimals).replace(/\.?0+$/, "");
  }

  const t1Str = normalize(t1);
  const t0Str = normalize(t0);

  const [t1Int] = t1Str.split(".");
  const [t0Int] = t0Str.split(".");

  let common = "";

  if (t1Int.length === t0Int.length) {
    const minLen = Math.min(t1Str.length, t0Str.length);

    let i = 0;

    while (i < minLen && t1Str[i] === t0Str[i]) {
      i++;
      if (t1Str[i - 1] === "." && t1Int !== t0Int) break;
    }

    common = t1Str.slice(0, i);
  }

  let t1Diff = t1Str.slice(common.length);
  let t0Diff = t0Str.slice(common.length);

  if (common.includes(".")) {
    t1Diff = t1Diff.slice(0, 3);
    t0Diff = t0Diff.slice(0, 3);
  }

  return {
    common,
    t1Diff,
    t0Diff,
  };
}

export function getFormattedCryptoMarkets(
  points: WeightedCryptoPoint[],
  base: string,
): ComputedCryptoPoint[] {
  const b = points.find((r) => r.coin.symbol === base);

  const mapped = points.map((p): ComputedCryptoPoint => {
    let c;

    if (p.coin.symbol === base && base !== "usdc") {
      c = {
        t0: 1 / p.price.t0,
        t1: 1 / p.price.t1,
        pair: `USDC/${p.coin.symbol.toUpperCase()}`,
      };
    } else if (!b || base === "usdc") {
      c = {
        t0: p.price.t0,
        t1: p.price.t1,
        pair: `${p.coin.symbol.toUpperCase()}/${base.toUpperCase()}`,
      };
    } else {
      const t0 = p.price.t0 / b.price.t0;
      const t1 = p.price.t1 / b.price.t1;

      c = {
        t0,
        t1,
        pair: `${p.coin.symbol.toUpperCase()}/${base.toUpperCase()}`,
      };
    }

    const fmt = formatCore(c.t0, c.t1);

    return {
      p,
      c: {
        ...c,
        ...fmt,
        growth: c.t1 / c.t0 - 1,
      },
    };
  });

  mapped.sort((a, b) => b.c.growth - a.c.growth);
  return mapped;
}

export function getFormattedFxMarkets(
  points: WeightedFxPoint[],
): ComputedFxPoint[] {
  const mapped = points.map((p): ComputedFxPoint => {
    const c = {
      t0: p.price.t0,
      t1: p.price.t1,
      pair: `USD/${p.fx.symbol.toUpperCase()}`,
    };

    const fmt = formatCore(c.t0, c.t1);

    return {
      p,
      c: {
        ...c,
        ...fmt,
        growth: c.t1 / c.t0 - 1,
      },
    };
  });

  mapped.sort((a, b) => b.c.growth - a.c.growth);
  return mapped;
}
