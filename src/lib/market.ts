export interface CryptoItem {
  id: string;
  symbol: string;
  visible: boolean;
  weight: number;
  confidence: number;
  position: number;
}

export interface WeightedPoint {
  coin: CryptoItem;
  price: {
    t1: number;
    t0: number;
    avg: number;
    high: number;
    low: number;
    base?: number;
  };
  performance: {
    growth: number;
    avg_growth: number;
    avg_returns: number;
    momentum: number;
    log_ratio: number;
    sharpe: number;
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

export interface AssetRanking {
  point: WeightedPoint;
  symbol: string;
  current: number;
  base: number;
  score: number;
  rate: number;
}

export const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function buildRanking(points: WeightedPoint[]): AssetRanking[] {
  let marketWeight = 0;
  let marketSum = 0;

  for (const p of points) {
    marketWeight += p.coin.weight;
    marketSum += p.performance.log_ratio * p.coin.weight;
  }

  const marketAverage = safeDiv(marketSum, marketWeight);

  return points.map((p): AssetRanking => {
    const score = (p.performance.log_ratio - marketAverage) * p.coin.confidence;
    const rate = Math.exp(score) - 1;

    return {
      point: p,
      symbol: p.coin.symbol.toUpperCase(),
      current: p.price.t1,
      base: p.price.t1 / (1 + rate),
      rate: rate * 100,
      score: score * 100,
    };
  });
}
