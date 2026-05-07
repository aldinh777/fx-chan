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

export const logRate = (t1: number, t0: number) => Math.log(t1 / t0) * 100;

export function baseLogRates(data: PricePoint[]) {
  return data.map((d) => logRate(d.t1, d.t0));
}

export function buildRanking(data: PricePoint[]) {
  const allReturns = baseLogRates(data);
  const marketAvg = avg(allReturns);

  return [
    ...data.map((d) => {
      const score = logRate(d.t1, d.t0) - marketAvg;
      return {
        symbol: d.coin.toUpperCase(),
        score, // The log-based relative strength
        rate: (Math.exp(score / 100) - 1) * 100, // The standard percentage relative rate
      };
    }),
    {
      symbol: "USDC",
      score: 0 - marketAvg,
      rate: (Math.exp((0 - marketAvg) / 100) - 1) * 100,
    },
  ].sort((a, b) => b.score - a.score);
}
