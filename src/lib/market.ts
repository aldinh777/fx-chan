import { wl } from "../stores/watchlist.svelte";

export interface ForexItem {
  id: string;
  symbol: string;
  visible: boolean;
}

export interface WeightedFxPoint {
  fx: ForexItem;
  price: {
    t1: number;
    t0: number;
    avg: number;
    peak: number;
    low: number;
  };
  performance: {
    growth: number;
    avg_growth: number;
    avg_returns: number;
    log_return: number;
    momentum: number;
    sharpe: number;
    trend_quality: number;
  };
  risk: {
    max_dd: number;
    volatility: number;
  };
}

export interface CryptoItem {
  id: string;
  symbol: string;
  visible: boolean;
  weight: number;
  position: number;
}

export interface WeightedCryptoPoint {
  coin: CryptoItem;
  price: {
    t1: number;
    t0: number;
    avg: number;
    high: number;
    low: number;
  };
  performance: {
    growth: number;
    avg_growth: number;
    avg_returns: number;
    log_return: number;
    momentum: number;
    sharpe: number;
  };
  volume: {
    v1: number;
    vol: number;
    avg: number;
    intensity: number;
  };
  risk: {
    volatility: number;
    drawdown: {
      max: number;
      peak: number;
      trough: number;
      peak_time: number;
      trough_time: number;
    };
    rally: {
      max: number;
      peak: number;
      trough: number;
      peak_time: number;
      trough_time: number;
    };
  };
}

export const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function portfolioIndex(points: WeightedCryptoPoint[]): number {
  let marketWeight = 0;
  let marketSum = 0;

  for (const p of points) {
    marketWeight += p.coin.weight;
    marketSum += p.performance.log_return * p.coin.weight;
  }

  return safeDiv(marketSum, marketWeight);
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
    log_return: 0,
    momentum: 0,
    sharpe: 0,
  },
  risk: {
    volatility: 0,
    drawdown: {
      max: 0,
      peak: 0,
      trough: 0,
      peak_time: 0,
      trough_time: 0,
    },
    rally: {
      max: 0,
      peak: 0,
      trough: 0,
      peak_time: 0,
      trough_time: 0,
    },
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
