export interface PricePoint {
  base: string;
  coin: string;
  t0: number;
  t1: number;
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

export function buildRanking(data: PricePoint[], coins: string[]) {
  return [
    ...coins.map((c) => ({
      symbol: c.toUpperCase(),
      score: avg(relativeRates(data, c)),
    })),
    {
      symbol: "USDT",
      score: avg(baseRates(data)),
    },
  ].sort((a, b) => b.score - a.score);
}
