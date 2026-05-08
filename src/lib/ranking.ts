import type { PriceStats, PricePoint } from "./market";

import { logRate } from "./market";

export interface AssetRanking {
  symbol: string;
  current: number;
  score: number;
  rate: number;
  last_volume: number;
  stats: PriceStats;
}

export interface WeightedPoint extends PricePoint {
  weight: number;
  confidence: number;
  position: number;
}

export function buildRanking(data: WeightedPoint[]): AssetRanking[] {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const d of data) {
    const assetLogReturn = logRate(d.t1, d.t0);
    weightedSum += assetLogReturn * d.weight;
    totalWeight += d.weight;
  }

  const marketAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return [
    ...data.map((d): AssetRanking => {
      const rawScore = logRate(d.t1, d.t0) - marketAvg;
      const score = rawScore * d.confidence;
      const rate = (Math.exp(score / 100) - 1) * 100;

      return {
        current: d.t1,
        symbol: d.coin.toUpperCase(),
        rate,
        score,
        last_volume: d.v1,
        stats: { ...d.stats, base_price: d.t1 / (1 + rate / 100) },
      };
    }),
    {
      symbol: "USDC",
      current: 1,
      score: 0 - marketAvg,
      rate: (Math.exp((0 - marketAvg) / 100) - 1) * 100,
      stats: {
        max_drawdown: 0,
        high: 1,
        low: 1,
        avg: 1,
        base_price: 1,
        volatility: 0,
        intensity: 0,
        volume: 0,
        absolute_growth: 0,
        sharpe: 1,
      } as PriceStats,
    } as AssetRanking,
  ];
}
