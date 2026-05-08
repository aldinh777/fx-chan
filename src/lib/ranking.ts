import type { WeightedPoint, AssetRanking, PriceStats } from "./market";

import { logRate } from "./market";

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
        score, // The confidence-adjusted log-based relative strength
        stats: { ...d.stats, base_price: d.t1 / (1 + rate / 100) },
      };
    }),

    // USDC / Baseline handling
    {
      symbol: "USDC",
      current: 1,
      // USDC inherently has no volatility against itself, so its "raw" score is 0 - marketAvg.
      // Since it's the base asset, we usually consider it 100% confidence.
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
        sharpe: 1,
      } as PriceStats,
    } as AssetRanking,
  ].sort((a: AssetRanking, b: AssetRanking) => b.score - a.score);
}
