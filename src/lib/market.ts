export interface PriceStats {
  max_drawdown: number;
  high: number;
  low: number;
  avg: number;
  baseline?: number;
}

export interface PricePoint {
  base: string;
  coin: string;
  t0: number;
  t1: number;
  stats: PriceStats;
}

export interface AssetRanking {
  symbol: string;
  current: number;
  score: number;
  rate: number;
  stats: PriceStats;
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

export function buildRanking(data: PricePoint[]): AssetRanking[] {
  const allReturns = baseLogRates(data);
  const marketAvg = avg(allReturns);

  return [
    ...data.map((d): AssetRanking => {
      const score = logRate(d.t1, d.t0) - marketAvg;
      const rate = (Math.exp(score / 100) - 1) * 100; // The standard percentage relative rate
      return {
        current: d.t1,
        symbol: d.coin.toUpperCase(),
        rate,
        score, // The log-based relative strength
        stats: { ...d.stats, baseline: d.t1 / (1 + rate / 100) },
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
        baseline: 1,
      } as PriceStats,
    } as AssetRanking,
  ].sort((a: AssetRanking, b: AssetRanking) => b.score - a.score);
}
