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
  return data.map((p) => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const d of data) {
      if (p.coin === d.coin) {
        continue;
      }

      totalWeight += d.weight;

      if (p.coin === "usdc") {
        weightedSum += logRate(1 / d.t1, 1 / d.t0) * d.weight;
      } else if (d.coin === "usdc") {
        weightedSum += logRate(p.t1, p.t0) * d.weight;
      } else {
        weightedSum += logRate(p.t1 / d.t1, p.t0 / d.t0) * d.weight;
      }
    }

    const score =
      totalWeight > 0 ? (weightedSum / totalWeight) * p.confidence : 0;
    const rate = Math.exp(score) - 1;

    return {
      current: p.t1,
      symbol: p.coin.toUpperCase(),
      rate: rate * 100,
      score: score * 100,
      last_volume: p.v1,
      stats: { ...p.stats, base_price: p.t1 / (1 + rate) },
    } as AssetRanking;
  });
}
