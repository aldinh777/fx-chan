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
    log_ratio: number;
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
    log_ratio: number;
    momentum: number;
    sharpe: number;
    trend_quality: number;
  };
  volume: {
    v1: number;
    vol: number;
    avg: number;
    intensity: number;
  };
  risk: {
    max_dd: number;
    volatility: number;
  };
}

export const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function portfolioIndex(points: WeightedCryptoPoint[]): number {
  let marketWeight = 0;
  let marketSum = 0;

  for (const p of points) {
    marketWeight += p.coin.weight;
    marketSum += p.performance.log_ratio * p.coin.weight;
  }

  return safeDiv(marketSum, marketWeight);
}
