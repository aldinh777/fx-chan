export interface PriceStats {
  max_drawdown: number;
  high: number;
  low: number;
  avg: number;
  volatility: number;
  intensity: number;
  volume: number;
  avg_volume: number;
  absolute_growth: number;
  sharpe: number;
  base_price?: number;
}

export interface PricePoint {
  base: string;
  coin: string;
  t0: number;
  t1: number;
  v1: number;
  stats: PriceStats;
}

export const rate = (t1: number, t0: number) => (t1 / t0) * 100 - 100;

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
