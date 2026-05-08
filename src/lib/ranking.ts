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
  const usdc = {
    base: "usdc",
    coin: "usdc",
    t0: 1,
    t1: 1,
    v1: 0,
    weight: 1,
    confidence: 1,
    position: 0,
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
  } as WeightedPoint;

  const withUsdc = [usdc, ...data];

  return withUsdc.map((p) => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const d of withUsdc) {
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

    const score = (weightedSum / totalWeight) * p.confidence;
    const rate = 100 * (Math.exp(score) - 1);
    const displayScore = 100 * score;

    return {
      current: p.t1,
      symbol: p.coin.toUpperCase(),
      rate,
      score: displayScore,
      last_volume: p.v1,
      stats: { ...p.stats, base_price: p.t1 / (1 + rate / 100) },
    } as AssetRanking;
  });
}
