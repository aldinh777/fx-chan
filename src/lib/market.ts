export interface PriceStats {
  max_drawdown: number;
  high: number;
  low: number;
  avg: number;
  volatility: number;
  intensity: number;
  volume: number;
  sharpe: number;
  base_price?: number;
}

export interface AssetRanking {
  symbol: string;
  current: number;
  score: number;
  rate: number;
  stats: PriceStats;
}

export interface PricePoint {
  base: string;
  coin: string;
  t0: number;
  t1: number;
  stats: PriceStats;
}

export interface WeightedPoint extends PricePoint {
  weight: number;
  confidence: number;
}

export const rate = (t1: number, t0: number) => (t1 / t0) * 100 - 100;

export const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

export function relativeRates(data: PricePoint[], target: string): number[] {
  const t = data.find((d) => d.coin === target);
  if (!t) return [];

  return data.map((d) => {
    const t1 = t.t1 / d.t1;
    const t0 = t.t0 / d.t0;
    return rate(t1, t0);
  });
}

export function baseRates(data: PricePoint[]) {
  return data.map((d) => rate(d.t1, d.t0));
}

export const logRate = (t1: number, t0: number) => Math.log(t1 / t0) * 100;

export function baseLogRates(data: PricePoint[]) {
  return data.map((d) => logRate(d.t1, d.t0));
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
