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

type TimeRanged = {
  candle: number;
  timeframe: number;
  annual: number;
};

type PeakTroughRanged = {
  max: number;
  peak: number;
  trough: number;
  peak_time: number;
  trough_time: number;
};

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
    log_return: number;
    avg_log_return: number;
    simple_return: number;
    avg_return: TimeRanged;
    sharpe: TimeRanged;
    sortino: TimeRanged;
  };
  risk: {
    volatility: TimeRanged;
    down_volatility: TimeRanged;
    drawdown: PeakTroughRanged;
    runup: PeakTroughRanged;
  };
  volume: {
    v1: number;
    s12: number;
    vol: number;
    avg: number;
    median: number;
    intensity: number;
  };
}

export function portfolioIndex(points: WeightedCryptoPoint[]): number {
  let marketWeight = 0;
  let marketSum = 0;

  for (const p of points) {
    marketWeight += p.coin.weight;
    marketSum += p.performance.log_return * p.coin.weight;
  }

  return marketSum / marketWeight;
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
    log_return: 0,
    avg_log_return: 0,
    simple_return: 0,
    avg_return: {
      candle: 0,
      timeframe: 0,
      annual: 0,
    },
    sharpe: {
      candle: 0,
      timeframe: 0,
      annual: 0,
    },
    sortino: {
      candle: 0,
      timeframe: 0,
      annual: 0,
    },
  },
  risk: {
    volatility: {
      candle: 0,
      timeframe: 0,
      annual: 0,
    },
    down_volatility: {
      candle: 0,
      timeframe: 0,
      annual: 0,
    },
    drawdown: {
      max: 0,
      peak: 0,
      trough: 0,
      peak_time: 0,
      trough_time: 0,
    },
    runup: {
      max: 0,
      peak: 0,
      trough: 0,
      peak_time: 0,
      trough_time: 0,
    },
  },
  volume: { v1: 0, s12: 0, vol: 0, avg: 0, median: 0, intensity: 0 },
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
